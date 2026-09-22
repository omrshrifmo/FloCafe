import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { strict as assert } from 'node:assert';

const Module = require('module');
const originalLoad = Module._load;
const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flo-plugin-service-'));

const mockApp = {
  isPackaged: true,
  getPath: (name: string) => {
    if (name === 'userData') return testDir;
    if (name === 'documents') return testDir;
    return testDir;
  },
  getName: () => 'FloCafe',
  getVersion: () => '0.0.0-test',
};

Module._load = function (request: string, parent: any, isMain: boolean) {
  if (request === 'electron') {
    return { app: mockApp, ipcMain: { handle: () => {} }, BrowserWindow: class {} };
  }
  return originalLoad.apply(this, arguments as any);
};

const { PluginsService } = require('../main/services/PluginsService');

(async () => {
  const pluginDir = path.join(testDir, 'plugins', 'eg-core-sample');
  fs.mkdirSync(pluginDir, { recursive: true });
  fs.mkdirSync(path.join(pluginDir, 'migrations'), { recursive: true });
  fs.writeFileSync(path.join(pluginDir, 'plugin.json'), JSON.stringify({
    id: 'eg-core-sample',
    name: 'Example Plugin',
    version: '0.1.0',
    minFloCafeVersion: '3.9.0',
    description: 'Example',
    author: 'Test',
    license: 'MIT',
    main: 'index.js',
    hooks: { onActivate: [], onDeactivate: [], events: ['order.created'] },
    routes: { api: [], ui: [{ path: '/eg/settings', page: 'ui/SettingsPage.jsx' }] },
    permissions: ['eg.example.view'],
    settingsSchema: { type: 'object', properties: { enableArabicOnly: { type: 'boolean', default: true } } },
  }, null, 2));
  fs.writeFileSync(path.join(pluginDir, 'index.js'), 'module.exports = { register: ({ plugin, registerUiRoute }) => { registerUiRoute({ id: plugin.id, path: "/eg/settings", page: "ui/SettingsPage.jsx" }); } };');
  fs.writeFileSync(path.join(pluginDir, 'migrations', '001_create_tables.sql'), 'CREATE TABLE IF NOT EXISTS plugin_feature_flags (id TEXT PRIMARY KEY);');

  const service = new PluginsService();
  await service.initialize();
  const plugins = service.listPlugins();
  assert.ok(plugins.some((plugin) => plugin.id === 'eg-core-sample'), 'Plugin discovered from filesystem');
  assert.equal(service.getPlugin('eg-core-sample')?.enabled, false, 'New plugin defaults to disabled');

  const validated = service.validatePluginManifest({
    id: 'eg-core-sample',
    name: 'Example Plugin',
    version: '0.1.0',
    minFloCafeVersion: '3.9.0',
    description: 'Example',
    author: 'Test',
    license: 'MIT',
    main: 'index.js',
    hooks: { onActivate: ['migrations/run.js'], onDeactivate: [], events: ['order.created'] },
    routes: { api: [], ui: [] },
    permissions: ['eg.example.view'],
    settingsSchema: { type: 'object', properties: { enableArabicOnly: { type: 'boolean', default: true } } },
  });
  assert.equal(validated.id, 'eg-core-sample', 'Schema validation accepts valid plugin manifest');

  console.log('[plugins-service-test] ok');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
