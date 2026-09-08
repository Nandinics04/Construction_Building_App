import * as SecureStore from 'expo-secure-store';

const KEY = 'connex_locale';

export async function loadLocale() {
  try {
    return await SecureStore.getItemAsync(KEY);
  } catch {
    return null;
  }
}

export async function saveLocale(locale: string) {
  try {
    await SecureStore.setItemAsync(KEY, locale);
  } catch {
    // Device storage may be unavailable; language still applies for this session.
  }
}
