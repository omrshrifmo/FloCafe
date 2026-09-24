'use client';

import { useEffect } from 'react';
import api from '@/lib/api';

export function BrandingSync() {
  useEffect(() => {
    async function sync() {
      try {
        const res = await api.get('/v1/theme-egypt/branding');
        const branding = res.data;
        if (branding) {
           const root = document.documentElement;
           if (branding.primary_color) {
               root.style.setProperty('--brand', branding.primary_color);
           }
           if (branding.app_name) {
               document.title = branding.app_name;
           }
        }
      } catch {
        // Plugin might be disabled, ignore
      }
    }
    sync();
  }, []);
  return null;
}
