'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';

type SchemaProperty = {
  type?: string;
  default?: unknown;
  required?: boolean;
};

type PluginMetadata = {
  id: string;
  name: string;
  version?: string;
  description?: string;
  enabled?: boolean;
};

export function PluginSettingsForm({ pluginId }: { pluginId: string }) {
  const [plugin, setPlugin] = useState<PluginMetadata | null>(null);
  const [schema, setSchema] = useState<Record<string, SchemaProperty>>({});
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!pluginId) return;

    const timeout = setTimeout(() => {
      void (async () => {
        setLoading(true);
        try {
          const [listResponse, settingsResponse] = await Promise.all([
            api.get('/v1/plugins'),
            api.get(`/v1/plugins/${encodeURIComponent(pluginId)}/settings`),
          ]);

          const foundPlugin = Array.isArray(listResponse.data?.plugins)
            ? listResponse.data.plugins.find((candidate: PluginMetadata) => candidate.id === pluginId)
            : null;

          setPlugin(foundPlugin ?? {
            id: pluginId,
            name: pluginId,
            version: settingsResponse.data?.plugin?.version ?? 'unknown',
            description: settingsResponse.data?.plugin?.description ?? '',
          });

          const nextSchema = (settingsResponse.data?.settingsSchema?.properties as Record<string, SchemaProperty>) ?? {};
          const defaults = Object.fromEntries(
            Object.entries(nextSchema).map(([key, property]) => [key, property?.default ?? getDefaultValue(property?.type)])
          );
          const nextValues = { ...defaults, ...(settingsResponse.data?.settings ?? {}) };
          setSchema(nextSchema);
          setValues(nextValues);
        } catch {
          toast.error('Could not load plugin settings');
        } finally {
          setLoading(false);
        }
      })();
    }, 0);

    return () => clearTimeout(timeout);
  }, [pluginId]);

  const orderedKeys = useMemo(() => Object.keys(schema), [schema]);

  const updateValue = (key: string, value: unknown) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const saveSettings = async () => {
    if (!pluginId) return;
    setSaving(true);
    try {
      await api.put(`/v1/plugins/${encodeURIComponent(pluginId)}/settings`, values);
      toast.success('Plugin settings saved');
    } catch {
      toast.error('Could not save plugin settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Loading plugin settings…
      </div>
    );
  }

  if (!plugin) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-foreground">Plugin not found</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/settings/plugins">Back to Plugins</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{plugin.name}</h1>
          <p className="text-sm text-muted-foreground">
            {plugin.version ? `Version ${plugin.version}` : 'Plugin settings'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/settings/plugins">Back to plugins</Link>
          </Button>
          <Button type="button" size="sm" onClick={() => void saveSettings()} disabled={saving}>
            {saving ? 'Saving…' : 'Save settings'}
          </Button>
        </div>
      </div>

      {orderedKeys.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-sm text-muted-foreground text-center">
          This plugin does not expose any settings.
        </div>
      ) : (
        <div className="space-y-4 rounded-xl border border-border bg-card p-5">
          {orderedKeys.map((key) => {
            const property = schema[key];
            const type = property?.type ?? 'string';
            const value = values[key];

            return (
              <div key={key} className="space-y-2">
                <label className="block text-sm font-medium text-foreground">{formatLabel(key)}</label>
                {type === 'boolean' ? (
                  <label className="flex items-center gap-3 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={Boolean(value)}
                      onChange={(event) => updateValue(key, event.target.checked)}
                      className="h-4 w-4 rounded border-border text-brand"
                    />
                    {value ? 'Enabled' : 'Disabled'}
                  </label>
                ) : type === 'number' ? (
                  <input
                    type="number"
                    value={Number.isFinite(Number(value)) ? String(value) : ''}
                    onChange={(event) => updateValue(key, Number(event.target.value))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
                  />
                ) : type === 'array' ? (
                  <textarea
                    value={Array.isArray(value) ? value.join(', ') : ''}
                    onChange={(event) => updateValue(key, event.target.value.split(',').map((entry) => entry.trim()).filter(Boolean))}
                    rows={3}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
                  />
                ) : (
                  <input
                    type="text"
                    value={typeof value === 'string' ? value : value === undefined || value === null ? '' : String(value)}
                    onChange={(event) => updateValue(key, event.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatLabel(key: string) {
  return key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function getDefaultValue(type?: string) {
  switch (type) {
    case 'boolean':
      return false;
    case 'number':
      return 0;
    case 'array':
      return [];
    default:
      return '';
  }
}
