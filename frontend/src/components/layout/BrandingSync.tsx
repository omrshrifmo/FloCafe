'use client';

import { useEffect } from 'react';
import api from '@/lib/api';

type BrandingSettings = {
  brandName: string;
  appTitle: string;
  accentColor: string;
  secondaryColor: string;
  direction: 'ltr' | 'rtl';
  currencyCode: string;
  locale: string;
};

const DEFAULT_BRANDING: BrandingSettings = {
  brandName: 'Flo Cafe',
  appTitle: 'Flo',
  accentColor: '#3248FF',
  secondaryColor: '#E8EBFF',
  direction: 'ltr',
  currencyCode: 'EGP',
  locale: 'en',
};

const BRANDING_STORAGE_KEY = 'flo-branding';

function normalizeHex(color: string | undefined, fallback: string) {
  if (!color || typeof color !== 'string') return fallback;
  const trimmed = color.trim();
  if (/^#[0-9a-fA-F]{3,8}$/.test(trimmed)) return trimmed;
  if (/^rgb/i.test(trimmed) || /^hsl/i.test(trimmed)) return fallback;
  return fallback;
}

function applyBranding(next: BrandingSettings) {
  const root = document.documentElement;
  const accent = normalizeHex(next.accentColor, DEFAULT_BRANDING.accentColor);
  const secondary = normalizeHex(next.secondaryColor, DEFAULT_BRANDING.secondaryColor);

  root.style.setProperty('--brand', accent);
  root.style.setProperty('--brand-foreground', '#ffffff');
  root.style.setProperty('--sidebar-primary', accent);
  root.style.setProperty('--sidebar-primary-foreground', '#ffffff');
  root.style.setProperty('--sidebar-accent', secondary);
  root.style.setProperty('--sidebar-accent-foreground', accent);
  root.style.setProperty('--flo-brand-name', next.brandName);

  if (typeof document !== 'undefined') {
    document.title = next.appTitle || 'Flo';
  }
}

async function loadBrandingSettings(): Promise<BrandingSettings> {
  const fallback = DEFAULT_BRANDING;

  try {
    const raw = localStorage.getItem(BRANDING_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<BrandingSettings>;
      if (parsed && typeof parsed === 'object') {
        return {
          ...fallback,
          ...parsed,
          direction: parsed.direction === 'rtl' ? 'rtl' : 'ltr',
        };
      }
    }
  } catch {
    // Ignore malformed cached values and fall through to the plugin-enabled settings.
  }

  try {
    const pluginsRes = await api.get('/v1/plugins');
    const plugin = Array.isArray(pluginsRes.data?.plugins)
      ? pluginsRes.data.plugins.find((candidate: { id?: string; enabled?: boolean }) => candidate.id === 'theme-egypt' && candidate.enabled)
      : null;

    if (!plugin) return fallback;

    const settingsRes = await api.get('/v1/plugins/theme-egypt/settings');
    const settings = settingsRes.data?.settings ?? {};

    return {
      ...fallback,
      ...settings,
      direction: settings.direction === 'rtl' ? 'rtl' : 'ltr',
      accentColor: normalizeHex(String(settings.accentColor ?? ''), fallback.accentColor),
      secondaryColor: normalizeHex(String(settings.secondaryColor ?? ''), fallback.secondaryColor),
      brandName: String(settings.brandName ?? fallback.brandName),
      appTitle: String(settings.appTitle ?? fallback.appTitle),
      locale: String(settings.locale ?? fallback.locale),
    };
  } catch {
    return fallback;
  }
}

export function BrandingSync() {
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const next = await loadBrandingSettings();
      if (cancelled) return;
      applyBranding(next);
      try {
        localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Storage can be blocked in private browsing or restricted environments.
      }
    };

    void run();

    const onBrandingChanged = () => {
      void run();
    };

    window.addEventListener('flo:branding-changed', onBrandingChanged);
    return () => {
      cancelled = true;
      window.removeEventListener('flo:branding-changed', onBrandingChanged);
    };
  }, []);

  return null;
}
