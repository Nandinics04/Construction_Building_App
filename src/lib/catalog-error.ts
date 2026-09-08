export function catalogErrorMessage(error: unknown) {
  const text = error instanceof Error ? error.message : String(error);

  if (text.includes('quota-exceeded')) {
    const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? 'your Firebase project';
    return `Firebase Storage quota is full. In Firebase Console, open project ${projectId} → Storage, delete unused files or upgrade to the Blaze plan.`;
  }

  if (text.includes('object-not-found')) {
    return 'This catalog PDF was not found in Storage. Upload it to the catalogs/ folder with the exact file name.';
  }

  return 'Could not open the catalog.';
}
