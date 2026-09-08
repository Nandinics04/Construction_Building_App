import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { ScreenHeader } from '@/components/screen-header';
import { Connex } from '@/constants/theme';
import { useI18n } from '@/i18n/language-provider';
import {
  EXPENSE_CATEGORIES,
  budgetStatus,
  inr,
  newExpenseId,
  normalizeExpenses,
  spendByCategory,
  spendTotal,
  type Expense,
} from '@/lib/budget';
import { db, describeFirestoreError } from '@/lib/firebase';

type Project = {
  id: string;
  name: string;
  budget: number;
  expenses: Expense[];
};

const BAR_COLORS = ['#C45C26', '#2F5D8A', '#3F6F54', '#A16207', '#6D4B8A', '#5C534A', '#B45309', '#1D4E89'];

export default function ProjectDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, tLabel } = useI18n();
  const { projectId } = useLocalSearchParams<{ projectId?: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [costOpen, setCostOpen] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ description: '', cost: '', category: 'Other' });
  const [budgetDraft, setBudgetDraft] = useState('');
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, 'projects', projectId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setProject({
          id: snap.id,
          name: data.name,
          budget: Number(data.budget) || 0,
          expenses: normalizeExpenses(data.materials),
        });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [projectId]);

  const spent = spendTotal(project?.expenses ?? []);
  const status = budgetStatus(spent, project?.budget ?? 0);
  const categories = spendByCategory(project?.expenses ?? []);
  const visible = useMemo(() => {
    const list = project?.expenses ?? [];
    if (filter === 'All') return list;
    return list.filter((item) => item.category === filter);
  }, [filter, project?.expenses]);

  const persistExpenses = async (expenses: Expense[], extra?: { budget?: number }) => {
    if (!projectId) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'projects', projectId), {
        materials: expenses,
        ...(extra ?? {}),
      });
    } catch (error) {
      console.error('Error updating project:', error);
      Alert.alert('Could not save', describeFirestoreError(error));
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setDraft({ description: '', cost: '', category: 'Other' });
    setCostOpen(true);
  };

  const openEdit = (item: Expense) => {
    setEditingId(item.id);
    setDraft({
      description: item.description,
      cost: String(item.cost),
      category: item.category,
    });
    setCostOpen(true);
  };

  const closeCost = () => {
    setCostOpen(false);
    setEditingId(null);
  };

  const saveCost = async () => {
    if (!project) return;
    if (!draft.description.trim() || !draft.cost) {
      Alert.alert('Missing details', 'Enter a description and cost.');
      return;
    }
    const cost = Number(draft.cost.replace(/,/g, ''));
    if (!Number.isFinite(cost) || cost < 0) {
      Alert.alert('Invalid cost', 'Enter a valid amount in rupees.');
      return;
    }

    const nextItem: Expense = {
      id: editingId ?? newExpenseId(),
      description: draft.description.trim(),
      cost,
      category: draft.category,
      createdAt: Date.now(),
    };

    const next = editingId
      ? project.expenses.map((item) => (item.id === editingId ? { ...item, ...nextItem, createdAt: item.createdAt } : item))
      : [nextItem, ...project.expenses];

    try {
      await persistExpenses(next);
      closeCost();
    } catch {
      // alert already shown
    }
  };

  const deleteCost = (item: Expense) => {
    if (!project) return;
    Alert.alert('Remove this cost?', item.description, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          void persistExpenses(project.expenses.filter((row) => row.id !== item.id));
        },
      },
    ]);
  };

  const saveBudget = async () => {
    if (!project) return;
    const planned = budgetDraft.trim() ? Number(budgetDraft.replace(/,/g, '')) : 0;
    if (budgetDraft.trim() && (!Number.isFinite(planned) || planned < 0)) {
      Alert.alert('Invalid budget', 'Enter a valid amount, or 0 to clear.');
      return;
    }
    try {
      await persistExpenses(project.expenses, { budget: planned });
      setBudgetOpen(false);
    } catch {
      // alert already shown
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={project?.name ?? 'Project'}
        subtitle={t('budget.vsActual')}
        onBack={() => router.back()}
      />

      {loading || !project ? (
        <View style={styles.center}>
          {loading ? (
            <ActivityIndicator size="large" color={Connex.accent} />
          ) : (
            <>
              <Text style={styles.emptyTitle}>Project not found</Text>
              <Text style={styles.emptyCopy}>Go back and pick a project from the list.</Text>
            </>
          )}
        </View>
      ) : (
        <>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 110 }]}
          >
            <View style={styles.hero}>
              <Text style={styles.heroLabel}>Spent</Text>
              <Text style={styles.heroTotal}>{inr(spent)}</Text>
              {status.hasBudget ? (
                <>
                  <Text style={styles.heroMeta}>
                    Of {inr(project.budget)} · {status.over ? 'Over by' : 'Remaining'}{' '}
                    {inr(Math.abs(status.remaining))} · {status.pct}%
                  </Text>
                  <View style={styles.track}>
                    <View
                      style={[
                        styles.fill,
                        {
                          width: `${Math.min(100, status.pct)}%`,
                          backgroundColor: status.over ? '#F87171' : Connex.accent,
                        },
                      ]}
                    />
                  </View>
                </>
              ) : (
                <Text style={styles.heroMeta}>No planned budget yet. Tap below to set one.</Text>
              )}
              <Pressable style={styles.budgetBtn} onPress={() => {
                setBudgetDraft(project.budget ? String(project.budget) : '');
                setBudgetOpen(true);
              }}>
                <Ionicons name="create-outline" size={16} color={Connex.surface} />
                <Text style={styles.budgetBtnText}>
                  {status.hasBudget ? 'Edit total budget' : 'Set total budget you can spend'}
                </Text>
              </Pressable>
            </View>

            {status.over ? (
              <View style={styles.warn}>
                <Ionicons name="alert-circle" size={18} color={Connex.danger} />
                <Text style={styles.warnText}>This project is over the planned budget.</Text>
              </View>
            ) : null}

            {categories.length > 0 ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Spend by category</Text>
                {categories.map((row, index) => {
                  const pct = spent > 0 ? Math.round((row.amount / spent) * 100) : 0;
                  return (
                    <View key={row.name} style={styles.catRow}>
                      <View style={styles.catHead}>
                        <Text style={styles.catName}>{row.name}</Text>
                        <Text style={styles.catAmt}>{inr(row.amount)}</Text>
                      </View>
                      <View style={styles.catTrack}>
                        <View
                          style={[
                            styles.catFill,
                            { width: `${pct}%`, backgroundColor: BAR_COLORS[index % BAR_COLORS.length] },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : null}

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
              {['All', ...categories.map((row) => row.name)].map((name) => (
                <Pressable
                  key={name}
                  style={[styles.chip, filter === name && styles.chipOn]}
                  onPress={() => setFilter(name)}
                >
                  <Text style={[styles.chipText, filter === name && styles.chipTextOn]}>
                    {name === 'All' ? t('common.all') : tLabel(name)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {visible.length === 0 ? (
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="receipt-outline" size={26} color={Connex.accent} />
                </View>
                <Text style={styles.emptyTitle}>No spend logged</Text>
                <Text style={styles.emptyCopy}>
                  Add costs by category — cement, steel, labour — as work happens.
                </Text>
              </View>
            ) : (
              visible.map((item) => (
                <Pressable
                  key={item.id}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                  onPress={() => openEdit(item)}
                  onLongPress={() => deleteCost(item)}
                >
                  <View style={styles.rowCopy}>
                    <Text style={styles.rowName}>{item.description}</Text>
                    <Text style={styles.rowMeta}>{tLabel(item.category)}</Text>
                  </View>
                  <Text style={styles.rowCost}>{inr(item.cost)}</Text>
                  <Pressable onPress={() => deleteCost(item)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color={Connex.muted} />
                  </Pressable>
                </Pressable>
              ))
            )}
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
            <Pressable style={({ pressed }) => [styles.cta, pressed && styles.pressed]} onPress={openAdd}>
              <Ionicons name="add" size={20} color={Connex.surface} />
              <Text style={styles.ctaText}>Add cost</Text>
            </Pressable>
          </View>
        </>
      )}

      <Modal visible={costOpen} transparent animationType="slide" onRequestClose={closeCost}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <Pressable style={styles.modalDismiss} onPress={closeCost} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>{editingId ? 'Edit cost' : 'Add a cost'}</Text>
            <Text style={styles.sheetCopy}>Category, description, and amount in rupees.</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catChips}>
              {EXPENSE_CATEGORIES.map((name) => (
                <Pressable
                  key={name}
                  style={[styles.chip, draft.category === name && styles.chipOn]}
                  onPress={() => setDraft((prev) => ({ ...prev, category: name }))}
                >
                  <Text style={[styles.chipText, draft.category === name && styles.chipTextOn]}>{tLabel(name)}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <TextInput
              style={styles.input}
              placeholder="e.g. Cement — 50 bags"
              placeholderTextColor={Connex.muted}
              value={draft.description}
              onChangeText={(text) => setDraft((prev) => ({ ...prev, description: text }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Amount (₹)"
              placeholderTextColor={Connex.muted}
              value={draft.cost}
              onChangeText={(text) => setDraft((prev) => ({ ...prev, cost: text }))}
              keyboardType="numeric"
            />

            <View style={styles.sheetActions}>
              <Pressable style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]} onPress={closeCost}>
                <Text style={styles.ghostText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.solidBtn, pressed && styles.pressed]}
                onPress={() => void saveCost()}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color={Connex.surface} /> : <Text style={styles.solidText}>Save</Text>}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={budgetOpen} transparent animationType="slide" onRequestClose={() => setBudgetOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <Pressable style={styles.modalDismiss} onPress={() => setBudgetOpen(false)} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Total budget you can spend</Text>
            <Text style={styles.sheetCopy}>This is the cap for this project. Copy a total from Cost Estimation if you have one.</Text>
            <TextInput
              style={styles.input}
              placeholder="Amount (₹)"
              placeholderTextColor={Connex.muted}
              value={budgetDraft}
              onChangeText={setBudgetDraft}
              keyboardType="numeric"
            />
            <View style={styles.sheetActions}>
              <Pressable
                style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]}
                onPress={() => setBudgetOpen(false)}
              >
                <Text style={styles.ghostText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.solidBtn, pressed && styles.pressed]}
                onPress={() => void saveBudget()}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color={Connex.surface} /> : <Text style={styles.solidText}>Save</Text>}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    gap: 10,
  },
  hero: {
    backgroundColor: Connex.ink,
    borderRadius: 20,
    padding: 18,
    marginBottom: 6,
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A8A29E',
  },
  heroTotal: {
    marginTop: 6,
    fontSize: 28,
    fontWeight: '800',
    color: Connex.surface,
    letterSpacing: -0.6,
  },
  heroMeta: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
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
    borderRadius: 999,
  },
  budgetBtn: {
    marginTop: 14,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  budgetBtnText: {
    color: Connex.surface,
    fontSize: 13,
    fontWeight: '600',
  },
  warn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FDECEC',
    borderRadius: 14,
    padding: 12,
  },
  warnText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: Connex.danger,
  },
  card: {
    backgroundColor: Connex.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Connex.line,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Connex.ink,
    marginBottom: 12,
  },
  catRow: {
    marginBottom: 10,
  },
  catHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  catName: {
    fontSize: 13,
    color: Connex.ink,
    fontWeight: '600',
  },
  catAmt: {
    fontSize: 13,
    fontWeight: '700',
    color: Connex.ink,
  },
  catTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: Connex.bg,
    overflow: 'hidden',
  },
  catFill: {
    height: 6,
    borderRadius: 999,
  },
  filters: {
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    backgroundColor: Connex.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Connex.line,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  chipOn: {
    backgroundColor: Connex.ink,
    borderColor: Connex.ink,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Connex.ink,
  },
  chipTextOn: {
    color: Connex.surface,
  },
  row: {
    backgroundColor: Connex.surface,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Connex.line,
    gap: 10,
  },
  rowCopy: {
    flex: 1,
  },
  rowName: {
    fontSize: 15,
    fontWeight: '600',
    color: Connex.ink,
  },
  rowMeta: {
    marginTop: 3,
    fontSize: 12,
    color: Connex.muted,
  },
  rowCost: {
    fontSize: 15,
    fontWeight: '700',
    color: Connex.ink,
  },
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
  ctaText: {
    color: Connex.surface,
    fontSize: 16,
    fontWeight: '700',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(28, 25, 23, 0.4)',
  },
  modalDismiss: {
    flex: 1,
  },
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
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Connex.ink,
  },
  sheetCopy: {
    marginTop: 4,
    marginBottom: 16,
    fontSize: 13,
    color: Connex.muted,
  },
  catChips: {
    marginBottom: 12,
  },
  input: {
    backgroundColor: Connex.bg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Connex.line,
    paddingHorizontal: 14,
    height: 50,
    fontSize: 16,
    color: Connex.ink,
    marginBottom: 10,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  ghostBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: Connex.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Connex.line,
  },
  solidBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: Connex.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostText: {
    fontSize: 15,
    fontWeight: '700',
    color: Connex.ink,
  },
  solidText: {
    fontSize: 15,
    fontWeight: '700',
    color: Connex.surface,
  },
  pressed: {
    opacity: 0.9,
  },
});
