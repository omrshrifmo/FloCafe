import type { Express } from 'express';
import { app } from 'electron';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { getDatabase, initDatabase, now } from '../db';
import { eventBus } from '../events/EventBus';

export type PluginHookConfig = {
  onActivate?: string[];
  onDeactivate?: string[];
  events?: string[];
};

export type PluginUiRouteConfig = {
  path: string;
  page: string;
};

export type PluginApiRouteConfig = {
  method: string;
  path: string;
  handler: string;
};

export type PluginSettingsSchema = {
  type?: string;
  properties?: Record<string, { type?: string; default?: unknown; required?: boolean }>; 
};

export type PluginManifest = {
  id: string;
  name: string;
  version: string;
  minFloCafeVersion: string;
  description: string;
  author: string;
  license: string;
  main: string;
  hooks: PluginHookConfig;
  routes: {
    api: PluginApiRouteConfig[];
    ui: PluginUiRouteConfig[];
  };
  permissions: string[];
  settingsSchema?: PluginSettingsSchema;
};

export type PluginRecord = {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
  settings: Record<string, unknown>;
  settingsSchema?: PluginSettingsSchema;
  permissions: string[];
  description: string;
  author: string;
  license: string;
  main: string;
  hooks: PluginHookConfig;
  routes: {
    api: PluginApiRouteConfig[];
    ui: PluginUiRouteConfig[];
  };
  created_at: string;
  updated_at: string;
  migrations_version: string | null;
  directory: string;
};

export class PluginsService {
  private plugins = new Map<string, PluginRecord>();
  private loadedPlugins = new Map<string, { manifest: PluginManifest; module: any }>();
  private expressApp: Express | null = null;

  private static schemaError(error: string): Error {
    return new Error(error);
  }

  private getPluginsRoot(): string {
    const roots = [
      path.join(app.getPath('userData'), 'plugins'),
      path.join(process.cwd(), 'plugins'),
    ];
    return roots.find((candidate) => fs.existsSync(candidate)) || roots[0];
  }

  private getPluginSearchRoots(): string[] {
    const roots = [
      path.join(app.getPath('userData'), 'plugins'),
      path.join(process.cwd(), 'plugins'),
    ];
    return [...new Set(roots.filter((candidate) => Boolean(candidate)))];
  }

  private getPluginEntryPath(pluginId: string): string {
    const roots = this.getPluginSearchRoots();
    for (const root of roots) {
      const candidate = path.join(root, pluginId);
      if (fs.existsSync(candidate)) return candidate;
    }
    return path.join(roots[0] || path.join(app.getPath('userData'), 'plugins'), pluginId);
  }

  validatePluginManifest(manifest: unknown): PluginManifest {
    if (!manifest || typeof manifest !== 'object') {
      throw PluginsService.schemaError('Plugin manifest must be an object.');
    }

    const plugin = manifest as Record<string, any>;
    const required = ['id', 'name', 'version', 'minFloCafeVersion', 'description', 'author', 'license', 'main', 'hooks', 'routes', 'permissions', 'settingsSchema'];
    for (const field of required) {
      if (!(field in plugin)) {
        throw PluginsService.schemaError(`Plugin manifest is missing required field: ${field}`);
      }
    }

    if (typeof plugin.id !== 'string' || !/^[a-z0-9][a-z0-9-_.]*$/i.test(plugin.id)) {
      throw PluginsService.schemaError('Plugin id must be a valid slug.');
    }
    if (typeof plugin.name !== 'string' || !plugin.name.trim()) {
      throw PluginsService.schemaError('Plugin name must be a non-empty string.');
    }
    if (typeof plugin.version !== 'string' || !plugin.version.trim()) {
      throw PluginsService.schemaError('Plugin version must be a non-empty string.');
    }
    if (typeof plugin.minFloCafeVersion !== 'string' || !plugin.minFloCafeVersion.trim()) {
      throw PluginsService.schemaError('Plugin minFloCafeVersion must be a non-empty string.');
    }
    if (typeof plugin.main !== 'string' || !plugin.main.trim()) {
      throw PluginsService.schemaError('Plugin main must be a non-empty string.');
    }
    if (!Array.isArray(plugin.permissions) || !plugin.permissions.every((value: unknown) => typeof value === 'string')) {
      throw PluginsService.schemaError('Plugin permissions must be an array of strings.');
    }
    if (!plugin.hooks || typeof plugin.hooks !== 'object') {
      throw PluginsService.schemaError('Plugin hooks must be an object.');
    }
    if (!Array.isArray(plugin.hooks.onActivate) || !plugin.hooks.onActivate.every((value: unknown) => typeof value === 'string')) {
      throw PluginsService.schemaError('Plugin hooks.onActivate must be a string array.');
    }
    if (!Array.isArray(plugin.hooks.onDeactivate) || !plugin.hooks.onDeactivate.every((value: unknown) => typeof value === 'string')) {
      throw PluginsService.schemaError('Plugin hooks.onDeactivate must be a string array.');
    }
    if (!Array.isArray(plugin.hooks.events) || !plugin.hooks.events.every((value: unknown) => typeof value === 'string')) {
      throw PluginsService.schemaError('Plugin hooks.events must be a string array.');
    }
    if (!plugin.routes || typeof plugin.routes !== 'object') {
      throw PluginsService.schemaError('Plugin routes must be an object.');
    }
    if (!Array.isArray(plugin.routes.api)) {
      throw PluginsService.schemaError('Plugin routes.api must be an array.');
    }
    if (!Array.isArray(plugin.routes.ui)) {
      throw PluginsService.schemaError('Plugin routes.ui must be an array.');
    }

    for (const route of plugin.routes.api) {
      if (!route || typeof route !== 'object') {
        throw PluginsService.schemaError('Each API route must be an object.');
      }
      if (typeof route.method !== 'string' || !route.method.trim()) {
        throw PluginsService.schemaError('Each API route must include a method.');
      }
      if (typeof route.path !== 'string' || !route.path.startsWith('/')) {
        throw PluginsService.schemaError('Each API route must include a path that starts with "/".');
      }
      if (typeof route.handler !== 'string' || !route.handler.trim()) {
        throw PluginsService.schemaError('Each API route must include a handler path.');
      }
    }

    for (const route of plugin.routes.ui) {
      if (!route || typeof route !== 'object') {
        throw PluginsService.schemaError('Each UI route must be an object.');
      }
      if (typeof route.path !== 'string' || !route.path.startsWith('/')) {
        throw PluginsService.schemaError('Each UI route must include a path that starts with "/".');
      }
      if (typeof route.page !== 'string' || !route.page.trim()) {
        throw PluginsService.schemaError('Each UI route must include a page path.');
      }
    }

    if (!plugin.settingsSchema || typeof plugin.settingsSchema !== 'object') {
      throw PluginsService.schemaError('Plugin settingsSchema must be an object.');
    }
    const settingsSchema = plugin.settingsSchema as Record<string, any>;
    if (settingsSchema.type && settingsSchema.type !== 'object') {
      throw PluginsService.schemaError('Plugin settingsSchema.type must be "object" when defined.');
    }
    if (settingsSchema.properties && typeof settingsSchema.properties !== 'object') {
      throw PluginsService.schemaError('Plugin settingsSchema.properties must be an object.');
    }

    return {
      id: plugin.id,
      name: plugin.name,
      version: plugin.version,
      minFloCafeVersion: plugin.minFloCafeVersion,
      description: plugin.description,
      author: plugin.author,
      license: plugin.license,
      main: plugin.main,
      hooks: {
        onActivate: Array.isArray(plugin.hooks.onActivate) ? plugin.hooks.onActivate : [],
        onDeactivate: Array.isArray(plugin.hooks.onDeactivate) ? plugin.hooks.onDeactivate : [],
        events: Array.isArray(plugin.hooks.events) ? plugin.hooks.events : [],
      },
      routes: {
        api: Array.isArray(plugin.routes.api) ? plugin.routes.api : [],
        ui: Array.isArray(plugin.routes.ui) ? plugin.routes.ui : [],
      },
      permissions: Array.isArray(plugin.permissions) ? plugin.permissions : [],
      settingsSchema: settingsSchema,
    };
  }

  async initialize(): Promise<void> {
    let db;
    try {
      db = getDatabase();
    } catch {
      initDatabase(false, true);
      db = getDatabase();
    }
    db.exec(`
      CREATE TABLE IF NOT EXISTS plugins (
        id TEXT PRIMARY KEY,
        name TEXT,
        version TEXT,
        enabled INTEGER DEFAULT 0,
        settings TEXT,
        migrations_version TEXT,
        created_at TEXT,
        updated_at TEXT
      );

      CREATE TABLE IF NOT EXISTS plugin_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plugin_id TEXT,
        version TEXT,
        name TEXT,
        executed_at TEXT,
        FOREIGN KEY(plugin_id) REFERENCES plugins(id)
      );
    `);

    const pluginRoots = this.getPluginSearchRoots();
    for (const pluginRoot of pluginRoots) {
      fs.mkdirSync(pluginRoot, { recursive: true });
    }

    const directories = new Map<string, string>();
    for (const pluginRoot of pluginRoots) {
      for (const entry of fs.readdirSync(pluginRoot, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        directories.set(entry.name, path.join(pluginRoot, entry.name));
      }
    }

    for (const [pluginId, pluginDir] of Array.from(directories.entries()).sort(([left], [right]) => left.localeCompare(right))) {
      const manifestPath = path.join(pluginDir, 'plugin.json');
      if (!fs.existsSync(manifestPath)) continue;

      try {
        const rawManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        const manifest = this.validatePluginManifest(rawManifest);
        const existing = db.prepare('SELECT enabled, settings, version, name, created_at, updated_at, migrations_version FROM plugins WHERE id = ?').get(pluginId) as any;
        const enabled = existing ? Number(existing.enabled ?? 0) === 1 : false;
        const settings = existing && typeof existing.settings === 'string' ? JSON.parse(existing.settings) : {};
        const createdAt = existing?.created_at || now();
        const updatedAt = now();

        db.prepare(`
          INSERT INTO plugins (id, name, version, enabled, settings, migrations_version, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name=excluded.name,
            version=excluded.version,
            settings=COALESCE(plugins.settings, excluded.settings),
            migrations_version=COALESCE(plugins.migrations_version, excluded.migrations_version),
            updated_at=excluded.updated_at
        `).run(
          manifest.id,
          manifest.name,
          manifest.version,
          enabled ? 1 : 0,
          JSON.stringify(settings),
          existing?.migrations_version ?? null,
          createdAt,
          updatedAt,
        );

        this.plugins.set(manifest.id, {
          id: manifest.id,
          name: manifest.name,
          version: manifest.version,
          enabled,
          settings,
          settingsSchema: manifest.settingsSchema,
          permissions: manifest.permissions,
          description: manifest.description,
          author: manifest.author,
          license: manifest.license,
          main: manifest.main,
          hooks: manifest.hooks,
          routes: manifest.routes,
          created_at: createdAt,
          updated_at: updatedAt,
          migrations_version: existing?.migrations_version ?? null,
          directory: pluginDir,
        });
      } catch (error) {
        console.error(`[Plugins] Failed to load plugin manifest for ${pluginId}:`, error);
      }
    }
  }

  listPlugins(): PluginRecord[] {
    return Array.from(this.plugins.values()).map((plugin) => ({
      ...plugin,
      enabled: Boolean(plugin.enabled),
      settings: plugin.settings ?? {},
    }));
  }

  getPlugin(pluginId: string): PluginRecord | undefined {
    return this.plugins.get(pluginId);
  }

  listUiRoutes(): Array<{ id: string; path: string; page: string; pluginId: string }> {
    return Array.from(this.plugins.values())
      .filter((plugin) => plugin.enabled)
      .flatMap((plugin) => plugin.routes.ui.map((route) => ({
        id: plugin.id,
        pluginId: plugin.id,
        path: route.path,
        page: route.page,
      })));
  }

  async enablePlugin(pluginId: string): Promise<{ success: boolean; plugin?: PluginRecord; error?: string }> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return { success: false, error: 'Plugin not found' };
    }

    const db = getDatabase();
    db.prepare('UPDATE plugins SET enabled = 1, updated_at = ? WHERE id = ?').run(now(), pluginId);
    plugin.enabled = true;
    if (this.expressApp) {
      await this.loadEnabledPlugins(this.expressApp);
    }
    return { success: true, plugin: { ...plugin, enabled: true } };
  }

  async disablePlugin(pluginId: string): Promise<{ success: boolean; plugin?: PluginRecord; error?: string }> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return { success: false, error: 'Plugin not found' };
    }

    const existingModule = this.loadedPlugins.get(pluginId);
    if (existingModule?.manifest?.hooks?.onDeactivate?.length) {
      try {
        const runtime = this.createRuntimeContext(plugin, false);
        const runner = existingModule.module?.default ?? existingModule.module ?? null;
        if (typeof runner === 'function') {
          await runner({ ...runtime, type: 'deactivate' });
        } else if (runner && typeof runner.register === 'function') {
          await runner.register({ ...runtime, type: 'deactivate' });
        }
      } catch (error) {
        console.error(`[Plugins] Failed to deactivate ${pluginId}:`, error);
      }
    }

    const db = getDatabase();
    db.prepare('UPDATE plugins SET enabled = 0, updated_at = ? WHERE id = ?').run(now(), pluginId);
    plugin.enabled = false;
    this.loadedPlugins.delete(pluginId);
    if (this.expressApp) {
      await this.loadEnabledPlugins(this.expressApp);
    }
    for (const event of plugin.hooks.events ?? []) {
      const handlers = eventBus['handlers'];
      if (!handlers || !handlers.has(event)) continue;
      for (const handler of Array.from(handlers.get(event) ?? [])) {
        eventBus.off(event, handler);
      }
    }
    return { success: true, plugin: { ...plugin, enabled: false } };
  }

  updatePluginSettings(pluginId: string, settings: unknown): { success: boolean; settings?: Record<string, unknown>; error?: string } {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return { success: false, error: 'Plugin not found' };
    }

    if (settings !== undefined && (typeof settings !== 'object' || settings === null || Array.isArray(settings))) {
      return { success: false, error: 'Plugin settings must be an object.' };
    }

    const schema = plugin.settingsSchema ?? { type: 'object', properties: {} };
    const state = this.sanitizeSettingsValue(settings ?? {}, schema);
    const db = getDatabase();
    db.prepare('UPDATE plugins SET settings = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(state), now(), pluginId);
    plugin.settings = state;
    return { success: true, settings: state };
  }

  private sanitizeSettingsValue(value: unknown, schema: PluginSettingsSchema | undefined): Record<string, unknown> {
    const next: Record<string, unknown> = {};
    const given = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
    const properties = schema?.properties ?? {};

    for (const [key, config] of Object.entries(properties)) {
      const present = key in given;
      if (present) {
        const raw = given[key];
        const type = config?.type ?? 'string';
        if (type === 'boolean' && typeof raw === 'boolean') next[key] = raw;
        else if (type === 'number' && typeof raw === 'number' && Number.isFinite(raw)) next[key] = raw;
        else if (type === 'string' && typeof raw === 'string') next[key] = raw;
        else if (type === 'array' && Array.isArray(raw)) next[key] = raw;
        else if (type === 'object' && raw && typeof raw === 'object' && !Array.isArray(raw)) next[key] = raw;
        else if (config?.default !== undefined) next[key] = config.default;
      } else if (config?.default !== undefined) {
        next[key] = config.default;
      }
    }

    for (const [key, valueEntry] of Object.entries(given)) {
      if (!(key in properties)) {
        next[key] = valueEntry;
      }
    }
    return next;
  }

  private createRuntimeContext(plugin: PluginRecord, isActivation: boolean): any {
    return {
      app: this.expressApp,
      plugin,
      eventBus,
      logger: console,
      isActivation,
      registerApiRoute: (route: PluginApiRouteConfig) => {
        if (!this.expressApp) return;
        const method = route.method.toLowerCase();
        const filePath = path.join(plugin.directory, route.handler);
        const loaded = require(filePath);
        const handler = loaded.default ?? loaded.handler ?? loaded;
        if (typeof handler !== 'function') {
          throw new Error(`Plugin route handler for ${plugin.id} at ${route.path} must export a function.`);
        }
        // @ts-expect-error express app method is dynamic.
        this.expressApp[method](route.path, handler);
      },
      registerUiRoute: (route: PluginUiRouteConfig) => {
        const next = { id: plugin.id, path: route.path, page: route.page };
        const current = Array.from(this.plugins.values()).find((entry) => entry.id === plugin.id);
        if (!current) return;
        current.routes.ui = [...(current.routes.ui ?? []), next].filter((pair, index, list) => list.findIndex((item) => item.path === pair.path && item.page === pair.page) === index);
      },
      registerEventHandler: (event: string, handler: (payload?: any) => void | Promise<void>) => {
        eventBus.on(event, handler);
      },
    };
  }

  async loadEnabledPlugins(expressApp?: Express): Promise<void> {
    if (expressApp) {
      this.expressApp = expressApp;
    }

    for (const plugin of this.listPlugins()) {
      if (!plugin.enabled) continue;
      const pluginDir = this.getPluginEntryPath(plugin.id);
      const manifestPath = path.join(pluginDir, 'plugin.json');
      if (!fs.existsSync(manifestPath)) continue;

      try {
        const rawManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        const manifest = this.validatePluginManifest(rawManifest);

        const pendingMigrations = this.getPendingMigrations(plugin);
        for (const pending of pendingMigrations) {
          try {
            const db = getDatabase();
            db.exec(pending.sql);
            db.prepare(`INSERT INTO plugin_migrations (plugin_id, version, name, executed_at) VALUES (?, ?, ?, ?)`).run(
              plugin.id,
              pending.version,
              pending.name,
              now(),
            );
          } catch (error) {
            console.error(`[Plugins] Migration failed for ${plugin.id}: ${pending.name}`, error);
          }
        }

        const fullEntry = path.join(pluginDir, manifest.main || 'index.js');
        const requiredModule = require(fullEntry);
        const runtimeModule = requiredModule.default ?? requiredModule;
        const registrationTarget = runtimeModule?.register ?? runtimeModule;
        const runtime = this.createRuntimeContext(plugin, true);

        if (typeof registrationTarget === 'function') {
          await registrationTarget(runtime);
        } else if (registrationTarget && typeof registrationTarget.register === 'function') {
          await registrationTarget.register(runtime);
        }

        this.loadedPlugins.set(plugin.id, { manifest, module: runtimeModule });
        if (manifest.hooks?.onActivate?.length) {
          for (const script of manifest.hooks.onActivate) {
            const scriptPath = path.join(pluginDir, script);
            if (fs.existsSync(scriptPath)) {
              try {
                require(scriptPath);
              } catch (error) {
                console.error(`[Plugins] Activation hook failed for ${plugin.id}: ${script}`, error);
              }
            }
          }
        }
      } catch (error) {
        console.error(`[Plugins] Failed to load enabled plugin ${plugin.id}:`, error);
      }
    }
  }

  private getPendingMigrations(plugin: PluginRecord): Array<{ version: string; name: string; sql: string }> {
    const migrationDir = path.join(plugin.directory, 'migrations');
    if (!fs.existsSync(migrationDir)) return [];

    const db = getDatabase();
    const executed = new Set(
      (db.prepare('SELECT version FROM plugin_migrations WHERE plugin_id = ?').all(plugin.id) as Array<{ version: string }>).map((row) => row.version),
    );

    return fs.readdirSync(migrationDir)
      .filter((file) => file.endsWith('.sql'))
      .sort()
      .filter((file) => {
        const version = file.replace(/\.sql$/i, '');
        return !executed.has(version);
      })
      .map((file) => ({
        version: file.replace(/\.sql$/i, ''),
        name: file,
        sql: fs.readFileSync(path.join(migrationDir, file), 'utf8'),
      }));
  }
}

export const pluginsService = new PluginsService();
export default pluginsService;
