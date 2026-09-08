import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/expo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { collection, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { ScreenHeader } from '@/components/screen-header';
import { Connex } from '@/constants/theme';
import { useI18n } from '@/i18n/language-provider';
import { db } from '@/lib/firebase';
import { normalizeTasks, taskProgress } from '@/lib/progress';
import { describeStorageError, uploadJpegToStorage } from '@/lib/upload-image';

type ProjectCard = {
  id: string;
  name: string;
  imageUrl?: string;
  progress: number;
  done: number;
  total: number;
};

export default function ProgressTrackingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isLoaded } = useUser();
  const { t } = useI18n();
  const [projects, setProjects] = useState<ProjectCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !user?.emailAddresses?.[0]?.emailAddress) {
      setLoading(false);
      return;
    }

    const userEmail = user.emailAddresses[0].emailAddress;
    const unsubscribe = onSnapshot(
      query(collection(db, 'projects'), where('userEmail', '==', userEmail)),
      (snapshot) => {
        const next = snapshot.docs.map((snap) => {
          const data = snap.data();
          const tasks = normalizeTasks(data.tasks);
          return {
            id: snap.id,
            name: data.name,
            imageUrl: typeof data.imageUrl === 'string' ? data.imageUrl : undefined,
            progress: taskProgress(tasks),
            done: tasks.filter((task) => task.isCompleted).length,
            total: tasks.length,
          };
        });
        setProjects(next);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching projects:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isLoaded, user]);

  const pickCover = async (projectId: string) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.photos'), t('progress.coverAccess'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 10],
      quality: 0.7,
      base64: true,
    });
    if (result.canceled) return;

    setUploadingId(projectId);
    try {
      const imageUrl = await uploadJpegToStorage(
        `projects/${projectId}/cover.jpg`,
        result.assets[0]
      );
      await updateDoc(doc(db, 'projects', projectId), { imageUrl });
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert(t('progress.uploadFail'), describeStorageError(error));
    } finally {
      setUploadingId(null);
    }
  };

  const overall =
    projects.length === 0
      ? 0
      : Math.round(projects.reduce((sum, project) => sum + project.progress, 0) / projects.length);

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('progress.title')} subtitle={t('progress.subtitle')} onBack={() => router.back()} />

      {!isLoaded || loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Connex.accent} />
          <Text style={styles.centerCopy}>{t('budget.loading')}</Text>
        </View>
      ) : !user ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>{t('common.signInRequired')}</Text>
          <Text style={styles.emptyCopy}>{t('budget.signInCopy')}</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
        >
          <View style={styles.hero}>
            <Text style={styles.heroLabel}>{t('progress.average')}</Text>
            <Text style={styles.heroTotal}>{overall}%</Text>
            <Text style={styles.heroMeta}>{t('progress.projectMeta', { count: projects.length })}</Text>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${overall}%` }]} />
            </View>
          </View>

          {projects.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="bar-chart-outline" size={26} color={Connex.accent} />
              </View>
              <Text style={styles.emptyTitle}>{t('progress.none')}</Text>
              <Text style={styles.emptyCopy}>{t('progress.noneCopy')}</Text>
              <Pressable
                style={styles.ghostCta}
                onPress={() => router.push('/(app)/add-project')}
              >
                <Text style={styles.ghostCtaText}>{t('progress.add')}</Text>
              </Pressable>
            </View>
          ) : (
            projects.map((project) => (
              <View key={project.id} style={styles.card}>
                <Pressable style={styles.cover} onPress={() => void pickCover(project.id)}>
                  {uploadingId === project.id ? (
                    <View style={styles.coverEmpty}>
                      <ActivityIndicator color={Connex.accent} />
                    </View>
                  ) : project.imageUrl ? (
                    <Image
                      source={{ uri: project.imageUrl }}
                      style={styles.coverImage}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                      transition={200}
                    />
                  ) : (
                    <View style={styles.coverEmpty}>
                      <Ionicons name="camera-outline" size={22} color={Connex.accent} />
                      <Text style={styles.coverHint}>{t('progress.sitePhoto')}</Text>
                    </View>
                  )}
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.body, pressed && styles.pressed]}
                  onPress={() =>
                    router.push({
                      pathname: '/(app)/project-progress',
                      params: { projectId: project.id },
                    })
                  }
                >
                  <Text style={styles.name}>{project.name}</Text>
                  <Text style={styles.meta}>
                    {t('progress.taskMeta', { done: project.done, total: project.total, pct: project.progress })}
                  </Text>
                  <View style={styles.miniTrack}>
                    <View style={[styles.miniFill, { width: `${project.progress}%` }]} />
                  </View>
                </Pressable>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Connex.bg,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 12,
  },
  hero: {
    backgroundColor: Connex.ink,
    borderRadius: 20,
    padding: 18,
    marginBottom: 4,
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A8A29E',
  },
  heroTotal: {
    marginTop: 6,
    fontSize: 32,
    fontWeight: '800',
    color: Connex.surface,
    letterSpacing: -0.8,
  },
  heroMeta: {
    marginTop: 6,
    fontSize: 13,
    color: '#D6D3D1',
  },
  track: {
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
    marginTop: 12,
    overflow: 'hidden',
  },
  fill: {
    height: 6,
    backgroundColor: Connex.accent,
    borderRadius: 999,
  },
  card: {
    backgroundColor: Connex.surface,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Connex.line,
  },
  cover: {
    height: 140,
    backgroundColor: Connex.accentSoft,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverHint: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
    color: Connex.accent,
  },
  body: {
    padding: 14,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: Connex.ink,
  },
  meta: {
    marginTop: 4,
    fontSize: 13,
    color: Connex.muted,
  },
  miniTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: Connex.bg,
    marginTop: 10,
    overflow: 'hidden',
  },
  miniFill: {
    height: 6,
    borderRadius: 999,
    backgroundColor: Connex.accent,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  centerCopy: {
    marginTop: 12,
    color: Connex.muted,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Connex.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Connex.ink,
    textAlign: 'center',
  },
  emptyCopy: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: Connex.muted,
    textAlign: 'center',
  },
  ghostCta: {
    marginTop: 18,
    backgroundColor: Connex.ink,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  ghostCtaText: {
    color: Connex.surface,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.9,
  },
});
