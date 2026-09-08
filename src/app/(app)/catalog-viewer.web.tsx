import { createElement, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ref, getDownloadURL } from 'firebase/storage';

import { catalogErrorMessage } from '@/lib/catalog-error';
import { storage } from '@/lib/firebase';

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

  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!path) {
      Alert.alert('Cannot open catalog', 'Missing catalog file path.');
      router.back();
      return;
    }

    let objectUrl: string | null = null;
    let cancelled = false;

    const loadCatalog = async () => {
      try {
        setLoading(true);
        const downloadUrl = await getDownloadURL(ref(storage, path));
        const response = await fetch(downloadUrl);
        if (!response.ok) {
          throw new Error(`UnableToDownload: ${response.status}`);
        }

        const blob = await response.blob();
        const pdfBlob = new Blob([blob], { type: 'application/pdf' });
        objectUrl = URL.createObjectURL(pdfBlob);
        if (!cancelled) {
          setBlobUrl(objectUrl);
        } else {
          URL.revokeObjectURL(objectUrl);
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
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [path, router]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.headerButton} />
      </View>

      {loading || !blobUrl ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Opening catalog…</Text>
        </View>
      ) : (
        createElement('iframe', {
          src: blobUrl,
          title,
          style: {
            flex: 1,
            width: '100%',
            height: '100%',
            border: 'none',
            background: '#525252',
          },
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 60,
    paddingBottom: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
  },
});
