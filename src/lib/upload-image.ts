import { File, Paths, UploadType } from 'expo-file-system';
import { Platform } from 'react-native';
import { getDownloadURL, ref } from 'firebase/storage';
import { storage } from '@/lib/firebase';

type PickerAsset = {
  uri: string;
  base64?: string | null;
};

type StorageHttpError = Error & {
  code: string;
  status: number;
  serverResponse: string;
};

function storageBucket() {
  return (process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '').replace(/^gs:\/\//, '');
}

function restUploadUrl(objectPath: string) {
  const bucket = storageBucket();
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?name=${encodeURIComponent(objectPath)}`;
}

function downloadUrlFromToken(objectPath: string, token: string) {
  const bucket = storageBucket();
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(objectPath)}?alt=media&token=${token}`;
}

function base64ToBytes(base64: string) {
  const clean = base64.includes(',') ? base64.split(',')[1] : base64;
  const binary = globalThis.atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function jpegFileFromAsset(asset: PickerAsset) {
  const dest = new File(Paths.cache, `connex-upload-${Date.now()}.jpg`);

  if (asset.uri) {
    try {
      const source = new File(asset.uri);
      if (source.exists && source.size > 0) {
        source.copySync(dest, { overwrite: true });
        if (dest.exists && dest.size > 0) return dest;
      }
    } catch {
      // Write from base64 instead.
    }
  }

  if (!asset.base64) {
    throw new Error('The selected photo could not be read. Try another image.');
  }

  dest.create({ overwrite: true });
  dest.write(base64ToBytes(asset.base64));
  if (!dest.exists || dest.size === 0) {
    throw new Error('The selected photo could not be saved on this device.');
  }
  return dest;
}

function throwStorageHttpError(status: number, body: string): never {
  let message = body;
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } };
    if (parsed.error?.message) message = parsed.error.message;
  } catch {
    // Use the raw body.
  }

  const error = new Error(message || `Upload failed (${status})`) as StorageHttpError;
  error.status = status;
  error.serverResponse = body;
  if (status === 401 || status === 403) error.code = 'storage/unauthorized';
  else if (status === 404) error.code = 'storage/not-found';
  else error.code = 'storage/unknown';
  throw error;
}

async function uploadWithNativeFile(objectPath: string, file: File) {
  const result = await file.upload(restUploadUrl(objectPath), {
    httpMethod: 'POST',
    uploadType: UploadType.BINARY_CONTENT,
    mimeType: 'image/jpeg',
    headers: { 'Content-Type': 'image/jpeg' },
  });

  if (result.status < 200 || result.status >= 300) {
    console.error('Storage upload failed', result.status, result.body);
    throwStorageHttpError(result.status, result.body);
  }

  return result.body;
}

async function uploadOnWeb(objectPath: string, asset: PickerAsset) {
  let body: Blob;
  if (asset.uri) {
    const response = await fetch(asset.uri);
    body = await response.blob();
  } else if (asset.base64) {
    body = new Blob([base64ToBytes(asset.base64)], { type: 'image/jpeg' });
  } else {
    throw new Error('The selected photo could not be read. Try another image.');
  }

  const response = await fetch(restUploadUrl(objectPath), {
    method: 'POST',
    headers: { 'Content-Type': 'image/jpeg' },
    body,
  });
  const text = await response.text();
  if (!response.ok) throwStorageHttpError(response.status, text);
  return text;
}

export async function uploadJpegToStorage(storagePath: string, asset: PickerAsset) {
  if (!storageBucket()) {
    throw new Error('Firebase Storage bucket is missing. Set EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET.');
  }

  const body =
    Platform.OS === 'web'
      ? await uploadOnWeb(storagePath, asset)
      : await uploadWithNativeFile(storagePath, jpegFileFromAsset(asset));

  try {
    return await getDownloadURL(ref(storage, storagePath));
  } catch {
    try {
      const payload = JSON.parse(body) as { downloadTokens?: string };
      if (payload.downloadTokens) {
        return downloadUrlFromToken(storagePath, payload.downloadTokens);
      }
    } catch {
      // Fall through.
    }
    throw new Error('Photo uploaded but the download link could not be created.');
  }
}

export function describeStorageError(error: unknown) {
  const code =
    typeof error === 'object' && error && 'code' in error ? String((error as { code: unknown }).code) : '';
  const status =
    typeof error === 'object' && error && 'status' in error
      ? Number((error as { status: unknown }).status)
      : 0;
  const message = error instanceof Error ? error.message : '';
  const serverResponse =
    typeof error === 'object' && error && 'serverResponse' in error
      ? String((error as { serverResponse: unknown }).serverResponse)
      : '';

  if (code.includes('not-found') || status === 404) {
    return 'Firebase Storage is not created yet. In Firebase Console → Storage, click Get started, then try again.';
  }
  if (code.includes('unauthorized') || code.includes('permission-denied') || status === 401 || status === 403) {
    return 'Firebase Storage blocked the upload. The app uses Clerk, not Firebase Auth. In Firebase Console → Storage → Rules, use: allow read, write: if true; then publish.';
  }
  if (message.includes('ArrayBuffer') || message.includes('blob')) {
    return 'Could not prepare the photo on this device. Close Expo Go fully and reopen the app, then try again.';
  }
  if (code.includes('retry-limit-exceeded') || code.includes('unknown')) {
    const extra = message && message !== 'An unknown error occurred, please check the error payload for server response.'
      ? ` ${message}`
      : '';
    const bodyHint = serverResponse ? ` Server said: ${serverResponse.slice(0, 180)}` : '';
    return `Could not reach Firebase Storage.${extra}${bodyHint} Confirm Storage is created for connex-79774 and the rules allow writes.`;
  }
  return message || 'Failed to upload the photo.';
}
