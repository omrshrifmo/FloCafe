import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { getDatabase } from '../db';
import log from 'electron-log';

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  minFloCafeVersion: string;
  description: string;
  author: string;
  license: string;
  main: string;
  hooks?: {
    onActivate?: string[];
    onDeactivate?: string[];
    events?: string[];
  };
  routes?: {
    api?: { method: string; path: string; handler: string }[];
    ui?: { path: string; page: string }[];
  };
  permissions?: string[];
  settingsSchema?: Record<string, any>;
}

class PluginsService {
  private pluginsDir: string;
  private memoryPlugins: Map<string, PluginManifest> = new Map();

  constructor() {
    this.pluginsDir = path.join(app.getPath('userData'), 'plugins');
  }

  public initialize() {
    log.info('[Plugins] Initializing plugins service...');
    if (!fs.existsSync(this.pluginsDir)) {
      fs.mkdirSync(this.pluginsDir, { recursive: true });
    }

    const db = getDatabase();

    // Scan for plugins
    const folders = fs.readdirSync(this.pluginsDir, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);

    for (const folder of folders) {
      const manifestPath = path.join(this.pluginsDir, folder, 'plugin.json');
      if (fs.existsSync(manifestPath)) {
        try {
          const raw = fs.readFileSync(manifestPath, 'utf-8');
          const manifest: PluginManifest = JSON.parse(raw);

          this.memoryPlugins.set(manifest.id, manifest);

          // Insert or update DB metadata
          const existing = db.prepare('SELECT id FROM plugins WHERE id = ?').get(manifest.id);
          if (!existing) {
            db.prepare(`
              INSERT INTO plugins (id, name, version, enabled, settings, migrations_version, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(manifest.id, manifest.name, manifest.version, 0, '{}', '0', new Date().toISOString(), new Date().toISOString());
          } else {
            db.prepare(`
              UPDATE plugins SET name = ?, version = ?, updated_at = ? WHERE id = ?
            `).run(manifest.name, manifest.version, new Date().toISOString(), manifest.id);
          }
        } catch (e) {
          log.error(`[Plugins] Failed to parse manifest for plugin folder ${folder}:`, e);
        }
      }
    }
  }

  public loadEnabledPlugins(appServer: any, eventBus: any) {
    const db = getDatabase();
    const enabledPlugins = db.prepare('SELECT * FROM plugins WHERE enabled = 1').all() as any[];

    for (const pRow of enabledPlugins) {
      const manifest = this.memoryPlugins.get(pRow.id);
      if (!manifest) continue;

      log.info(`[Plugins] Loading plugin ${manifest.id}...`);

      // Run migrations
      this.runPluginMigrations(manifest.id);

      // Load main entry point
      const pluginMainPath = path.join(this.pluginsDir, manifest.id, manifest.main);
      if (fs.existsSync(pluginMainPath)) {
        try {
          // We pass context so the plugin can register routes and events
          const pluginModule = require(pluginMainPath);
          if (typeof pluginModule === 'function') {
             pluginModule({ app: appServer, eventBus, db });
          } else if (pluginModule && typeof pluginModule.default === 'function') {
             pluginModule.default({ app: appServer, eventBus, db });
          }
        } catch (e) {
          log.error(`[Plugins] Error executing plugin ${manifest.id} entry point:`, e);
        }
      } else {
          log.warn(`[Plugins] Main entry file not found for plugin ${manifest.id}: ${pluginMainPath}`);
      }
    }
  }

  private runPluginMigrations(pluginId: string) {
    const db = getDatabase();
    const migrationsDir = path.join(this.pluginsDir, pluginId, 'migrations');
    if (!fs.existsSync(migrationsDir)) return;

    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

    for (const file of files) {
      const version = file.split('_')[0];
      const executed = db.prepare('SELECT id FROM plugin_migrations WHERE plugin_id = ? AND version = ?').get(pluginId, version);

      if (!executed) {
        log.info(`[Plugins] Running migration ${file} for plugin ${pluginId}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
        try {
          db.exec(sql);
          db.prepare(`
            INSERT INTO plugin_migrations (plugin_id, version, name, executed_at) VALUES (?, ?, ?, ?)
          `).run(pluginId, version, file, new Date().toISOString());
        } catch (e) {
          log.error(`[Plugins] Migration ${file} failed for plugin ${pluginId}:`, e);
        }
      }
    }
  }

  public listPlugins() {
    const db = getDatabase();
    return db.prepare('SELECT * FROM plugins').all();
  }

  public getPluginMetadata(id: string) {
    return this.memoryPlugins.get(id);
  }

  public enablePlugin(pluginId: string) {
    const db = getDatabase();
    db.prepare('UPDATE plugins SET enabled = 1, updated_at = ? WHERE id = ?').run(new Date().toISOString(), pluginId);
  }

  public disablePlugin(pluginId: string) {
    const db = getDatabase();
    db.prepare('UPDATE plugins SET enabled = 0, updated_at = ? WHERE id = ?').run(new Date().toISOString(), pluginId);
  }

  public getSettings(pluginId: string) {
    const db = getDatabase();
    const row = db.prepare('SELECT settings FROM plugins WHERE id = ?').get(pluginId) as any;
    if (row && row.settings) {
      try {
        return JSON.parse(row.settings);
      } catch {
        return {};
      }
    }
    return {};
  }

  public updateSettings(pluginId: string, settings: any) {
    const db = getDatabase();
    db.prepare('UPDATE plugins SET settings = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(settings), new Date().toISOString(), pluginId);
  }
}

export const pluginsService = new PluginsService();
