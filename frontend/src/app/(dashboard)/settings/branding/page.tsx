'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function BrandingPage() {
  const [branding, setBranding] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/v1/theme-egypt/branding');
        setBranding(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/v1/theme-egypt/branding', branding);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Branding</h1>
      <div className="bg-card border rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">App Name</label>
          <input
            type="text"
            className="w-full px-3 py-2 border rounded-lg"
            value={branding.app_name || ''}
            onChange={e => setBranding({ ...branding, app_name: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Primary Color</label>
          <input
            type="color"
            className="w-16 h-10 px-1 py-1 border rounded-lg"
            value={branding.primary_color || '#3248FF'}
            onChange={e => setBranding({ ...branding, primary_color: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Secondary Color</label>
          <input
            type="color"
            className="w-16 h-10 px-1 py-1 border rounded-lg"
            value={branding.secondary_color || '#1E1E2E'}
            onChange={e => setBranding({ ...branding, secondary_color: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Default Locale</label>
          <select
            className="w-full px-3 py-2 border rounded-lg"
            value={branding.locale_default || 'ar'}
            onChange={e => setBranding({ ...branding, locale_default: e.target.value })}
          >
            <option value="en">English</option>
            <option value="ar">Arabic</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Logo Light URL</label>
          <input
            type="text"
            className="w-full px-3 py-2 border rounded-lg"
            value={branding.logo_light || ''}
            onChange={e => setBranding({ ...branding, logo_light: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Logo Dark URL</label>
          <input
            type="text"
            className="w-full px-3 py-2 border rounded-lg"
            value={branding.logo_dark || ''}
            onChange={e => setBranding({ ...branding, logo_dark: e.target.value })}
          />
        </div>
      </div>
      <div className="flex justify-end">
         <button disabled={saving} onClick={handleSave} className="bg-brand text-white px-4 py-2 rounded-lg font-medium">
           {saving ? 'Saving...' : 'Save'}
         </button>
      </div>
    </div>
  );
}
