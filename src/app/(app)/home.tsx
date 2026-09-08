import { useAuth, useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Connex } from '@/constants/theme';
import { LANGUAGES } from '@/i18n/messages';
import { useI18n } from '@/i18n/language-provider';

export default function HomeScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const { t, locale, setLocale } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [menuVisible, setMenuVisible] = useState(false);

  const displayName =
    user?.fullName?.trim() ||
    [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
    user?.username ||
    t('account.guest');
  const email = user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress ?? '';
  const photoUrl = user?.imageUrl;

  const menuItems = [
    {
      id: 1,
      title: t('home.plans'),
      subtitle: t('home.plansSub'),
      icon: 'map-outline' as const,
      tint: '#E8F0F7',
      iconColor: '#2F5D8A',
      href: '/(app)/plans' as Href,
    },
    {
      id: 2,
      title: t('home.interior'),
      subtitle: t('home.interiorSub'),
      icon: 'home-outline' as const,
      tint: '#EAF4EE',
      iconColor: '#3F6F54',
      href: '/(app)/interior-design' as Href,
    },
    {
      id: 3,
      title: t('home.cost'),
      subtitle: t('home.costSub'),
      icon: 'calculator-outline' as const,
      tint: '#F4E4D6',
      iconColor: '#C45C26',
      href: '/(app)/cost-estimation' as Href,
    },
    {
      id: 4,
      title: t('home.budget'),
      subtitle: t('home.budgetSub'),
      icon: 'wallet-outline' as const,
      tint: '#F7EDD8',
      iconColor: '#A16207',
      href: '/(app)/budget-tracking' as Href,
    },
    {
      id: 5,
      title: t('home.progress'),
      subtitle: t('home.progressSub'),
      icon: 'bar-chart-outline' as const,
      tint: '#EEE8F6',
      iconColor: '#6D4B8A',
      href: '/(app)/progress-tracking' as Href,
    },
    {
      id: 6,
      title: t('home.materials'),
      subtitle: t('home.materialsSub'),
      icon: 'cube-outline' as const,
      tint: '#F4E4D6',
      iconColor: '#C45C26',
      href: '/(app)/material-catalog' as Href,
    },
    {
      id: 7,
      title: t('home.suppliers'),
      subtitle: t('home.suppliersSub'),
      icon: 'cash-outline' as const,
      tint: '#E8F0F7',
      iconColor: '#2F5D8A',
      href: '/(app)/cost-catalog' as Href,
    },
  ];

  const handleLogout = async () => {
    try {
      await signOut();
      router.replace('/screens/SignInScreen');
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.brand}>
          <Text style={styles.kicker}>{t('home.workspace')}</Text>
          <Text style={styles.logo}>ConneX</Text>
        </View>
        <Pressable
          onPress={() => setMenuVisible(true)}
          style={({ pressed }) => [styles.profileHit, pressed && styles.pressed]}
          accessibilityLabel={t('account.title')}
        >
          <View style={styles.profileCopy}>
            <Text style={styles.profileName} numberOfLines={1}>
              {t('account.hello', { name: user?.firstName?.trim() || displayName })}
            </Text>
            {email ? (
              <Text style={styles.profileEmail} numberOfLines={1}>
                {email}
              </Text>
            ) : null}
          </View>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={styles.avatarFallback}>
              <Ionicons name="person" size={18} color={Connex.ink} />
            </View>
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>{t('home.what')}</Text>
        <View style={styles.grid}>
          {menuItems.map((item) => (
            <Pressable
              key={item.id}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() => router.push(item.href)}
            >
              <View style={[styles.iconWell, { backgroundColor: item.tint }]}>
                <Ionicons name={item.icon} size={22} color={item.iconColor} />
              </View>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setMenuVisible(false)}>
          <Pressable
            style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.sheetHandle} />
            <View style={styles.profileCard}>
              {photoUrl ? (
                <Image source={{ uri: photoUrl }} style={styles.sheetAvatar} contentFit="cover" />
              ) : (
                <View style={styles.sheetAvatarFallback}>
                  <Ionicons name="person" size={28} color={Connex.accent} />
                </View>
              )}
              <View style={styles.profileCardCopy}>
                <Text style={styles.sheetName}>{displayName}</Text>
                {email ? <Text style={styles.sheetEmail}>{email}</Text> : null}
                <Text style={styles.sheetMeta}>{t('account.signedIn')}</Text>
              </View>
            </View>

            <Text style={styles.sheetTitle}>{t('account.language')}</Text>
            <Text style={styles.sheetHint}>{t('account.languageHint')}</Text>
            <View style={styles.langGrid}>
              {LANGUAGES.map((language) => {
                const active = locale === language.id;
                return (
                  <Pressable
                    key={language.id}
                    style={[styles.langChip, active && styles.langChipOn]}
                    onPress={() => setLocale(language.id)}
                  >
                    <Text style={[styles.langNative, active && styles.langNativeOn]}>{language.native}</Text>
                    <Text style={[styles.langName, active && styles.langNameOn]}>{language.name}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              style={({ pressed }) => [styles.logoutBtn, pressed && styles.pressed]}
              onPress={() => {
                setMenuVisible(false);
                void handleLogout();
              }}
            >
              <Ionicons name="log-out-outline" size={20} color={Connex.danger} />
              <Text style={styles.logoutText}>{t('account.logout')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Connex.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 12,
  },
  brand: {
    flexShrink: 0,
  },
  kicker: {
    fontSize: 13,
    color: Connex.muted,
    fontWeight: '500',
  },
  logo: {
    fontSize: 28,
    fontWeight: '800',
    color: Connex.ink,
    letterSpacing: -0.6,
  },
  profileHit: {
    flex: 1,
    maxWidth: 220,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    backgroundColor: Connex.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Connex.line,
    paddingVertical: 6,
    paddingLeft: 12,
    paddingRight: 6,
  },
  profileCopy: {
    flex: 1,
    alignItems: 'flex-end',
  },
  profileName: {
    fontSize: 13,
    fontWeight: '700',
    color: Connex.ink,
  },
  profileEmail: {
    marginTop: 1,
    fontSize: 11,
    color: Connex.muted,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Connex.accentSoft,
  },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Connex.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Connex.muted,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  card: {
    width: '48.5%',
    backgroundColor: Connex.surface,
    borderRadius: 20,
    padding: 16,
    minHeight: 132,
    borderWidth: 1,
    borderColor: Connex.line,
  },
  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  iconWell: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Connex.ink,
  },
  cardSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: Connex.muted,
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(28, 25, 23, 0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Connex.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Connex.line,
    marginBottom: 16,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Connex.bg,
    borderRadius: 18,
    padding: 14,
    marginBottom: 18,
  },
  sheetAvatar: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: Connex.accentSoft,
  },
  sheetAvatarFallback: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: Connex.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCardCopy: {
    flex: 1,
  },
  sheetName: {
    fontSize: 18,
    fontWeight: '700',
    color: Connex.ink,
  },
  sheetEmail: {
    marginTop: 4,
    fontSize: 13,
    color: Connex.muted,
  },
  sheetMeta: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
    color: Connex.accent,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Connex.ink,
  },
  sheetHint: {
    marginTop: 4,
    marginBottom: 12,
    fontSize: 13,
    lineHeight: 18,
    color: Connex.muted,
  },
  langGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  langChip: {
    width: '31.5%',
    backgroundColor: Connex.bg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Connex.line,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  langChipOn: {
    backgroundColor: Connex.ink,
    borderColor: Connex.ink,
  },
  langNative: {
    fontSize: 14,
    fontWeight: '700',
    color: Connex.ink,
  },
  langNativeOn: {
    color: Connex.surface,
  },
  langName: {
    marginTop: 2,
    fontSize: 11,
    color: Connex.muted,
  },
  langNameOn: {
    color: '#D6D3D1',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FDECEC',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: Connex.danger,
  },
  pressed: {
    opacity: 0.9,
  },
});
