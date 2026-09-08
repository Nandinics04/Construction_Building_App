const KEY = 'connex_locale';

export async function loadLocale() {
  try {
    return globalThis.localStorage?.getItem(KEY) ?? null;
  } catch {
    return null;
  }
}

export async function saveLocale(locale: string) {
  try {
    globalThis.localStorage?.setItem(KEY, locale);
  } catch {
    // Ignore private-mode storage failures.
  }
}
