'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type BrandingSettings = {
  brandName: string;
  appTitle: string;
  accentColor: string;
  secondaryColor: string;
  direction: 'ltr' | 'rtl';
  currencyCode: string;
  locale: string;
};

const STORAGE_KEY = 'flo-branding';
const DEFAULTS: BrandingSettings = {
  brandName: 'Flo Cafe',
  appTitle: 'Flo',
  accentColor: '#3248FF',
  secondaryColor: '#E8EBFF',
  direction: 'ltr',
  currencyCode: 'EGP',
  locale: 'en',
};

export default function BrandingSettingsPage() {
  const [form, setForm] = useState<BrandingSettings>(DEFAULTS);
  const [saving, setSaving] = useState(false);

  const currentThemePlugin = useMemo(
    () => ({ id: 'theme-egypt', name: 'Egypt Theme' }),
    [],
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<BrandingSettings>;
        setForm({ ...DEFAULTS, ...parsed, direction: parsed.direction === 'rtl' ? 'rtl' : 'ltr' });
      }
    } catch {
      // continue with defaults
    }
  }, []);

  const persistLocalValue = (next: BrandingSettings) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event('flo:branding-changed'));
    } catch {
      // best effort only
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const next = { ...form };
      persistLocalValue(next);
      await api.put(`/v1/plugins/${encodeURIComponent(currentThemePlugin.id)}/settings`, {
        settings: next,
      });
      toast.success('Branding saved');
    } catch {
      toast.error('Could not save branding settings');
    } finally {
      setSaving(false);
    }
  };

  const updateField = <K extends keyof BrandingSettings>(key: K, value: BrandingSettings[K]) => {
    const next = { ...form, [key]: value };
    setForm(next);
    persistLocalValue(next);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 rounded-xl border border-border bg-card p-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">White-label branding</p>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">Theme / Egypt branding</h1>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="brandName">Brand name</Label>
          <Input id="brandName" value={form.brandName} onChange={(e) => updateField('brandName', e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="appTitle">Short app title</Label>
          <Input id="appTitle" value={form.appTitle} onChange={(e) => updateField('appTitle', e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="accentColor">Accent color</Label>
          <Input id="accentColor" type="color" value={form.accentColor} onChange={(e) => updateField('accentColor', e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="secondaryColor">Secondary color</Label>
          <Input id="secondaryColor" type="color" value={form.secondaryColor} onChange={(e) => updateField('secondaryColor', e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="currencyCode">Currency code</Label>
          <Input id="currencyCode" value={form.currencyCode} onChange={(e) => updateField('currencyCode', e.target.value.toUpperCase())} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="locale">Locale</Label>
          <Input id="locale" value={form.locale} onChange={(e) => updateField('locale', e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="direction">Direction</Label>
        <select
          id="direction"
          value={form.direction}
          onChange={(e) => updateField('direction', e.target.value === 'rtl' ? 'rtl' : 'ltr')}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="ltr">LTR</option>
          <option value="rtl">RTL</option>
        </select>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => void handleSave()} disabled={saving}>
          {saving ? 'Saving…' : 'Save branding'}
        </Button>
      </div>
    </div>
  );
}
