export const CLERK_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';

export const GOOGLE_MAPS_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

if (!CLERK_PUBLISHABLE_KEY) {
  console.warn('EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is not set.');
}

if (!GOOGLE_MAPS_API_KEY) {
  console.warn('EXPO_PUBLIC_GOOGLE_MAPS_API_KEY is not set.');
}
