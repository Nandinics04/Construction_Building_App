import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { ScreenHeader } from '@/components/screen-header';
import { Connex } from '@/constants/theme';
import { useI18n } from '@/i18n/language-provider';
import { db, describeFirestoreError } from '@/lib/firebase';
import {
  SITE_STAGES,
  formatTaskDate,
  normalizeTasks,
  taskProgress,
  toFirestoreTask,
  todayISO,
  withoutUndefined,
  type ProgressTask,
} from '@/lib/progress';
import { describeStorageError, uploadJpegToStorage } from '@/lib/upload-image';

type Filter = 'all' | 'open' | 'done';

export default function ProjectProgressScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, tLabel } = useI18n();
  const { projectId } = useLocalSearchParams<{ projectId?: string }>();
  const [name, setName] = useState('Project');
  const [tasks, setTasks] = useState<ProgressTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ description: '', date: todayISO(), notes: '' });
  const tasksRef = useRef<ProgressTask[]>([]);

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    const unsubscribe = onSnapshot(doc(db, 'projects', projectId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setName(data.name);
        const nextTasks = normalizeTasks(data.tasks);
        tasksRef.current = nextTasks;
        setTasks(nextTasks);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [projectId]);

  const progress = taskProgress(tasks);
  const done = tasks.filter((task) => task.isCompleted).length;
  const visible = useMemo(() => {
    const sorted = [...tasks].sort((a, b) => a.date.localeCompare(b.date));
    if (filter === 'open') return sorted.filter((task) => !task.isCompleted);
    if (filter === 'done') return sorted.filter((task) => task.isCompleted);
    return sorted;
  }, [filter, tasks]);

  const persist = async (next: ProgressTask[]) => {
    if (!projectId) return;
    setSaving(true);
    try {
      await updateDoc(
        doc(db, 'projects', projectId),
        withoutUndefined({
          tasks: next.map(toFirestoreTask),
          progress: taskProgress(next),
        })
      );
      tasksRef.current = next;
      setTasks(next);
    } catch (error) {
      console.error('Error saving tasks:', error);
      Alert.alert('Could not save', describeFirestoreError(error));
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const openAdd = (preset?: string) => {
    setEditingId(null);
    setDraft({ description: preset ?? '', date: todayISO(), notes: '' });
    setSheetOpen(true);
  };

  const openEdit = (task: ProgressTask) => {
    setEditingId(task.id);
    setDraft({
      description: task.description,
      date: task.date,
      notes: task.notes ?? task.materials?.map((item) => `${item.name} ${item.quantity}${item.unit}`).join(', ') ?? '',
    });
    setSheetOpen(true);
  };

  const saveTask = async () => {
    if (!draft.description.trim()) {
      Alert.alert(t('progress.addTask'), t('progress.enterTask'));
      return;
    }
    const existing = editingId ? tasks.find((task) => task.id === editingId) : undefined;
    const nextTask: ProgressTask = {
      id: editingId ?? `${Date.now()}`,
      description: draft.description.trim(),
      date: draft.date,
      isCompleted: existing?.isCompleted ?? false,
    };
    if (draft.notes.trim()) nextTask.notes = draft.notes.trim();
    if (existing?.imageUrl) nextTask.imageUrl = existing.imageUrl;
    const next = editingId
      ? tasks.map((task) => (task.id === editingId ? nextTask : task))
      : [...tasks, nextTask];
    try {
      await persist(next);
      setSheetOpen(false);
    } catch {
      // alert shown
    }
  };

  const toggle = (taskId: string) => {
    const next = tasks.map((task) =>
      task.id === taskId ? { ...task, isCompleted: !task.isCompleted } : task
    );
    void persist(next);
  };

  const remove = (task: ProgressTask) => {
    Alert.alert(t('progress.removeTask'), task.description, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.remove'),
        style: 'destructive',
        onPress: () => void persist(tasks.filter((item) => item.id !== task.id)),
      },
    ]);
  };

  const pickPhoto = async (taskId: string) => {
    if (!projectId) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.photos'), t('progress.photoAccess'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });
    if (result.canceled) return;

    setUploadingId(taskId);
    try {
      const imageUrl = await uploadJpegToStorage(
        `projects/${projectId}/tasks/${taskId}.jpg`,
        result.assets[0]
      );
      const next = tasksRef.current.map((task) =>
        task.id === taskId ? { ...task, imageUrl } : task
      );
      await persist(next);
    } catch (error) {
      console.error('Error uploading task image:', error);
      Alert.alert(t('progress.uploadFail'), describeStorageError(error));
    } finally {
      setUploadingId(null);
    }
  };

  const shareProgress = async () => {
    const lines = [...tasks]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((task) => `${task.isCompleted ? '✓' : '○'} ${formatTaskDate(task.date)} — ${task.description}`)
      .join('\n');
    try {
      await Share.share({
        title: `${name} progress`,
        message: `${name}\n${progress}% complete (${done}/${tasks.length} tasks)\n\n${lines || 'No tasks yet.'}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={name}
        subtitle={t('progress.complete', { pct: progress })}
        onBack={() => router.back()}
        right={
          <Pressable onPress={() => void shareProgress()} style={styles.shareBtn} accessibilityLabel={t('progress.shareLabel')}>
            <Ionicons name="share-outline" size={18} color={Connex.ink} />
          </Pressable>
        }
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Connex.accent} />
        </View>
      ) : (
        <>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 110 }]}
          >
            <View style={styles.hero}>
              <Text style={styles.heroLabel}>{t('progress.siteProgress')}</Text>
              <Text style={styles.heroTotal}>{progress}%</Text>
              <Text style={styles.heroMeta}>
                {t('progress.doneOf', { done, total: tasks.length })}
              </Text>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${progress}%` }]} />
              </View>
            </View>

            <Text style={styles.section}>{t('progress.stages')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stages}>
              {SITE_STAGES.map((stage) => (
                <Pressable key={stage} style={styles.stage} onPress={() => openAdd(tLabel(stage))}>
                  <Text style={styles.stageText}>{tLabel(stage)}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.filters}>
              {([
                ['all', t('common.all')],
                ['open', t('common.open')],
                ['done', t('common.done')],
              ] as const).map(([key, label]) => (
                <Pressable
                  key={key}
                  style={[styles.filter, filter === key && styles.filterOn]}
                  onPress={() => setFilter(key)}
                >
                  <Text style={[styles.filterText, filter === key && styles.filterTextOn]}>{label}</Text>
                </Pressable>
              ))}
            </View>

            {visible.length === 0 ? (
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="checkbox-outline" size={26} color={Connex.accent} />
                </View>
                <Text style={styles.emptyTitle}>{t('progress.noTasks')}</Text>
                <Text style={styles.emptyCopy}>{t('progress.noTasksCopy')}</Text>
              </View>
            ) : (
              visible.map((task) => (
                <View key={task.id} style={[styles.task, task.isCompleted && styles.taskDone]}>
                  <Pressable style={[styles.check, task.isCompleted && styles.checkOn]} onPress={() => toggle(task.id)}>
                    {task.isCompleted ? (
                      <Ionicons name="checkmark" size={16} color={Connex.surface} />
                    ) : null}
                  </Pressable>
                  <Pressable style={styles.photo} onPress={() => void pickPhoto(task.id)}>
                    {uploadingId === task.id ? (
                      <ActivityIndicator color={Connex.accent} />
                    ) : task.imageUrl ? (
                      <Image
                        source={{ uri: task.imageUrl }}
                        style={styles.photoImg}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        recyclingKey={task.imageUrl}
                      />
                    ) : (
                      <Ionicons name="camera-outline" size={18} color={Connex.muted} />
                    )}
                  </Pressable>
                  <Pressable style={styles.taskCopy} onPress={() => openEdit(task)}>
                    <Text style={styles.taskDate}>{formatTaskDate(task.date)}</Text>
                    <Text style={[styles.taskName, task.isCompleted && styles.taskNameDone]}>{task.description}</Text>
                    {task.notes ? <Text style={styles.taskNotes}>{task.notes}</Text> : null}
                  </Pressable>
                  <Pressable onPress={() => remove(task)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color={Connex.muted} />
                  </Pressable>
                </View>
              ))
            )}
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
            <Pressable style={({ pressed }) => [styles.cta, pressed && styles.pressed]} onPress={() => openAdd()}>
              <Ionicons name="add" size={20} color={Connex.surface} />
              <Text style={styles.ctaText}>{t('progress.addTask')}</Text>
            </Pressable>
          </View>
        </>
      )}

      <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={() => setSheetOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.overlay}
        >
          <Pressable style={styles.dismiss} onPress={() => setSheetOpen(false)} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>{editingId ? t('progress.editTask') : t('progress.addTask')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('progress.whatDone')}
              placeholderTextColor={Connex.muted}
              value={draft.description}
              onChangeText={(text) => setDraft((prev) => ({ ...prev, description: text }))}
            />
            <Pressable style={styles.dateBtn} onPress={() => setShowPicker(true)}>
              <Text style={styles.dateBtnText}>{formatTaskDate(draft.date)}</Text>
              <Ionicons name="calendar-outline" size={18} color={Connex.muted} />
            </Pressable>
            <TextInput
              style={styles.input}
              placeholder={t('progress.notes')}
              placeholderTextColor={Connex.muted}
              value={draft.notes}
              onChangeText={(text) => setDraft((prev) => ({ ...prev, notes: text }))}
            />
            {showPicker ? (
              <DateTimePicker
                value={new Date(`${draft.date}T00:00:00`)}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={(event, date) => {
                  if (Platform.OS !== 'ios') setShowPicker(false);
                  if (event.type === 'dismissed' || !date) return;
                  setDraft((prev) => ({ ...prev, date: date.toISOString().split('T')[0] }));
                }}
              />
            ) : null}
            <View style={styles.actions}>
              <Pressable style={styles.ghost} onPress={() => setSheetOpen(false)}>
                <Text style={styles.ghostText}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable style={styles.solid} onPress={() => void saveTask()} disabled={saving}>
                {saving ? <ActivityIndicator color={Connex.surface} /> : <Text style={styles.solidText}>{t('common.save')}</Text>}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Connex.bg },
  shareBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Connex.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 10 },
  hero: {
    backgroundColor: Connex.ink,
    borderRadius: 20,
    padding: 18,
  },
  heroLabel: { fontSize: 12, fontWeight: '600', color: '#A8A29E' },
  heroTotal: {
    marginTop: 6,
    fontSize: 32,
    fontWeight: '800',
    color: Connex.surface,
    letterSpacing: -0.8,
  },
  heroMeta: { marginTop: 6, fontSize: 13, color: '#D6D3D1' },
  track: {
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
    marginTop: 12,
    overflow: 'hidden',
  },
  fill: { height: 6, backgroundColor: Connex.accent, borderRadius: 999 },
  section: { marginTop: 4, fontSize: 13, fontWeight: '700', color: Connex.muted },
  stages: { gap: 8, paddingBottom: 4 },
  stage: {
    backgroundColor: Connex.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Connex.line,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  stageText: { fontSize: 12, fontWeight: '600', color: Connex.ink },
  filters: { flexDirection: 'row', gap: 8 },
  filter: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Connex.surface,
    borderWidth: 1,
    borderColor: Connex.line,
  },
  filterOn: { backgroundColor: Connex.ink, borderColor: Connex.ink },
  filterText: { fontSize: 13, fontWeight: '600', color: Connex.ink },
  filterTextOn: { color: Connex.surface },
  task: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Connex.surface,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: Connex.line,
  },
  taskDone: { opacity: 0.72 },
  check: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Connex.ink,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkOn: {
    backgroundColor: Connex.ink,
    borderColor: Connex.ink,
  },
  photo: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: Connex.bg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoImg: { width: 72, height: 72 },
  taskCopy: { flex: 1 },
  taskDate: { fontSize: 11, fontWeight: '600', color: Connex.muted },
  taskName: { marginTop: 2, fontSize: 15, fontWeight: '700', color: Connex.ink },
  taskNameDone: { textDecorationLine: 'line-through', color: Connex.muted },
  taskNotes: { marginTop: 2, fontSize: 12, color: Connex.muted },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: Connex.bg,
  },
  cta: {
    height: 54,
    borderRadius: 16,
    backgroundColor: Connex.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaText: { color: Connex.surface, fontSize: 16, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Connex.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Connex.ink },
  emptyCopy: { marginTop: 8, fontSize: 14, lineHeight: 20, color: Connex.muted, textAlign: 'center' },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(28,25,23,0.4)' },
  dismiss: { flex: 1 },
  sheet: {
    backgroundColor: Connex.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Connex.line,
    marginBottom: 16,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: Connex.ink, marginBottom: 12 },
  input: {
    backgroundColor: Connex.bg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Connex.line,
    paddingHorizontal: 14,
    minHeight: 50,
    fontSize: 16,
    color: Connex.ink,
    marginBottom: 10,
  },
  dateBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Connex.bg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Connex.line,
    paddingHorizontal: 14,
    height: 50,
    marginBottom: 10,
  },
  dateBtnText: { fontSize: 15, fontWeight: '600', color: Connex.ink },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  ghost: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: Connex.bg,
    borderWidth: 1,
    borderColor: Connex.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  solid: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: Connex.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostText: { fontWeight: '700', color: Connex.ink },
  solidText: { fontWeight: '700', color: Connex.surface },
  pressed: { opacity: 0.9 },
});
