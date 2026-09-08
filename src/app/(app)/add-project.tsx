import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useUser } from '@clerk/expo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ScreenHeader } from '@/components/screen-header';
import { Connex } from '@/constants/theme';
import { useI18n } from '@/i18n/language-provider';
import { db, describeFirestoreError } from '@/lib/firebase';

export default function AddProjectScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isLoaded } = useUser();
  const { t } = useI18n();
  const [projectName, setProjectName] = useState('');
  const [budget, setBudget] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddProject = async () => {
    if (!projectName.trim()) {
      Alert.alert(t('addProject.name'), t('addProject.nameAlert'));
      return;
    }

    const planned = budget.trim() ? Number(budget.replace(/,/g, '')) : 0;
    if (budget.trim() && (!Number.isFinite(planned) || planned < 0)) {
      Alert.alert(t('addProject.budget'), t('addProject.budgetAlert'));
      return;
    }

    const userEmail = user?.emailAddresses?.[0]?.emailAddress;
    if (!userEmail || !user?.id) {
      Alert.alert(t('common.signInRequired'), t('addProject.emailAlert'));
      return;
    }

    setLoading(true);
    try {
      const write = addDoc(collection(db, 'projects'), {
        name: projectName.trim(),
        userEmail,
        createdAt: serverTimestamp(),
        userId: user.id,
        budget: planned,
        materials: [],
      });

      await Promise.race([
        write,
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('timeout')), 15000);
        }),
      ]);

      router.replace('/(app)/budget-tracking');
    } catch (error) {
      console.error('Error adding project:', error);
      Alert.alert(t('addProject.createFail'), describeFirestoreError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('addProject.title')} subtitle={t('addProject.subtitle')} onBack={() => router.back()} />

      {!isLoaded ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Connex.accent} />
        </View>
      ) : !user ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>{t('common.signInRequired')}</Text>
          <Text style={styles.emptyCopy}>{t('addProject.signInCopy')}</Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          >
            <View style={styles.content}>
              <View style={styles.intro}>
                <Text style={styles.kicker}>{t('addProject.kicker')}</Text>
                <Text style={styles.introTitle}>{t('addProject.intro')}</Text>
                <Text style={styles.introCopy}>{t('addProject.copy')}</Text>
              </View>

              <Text style={styles.label}>{t('addProject.name')}</Text>
              <TextInput
                style={styles.input}
                value={projectName}
                onChangeText={setProjectName}
                placeholder={t('addProject.namePlaceholder')}
                placeholderTextColor={Connex.muted}
                autoFocus
              />

              <Text style={styles.label}>{t('addProject.budget')}</Text>
              <TextInput
                style={styles.input}
                value={budget}
                onChangeText={setBudget}
                placeholder="e.g. 3200000"
                placeholderTextColor={Connex.muted}
                keyboardType="numeric"
              />
              <Text style={styles.hint}>This is the cap. Later costs are compared against this number.</Text>

              <Pressable
                style={({ pressed }) => [
                  styles.cta,
                  (!projectName.trim() || loading) && styles.ctaDisabled,
                  pressed && styles.pressed,
                ]}
                onPress={() => void handleAddProject()}
                disabled={loading || !projectName.trim()}
              >
                {loading ? (
                  <ActivityIndicator color={Connex.surface} />
                ) : (
                  <Text style={styles.ctaText}>{t('addProject.create')}</Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Connex.bg,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  intro: {
    backgroundColor: Connex.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: Connex.line,
    marginBottom: 20,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '700',
    color: Connex.accent,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  introTitle: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: '800',
    color: Connex.ink,
    letterSpacing: -0.4,
  },
  introCopy: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: Connex.muted,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: Connex.muted,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Connex.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Connex.line,
    paddingHorizontal: 16,
    height: 54,
    fontSize: 16,
    color: Connex.ink,
    marginBottom: 16,
  },
  hint: {
    marginTop: -8,
    marginBottom: 16,
    fontSize: 12,
    lineHeight: 17,
    color: Connex.muted,
  },
  cta: {
    height: 54,
    borderRadius: 16,
    backgroundColor: Connex.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  ctaDisabled: {
    opacity: 0.4,
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
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Connex.ink,
  },
  emptyCopy: {
    marginTop: 8,
    fontSize: 14,
    color: Connex.muted,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.9,
  },
});
