'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/settings/Toggle';

type PluginSettingsSchemaProperty = {
  type?: string;
  default?: unknown;
  required?: boolean;
};

type PluginSettingsSchema = {
  type?: string;
  properties?: Record<string, PluginSettingsSchemaProperty>;
};

type PluginRecord = {
  id: string;
  name: string;
  version: string;
  description: string;
  enabled: boolean;
  author?: string;
  license?: string;
  settingsSchema?: PluginSettingsSchema;
  permissions?: string[];
};

export function PluginManager() {
  const [plugins, setPlugins] = useState<PluginRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadPlugins = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/v1/plugins');
      const nextPlugins = Array.isArray(data?.plugins) ? data.plugins : [];
      setPlugins(nextPlugins.map((plugin: PluginRecord) => ({
        ...plugin,
        enabled: Boolean(plugin.enabled),
      })));
    } catch {
      toast.error('Could not load plugins');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadPlugins();
    }, 0);
    return () => clearTimeout(timeout);
  }, []);

  const togglePlugin = async (plugin: PluginRecord) => {
    setBusyId(plugin.id);
    try {
      const endpoint = plugin.enabled ? `/v1/plugins/${encodeURIComponent(plugin.id)}/disable` : `/v1/plugins/${encodeURIComponent(plugin.id)}/enable`;
      const { data } = await api.post(endpoint);
      const nextEnabled = Boolean(data?.plugin?.enabled ?? !plugin.enabled);
      setPlugins((current) => current.map((item) => (
        item.id === plugin.id ? { ...item, enabled: nextEnabled } : item
      )));
      toast.success(nextEnabled ? `${plugin.name} enabled` : `${plugin.name} disabled`);
    } catch {
      toast.error(`Could not update ${plugin.name}`);
    } finally {
      setBusyId(null);
    }
  };

  const hasConfigurablePlugins = useMemo(
    () => plugins.some((plugin) => plugin.settingsSchema && Object.keys(plugin.settingsSchema.properties ?? {}).length > 0),
    [plugins],
  );

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Loading plugins…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Plugins</h1>
          <p className="text-sm text-muted-foreground">Enable or disable optional features and configure their settings.</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/settings">Back to Settings</Link>
        </Button>
      </div>

      {plugins.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-sm text-muted-foreground text-center">
          No plugins installed yet.
        </div>
      ) : (
        <div className="grid gap-4">
          {plugins.map((plugin) => {
            const configCount = Object.keys(plugin.settingsSchema?.properties ?? {}).length;
            return (
              <div key={plugin.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold text-foreground">{plugin.name}</h2>
                      <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                        {plugin.version}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{plugin.description || 'No description provided.'}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {plugin.author && <span className="rounded-md bg-muted px-2 py-1">by {plugin.author}</span>}
                      {plugin.license && <span className="rounded-md bg-muted px-2 py-1">{plugin.license}</span>}
                      {configCount > 0 && <span className="rounded-md bg-muted px-2 py-1">{configCount} setting{configCount === 1 ? '' : 's'}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 md:justify-end">
                    {configCount > 0 && (
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/settings/plugins/${encodeURIComponent(plugin.id)}`}>Configure</Link>
                      </Button>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{plugin.enabled ? 'Enabled' : 'Disabled'}</span>
                      <Toggle
                        aria-label={`Toggle ${plugin.name}`}
                        label={`Toggle ${plugin.name}`}
                        value={plugin.enabled}
                        onChange={() => void togglePlugin(plugin)}
                      />
                    </div>
                  </div>
                </div>

                {plugin.permissions && plugin.permissions.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                    {plugin.permissions.map((permission) => (
                      <span key={permission} className="rounded-md border border-border px-2 py-1">
                        {permission}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!hasConfigurablePlugins && plugins.length > 0 && (
        <p className="text-xs text-muted-foreground">Installed plugins do not currently expose configurable settings.</p>
      )}

      {busyId && <div className="sr-only" aria-live="polite">Updating plugin status</div>}
    </div>
  );
}
