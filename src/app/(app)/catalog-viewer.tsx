import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Directory, File, Paths } from 'expo-file-system';
import { startActivityAsync } from 'expo-intent-launcher';
import { ref, getDownloadURL } from 'firebase/storage';
import { WebView } from 'react-native-webview';

import { catalogErrorMessage } from '@/lib/catalog-error';
import { storage } from '@/lib/firebase';
import { PDF_VIEWER_HTML } from '@/lib/pdf-viewer-html';
import { ScreenHeader } from '@/components/screen-header';
import { Connex } from '@/constants/theme';

function paramValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export default function CatalogViewerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ title?: string; path?: string }>();
  const title = paramValue(params.title) ?? 'Catalog';
  const path = paramValue(params.path);

  const [viewerSource, setViewerSource] = useState<
    { uri: string } | { html: string; baseUrl: string } | null
  >(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!path) {
      Alert.alert('Cannot open catalog', 'Missing catalog file path.');
      router.back();
      return;
    }

    let cancelled = false;

    const loadCatalog = async () => {
      try {
        setLoading(true);
        const downloadUrl = await getDownloadURL(ref(storage, path));

        const dir = new Directory(Paths.cache, 'catalog-viewer');
        dir.create({ intermediates: true, idempotent: true });

        const pdfFile = new File(dir, 'catalog.pdf');
        await File.downloadFileAsync(downloadUrl, pdfFile, { idempotent: true });

        if (Platform.OS === 'ios') {
          if (!cancelled) {
            setViewerSource({ uri: pdfFile.uri });
          }
          return;
        }

        const baseUrl = dir.uri.endsWith('/') ? dir.uri : `${dir.uri}/`;
        if (!cancelled) {
          setViewerSource({ html: PDF_VIEWER_HTML, baseUrl });
        }
      } catch (error) {
        console.error('Error opening catalog PDF:', error);
        if (!cancelled) {
          Alert.alert('Cannot open catalog', catalogErrorMessage(error), [
            { text: 'OK', onPress: () => router.back() },
          ]);
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
    };
  }, [path, router]);

  const openWithSystemReader = async () => {
    try {
      const pdfFile = new File(Paths.cache, 'catalog-viewer', 'catalog.pdf');
      if (!pdfFile.exists) {
        throw new Error('Catalog file is not on this device yet.');
      }

      await startActivityAsync('android.intent.action.VIEW', {
        data: pdfFile.contentUri,
        flags: 1,
        type: 'application/pdf',
      });
    } catch (error) {
      Alert.alert('Cannot open catalog', catalogErrorMessage(error));
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={title}
        subtitle="Read in the app"
        onBack={() => router.back()}
        right={
          Platform.OS === 'android' ? (
            <TouchableOpacity onPress={openWithSystemReader} style={styles.headerAction}>
              <Ionicons name="open-outline" size={20} color={Connex.ink} />
            </TouchableOpacity>
          ) : undefined
        }
      />

      {loading || !viewerSource ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Connex.accent} />
          <Text style={styles.loadingText}>Opening catalog…</Text>
        </View>
      ) : (
        <WebView
          source={viewerSource}
          style={styles.webview}
          originWhitelist={['*']}
          allowFileAccess
          allowFileAccessFromFileURLs
          allowUniversalAccessFromFileURLs
          allowingReadAccessToURL={
            'baseUrl' in viewerSource ? viewerSource.baseUrl : viewerSource.uri
          }
          mixedContentMode="always"
          javaScriptEnabled
          domStorageEnabled
          nestedScrollEnabled
          setSupportMultipleWindows={false}
          startInLoadingState
          onMessage={(event) => {
            if (event.nativeEvent.data === 'pdf-failed' && Platform.OS === 'android') {
              void openWithSystemReader();
            }
          }}
          renderLoading={() => (
            <View style={styles.webviewLoader}>
              <ActivityIndicator size="large" color={Connex.accent} />
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Connex.bg,
  },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Connex.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webview: {
    flex: 1,
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#525252',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    color: Connex.muted,
    fontSize: 14,
  },
  webviewLoader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Connex.bg,
  },
});
