import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { loadLocale, saveLocale } from '@/lib/language-storage';
import { isLocale, messages, type Locale } from '@/i18n/messages';

type Vars = Record<string, string | number>;

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Vars) => string;
  tLabel: (label: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function lookup(tree: unknown, key: string): string | undefined {
  const parts = key.split('.');
  let current: unknown = tree;
  for (const part of parts) {
    if (!current || typeof current !== 'object' || !(part in current)) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : undefined;
}

function interpolate(template: string, vars?: Vars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    vars[name] == null ? `{${name}}` : String(vars[name])
  );
}

export function translate(locale: Locale, key: string, vars?: Vars) {
  const value = lookup(messages[locale], key) ?? lookup(messages.en, key) ?? key;
  return interpolate(value, vars);
}

export function translateLabel(locale: Locale, label: string) {
  const labels = messages[locale].labels;
  if (labels && typeof labels === 'object' && label in labels) {
    const value = (labels as Record<string, unknown>)[label];
    if (typeof value === 'string') return value;
  }
  const english = messages.en.labels;
  if (english && typeof english === 'object' && label in english) {
    const value = (english as Record<string, unknown>)[label];
    if (typeof value === 'string') return value;
  }
  return label;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    let cancelled = false;
    void loadLocale().then((stored) => {
      if (!cancelled && stored && isLocale(stored)) setLocaleState(stored);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    void saveLocale(next);
  }, []);

  const t = useCallback((key: string, vars?: Vars) => translate(locale, key, vars), [locale]);
  const tLabel = useCallback((label: string) => translateLabel(locale, label), [locale]);

  const value = useMemo(
    () => ({ locale, setLocale, t, tLabel }),
    [locale, setLocale, t, tLabel]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useI18n must be used inside LanguageProvider');
  }
  return context;
}
