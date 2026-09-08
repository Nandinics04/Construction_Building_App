import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getDownloadURL, ref } from 'firebase/storage';
import { Directory, File, Paths } from 'expo-file-system';
import { storage } from '@/lib/firebase';
import { PdfFrame } from '@/components/pdf-frame';
import { buildPdfHtmlFromBase64, buildPdfHtmlFromUrl } from '@/lib/catalog-pdf-html';
import { ScreenHeader } from '@/components/screen-header';
import { Connex } from '@/constants/theme';
import { useI18n } from '@/i18n/language-provider';

function catalogErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.includes('quota-exceeded')) {
    return 'Firebase Storage quota is full. Open Storage in your Firebase project, delete unused files, or stay on the Blaze free quota.';
  }
  if (error instanceof Error && error.message.includes('object-not-found')) {
    return 'This catalog PDF was not found in Firebase Storage. Upload it under catalogs/ with the exact file name.';
  }
  return 'Failed to open the catalog.';
}

export default function CatalogPdfScreen() {
  const router = useRouter();
  const { t, tLabel } = useI18n();
  const params = useLocalSearchParams<{ title?: string; path?: string }>();
  const title = typeof params.title === 'string' ? tLabel(params.title) : t('catalog.title');
  const path = typeof params.path === 'string' ? params.path : '';

  const [html, setHtml] = useState<string | undefined>();
  const [uri, setUri] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const webObjectUrl = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadCatalog = async () => {
      if (!path) {
        setError('This catalog file is missing.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const downloadUrl = await getDownloadURL(ref(storage, path));

        if (Platform.OS === 'web') {
          try {
            const response = await fetch(downloadUrl);
            if (!response.ok) {
              throw new Error('Failed to open the catalog');
            }
            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob.slice(0, blob.size, 'application/pdf'));
            webObjectUrl.current = objectUrl;
            if (!cancelled) {
              setUri(objectUrl);
              setHtml(undefined);
            }
          } catch {
            if (!cancelled) {
              setHtml(buildPdfHtmlFromUrl(downloadUrl));
              setUri(undefined);
            }
          }
          return;
        }

        const fileName = path.split('/').pop() || 'catalog.pdf';
        const directory = new Directory(Paths.cache, 'catalogs');
        if (!directory.exists) {
          directory.create({ intermediates: true, idempotent: true });
        }
        const destination = new File(directory, fileName);
        const file = await File.downloadFileAsync(downloadUrl, destination, {
          idempotent: true,
        });
        const base64 = await file.base64();
        const viewer = new File(directory, 'viewer.html');
        viewer.create({ overwrite: true });
        viewer.write(buildPdfHtmlFromBase64(base64));
        if (!cancelled) {
          setUri(viewer.uri);
          setHtml(undefined);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(catalogErrorMessage(loadError));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadCatalog();

    return () => {
      cancelled = true;
      if (webObjectUrl.current) {
        URL.revokeObjectURL(webObjectUrl.current);
        webObjectUrl.current = null;
      }
    };
  }, [path]);

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={title}
        subtitle={t('catalog.readInApp')}
        onBack={() => router.back()}
      />

      {loading ? (
        <View style={styles.centered}>
          <View style={styles.statusCard}>
            <ActivityIndicator size="large" color={Connex.accent} />
            <Text style={styles.statusTitle}>{t('catalog.opening')}</Text>
            <Text style={styles.statusText}>Fetching the PDF so you can read it here.</Text>
          </View>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <View style={styles.statusCard}>
            <View style={styles.errorIcon}>
              <Ionicons name="alert-circle-outline" size={28} color={Connex.danger} />
            </View>
            <Text style={styles.statusTitle}>{t('catalog.cannotOpen')}</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.reader}>
          <PdfFrame html={html} uri={uri} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Connex.bg,
  },
  reader: {
    flex: 1,
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#525659',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  statusCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Connex.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Connex.line,
  },
  statusTitle: {
    marginTop: 14,
    fontSize: 17,
    fontWeight: '700',
    color: Connex.ink,
    textAlign: 'center',
  },
  statusText: {
    marginTop: 8,
    fontSize: 14,
    color: Connex.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#FDECEC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
    color: Connex.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
