'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { LANGUAGES, type Language } from '@/lib/i18n';
import { usePosSettingsStore } from '@/store/pos-settings';

export default function LanguageSettingsPage() {
  const router = useRouter();
  const language = usePosSettingsStore((state) => state.language);
  const setLanguage = usePosSettingsStore((state) => state.setLanguage);

  const options = useMemo(
    () => Object.entries(LANGUAGES).filter(([, config]) => config.selectable).map(([code, config]) => ({
      value: code as Language,
      label: config.nativeName,
      locale: config.locale,
      direction: config.direction,
    })),
    [],
  );

  const onChange = (nextLanguage: Language) => {
    setLanguage(nextLanguage);
    router.push('/settings');
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 rounded-xl border border-border bg-card p-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Language / اللغة</p>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">Choose your interface language</h1>
      </div>

      <div className="space-y-3">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition ${
              language === option.value
                ? 'border-brand bg-brand/5 text-foreground'
                : 'border-border bg-background text-foreground hover:bg-muted/50'
            }`}
          >
            <span>
              <span className="block text-sm font-medium">{option.label}</span>
              <span className="block text-xs text-muted-foreground">{option.locale}</span>
            </span>
            <span className="text-sm text-muted-foreground">{option.direction === 'rtl' ? 'RTL' : 'LTR'}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
