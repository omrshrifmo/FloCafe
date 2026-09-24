'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'use-intl';
import api from '@/lib/api';

export default function PluginsPage() {
  const t = useTranslations('plugins');
  const [plugins, setPlugins] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);

  const [configuringPlugin, setConfiguringPlugin] = useState<Record<string, any> | null>(null);
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  const loadPlugins = async () => {
    try {
      const res = await api.get<Record<string, any>[]>('/v1/plugins');
      setPlugins(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    loadPlugins();
  }, []);

  const togglePlugin = async (plugin: Record<string, any>) => {
    try {
      if (plugin.enabled === 1) {
         await api.post(`/v1/plugins/${plugin.id}/disable`);
      } else {
         await api.post(`/v1/plugins/${plugin.id}/enable`);
      }
      loadPlugins();
    } catch (e) {
      console.error(e);
    }
  };

  const startConfiguring = async (plugin: Record<string, any>) => {
     setConfiguringPlugin(plugin);
     setSettings({});
     try {
        const settingsRes = await api.get(`/v1/plugins/${plugin.id}/settings`);
        setSettings(settingsRes.data);
     } catch (e) {
        console.error(e);
     }
  };

  const handleSave = async () => {
     if (!configuringPlugin) return;
     setSaving(true);
     try {
       await api.put(`/v1/plugins/${configuringPlugin.id}/settings`, settings);
       setConfiguringPlugin(null);
     } catch (e) {
       console.error(e);
     } finally {
       setSaving(false);
     }
  };

  if (loading) return <div className="p-8 text-center">{t('loading')}</div>;

  if (configuringPlugin) {
      const schema = configuringPlugin.manifest?.settingsSchema?.properties || {};
      return (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">{configuringPlugin.manifest?.name || configuringPlugin.name} {t('settings')}</h1>
            <button onClick={() => setConfiguringPlugin(null)} className="text-sm text-muted-foreground">{t('back')}</button>
          </div>

          <div className="bg-card border rounded-lg p-6 space-y-4">
            {Object.keys(schema).map(key => {
              const field = schema[key];
              return (
                <div key={key}>
                  <label className="block text-sm font-medium mb-1">{key}</label>
                  {field.type === 'boolean' ? (
                    <input
                      type="checkbox"
                      checked={settings[key] ?? field.default ?? false}
                      onChange={e => setSettings({ ...settings, [key]: e.target.checked })}
                    />
                  ) : field.type === 'number' ? (
                    <input
                      type="number"
                      className="w-full px-3 py-2 border rounded-lg"
                      value={settings[key] ?? field.default ?? ''}
                      onChange={e => setSettings({ ...settings, [key]: Number(e.target.value) })}
                    />
                  ) : (
                    <input
                      type="text"
                      className="w-full px-3 py-2 border rounded-lg"
                      value={settings[key] ?? field.default ?? ''}
                      onChange={e => setSettings({ ...settings, [key]: e.target.value })}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-end">
            <button disabled={saving} onClick={handleSave} className="bg-brand text-white px-4 py-2 rounded-lg font-medium">
              {saving ? t('saving') : t('save')}
            </button>
          </div>
        </div>
      );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">{t('plugins')}</h1>
      {plugins.length === 0 ? (
        <p className="text-muted-foreground">{t('noPlugins')}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {plugins.map((plugin) => (
            <div key={plugin.id} className="border p-4 rounded-lg flex items-center justify-between bg-card">
              <div>
                <h3 className="font-semibold">{plugin.manifest?.name || plugin.name} <span className="text-xs text-muted-foreground ml-2">v{plugin.version}</span></h3>
                <p className="text-sm text-muted-foreground mt-1">{plugin.manifest?.description || ''}</p>
              </div>
              <div className="flex items-center gap-4">
                {plugin.manifest?.settingsSchema && (
                  <button onClick={() => startConfiguring(plugin)} className="text-sm font-medium text-brand hover:underline">
                    {t('configure')}
                  </button>
                )}
                <button
                  onClick={() => togglePlugin(plugin)}
                  className={`px-4 py-2 rounded text-sm font-medium ${plugin.enabled === 1 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}
                >
                  {plugin.enabled === 1 ? t('disable') : t('enable')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
