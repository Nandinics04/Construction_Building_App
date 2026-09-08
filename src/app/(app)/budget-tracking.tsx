import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/expo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { ScreenHeader } from '@/components/screen-header';
import { Connex } from '@/constants/theme';
import { useI18n } from '@/i18n/language-provider';
import { budgetStatus, inr, normalizeExpenses, spendTotal } from '@/lib/budget';
import { db } from '@/lib/firebase';

type Project = {
  id: string;
  name: string;
  createdAt: { toDate?: () => Date; toMillis?: () => number } | null;
  spend: number;
  budget: number;
  itemCount: number;
};

function formatDate(createdAt: Project['createdAt']) {
  const date = createdAt?.toDate?.();
  if (!date) return 'Just added';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function BudgetTrackingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isLoaded } = useUser();
  const { t } = useI18n();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded || !user?.emailAddresses?.[0]?.emailAddress) {
      setLoading(false);
      return;
    }

    const userEmail = user.emailAddresses[0].emailAddress;
    const projectsQuery = query(collection(db, 'projects'), where('userEmail', '==', userEmail));

    const unsubscribe = onSnapshot(
      projectsQuery,
      (snapshot) => {
        const next: Project[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          const expenses = normalizeExpenses(data.materials);
          return {
            id: docSnap.id,
            name: data.name,
            createdAt: data.createdAt ?? null,
            spend: spendTotal(expenses),
            budget: Number(data.budget) || 0,
            itemCount: expenses.length,
          };
        });
        next.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
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

  const totalSpend = projects.reduce((sum, project) => sum + project.spend, 0);
  const totalBudget = projects.reduce((sum, project) => sum + project.budget, 0);
  const overall = budgetStatus(totalSpend, totalBudget);

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t('budget.title')}
        subtitle={t('budget.subtitle')}
        onBack={() => router.back()}
      />

      {!isLoaded || loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Connex.accent} />
          <Text style={styles.centerCopy}>{t('budget.loading')}</Text>
        </View>
      ) : !user ? (
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Ionicons name="person-outline" size={26} color={Connex.accent} />
          </View>
          <Text style={styles.emptyTitle}>{t('common.signInRequired')}</Text>
          <Text style={styles.emptyCopy}>{t('budget.signInCopy')}</Text>
        </View>
      ) : (
        <>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 96 }]}
          >
            <View style={styles.hero}>
              <Text style={styles.heroLabel}>{overall.hasBudget ? t('budget.spentOf') : t('budget.logged')}</Text>
              <Text style={styles.heroTotal}>{inr(totalSpend)}</Text>
              {overall.hasBudget ? (
                <>
                  <Text style={styles.heroMeta}>
                    {t('budget.budgetMeta', {
                      budget: inr(totalBudget),
                      over: overall.over ? t('budget.overBy') : t('budget.left'),
                      left: inr(Math.abs(overall.remaining)),
                    })}
                  </Text>
                  <View style={styles.track}>
                    <View
                      style={[
                        styles.fill,
                        {
                          width: `${Math.min(100, overall.pct)}%`,
                          backgroundColor: overall.over ? '#F87171' : Connex.accent,
                        },
                      ]}
                    />
                  </View>
                </>
              ) : (
                <Text style={styles.heroMeta}>
                  {t('budget.noCapMeta', { count: projects.length })}
                </Text>
              )}
            </View>

            {projects.length === 0 ? (
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="wallet-outline" size={26} color={Connex.accent} />
                </View>
                <Text style={styles.emptyTitle}>{t('budget.none')}</Text>
                <Text style={styles.emptyCopy}>{t('budget.noneCopy')}</Text>
              </View>
            ) : (
              projects.map((project) => {
                const status = budgetStatus(project.spend, project.budget);
                return (
                  <Pressable
                    key={project.id}
                    style={({ pressed }) => [styles.card, pressed && styles.pressed]}
                    onPress={() =>
                      router.push({
                        pathname: '/(app)/project-details',
                        params: { projectId: project.id },
                      })
                    }
                  >
                    <View style={styles.iconWell}>
                      <Ionicons name="folder-outline" size={20} color={Connex.accent} />
                    </View>
                    <View style={styles.copy}>
                      <Text style={styles.projectName}>{project.name}</Text>
                      <Text style={styles.projectMeta}>
                        {formatDate(project.createdAt)} · {t('budget.items', { count: project.itemCount })}
                      </Text>
                      {status.hasBudget ? (
                        <View style={styles.miniTrack}>
                          <View
                            style={[
                              styles.miniFill,
                              {
                                width: `${Math.min(100, status.pct)}%`,
                                backgroundColor: status.over ? Connex.danger : Connex.accent,
                              },
                            ]}
                          />
                        </View>
                      ) : null}
                    </View>
                    <View style={styles.amounts}>
                      <Text style={styles.spend}>{inr(project.spend)}</Text>
                      {status.hasBudget ? (
                        <Text style={[styles.left, status.over && styles.over]}>
                          {status.over ? t('budget.over') : `${status.pct}%`}
                        </Text>
                      ) : (
                        <Text style={styles.left}>{t('budget.noCap')}</Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={Connex.muted} />
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
            <Pressable
              style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
              onPress={() => router.push('/(app)/add-project')}
            >
              <Ionicons name="add" size={20} color={Connex.surface} />
              <Text style={styles.ctaText}>{t('budget.add')}</Text>
            </Pressable>
          </View>
        </>
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
  card: {
    backgroundColor: Connex.surface,
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Connex.line,
    gap: 12,
  },
  iconWell: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Connex.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
  },
  projectName: {
    fontSize: 16,
    fontWeight: '700',
    color: Connex.ink,
  },
  projectMeta: {
    marginTop: 3,
    fontSize: 12,
    color: Connex.muted,
  },
  miniTrack: {
    height: 4,
    borderRadius: 999,
    backgroundColor: Connex.bg,
    marginTop: 8,
    overflow: 'hidden',
  },
  miniFill: {
    height: 4,
    borderRadius: 999,
  },
  amounts: {
    alignItems: 'flex-end',
  },
  spend: {
    fontSize: 14,
    fontWeight: '700',
    color: Connex.ink,
  },
  left: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '600',
    color: Connex.muted,
  },
  over: {
    color: Connex.danger,
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
  centerCopy: {
    marginTop: 12,
    fontSize: 14,
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
  pressed: {
    opacity: 0.9,
  },
});
