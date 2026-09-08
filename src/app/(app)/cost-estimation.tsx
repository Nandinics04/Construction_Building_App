import { useMemo, useState } from 'react';
import {
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
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/screen-header';
import { Connex } from '@/constants/theme';
import { useI18n } from '@/i18n/language-provider';
import {
  CITIES,
  CONSTRUCTION_TYPES,
  FINISH_LEVELS,
  estimateCost,
  inr,
  type ConstructionTypeId,
  type FinishLevel,
} from '@/lib/cost-estimate';

export default function CostEstimationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, tLabel } = useI18n();
  const [typeId, setTypeId] = useState<ConstructionTypeId>('rcc');
  const [finish, setFinish] = useState<FinishLevel>('standard');
  const [area, setArea] = useState('1500');
  const [cityId, setCityId] = useState('hyderabad');
  const [cityQuery, setCityQuery] = useState('');

  const filteredCities = useMemo(() => {
    const q = cityQuery.trim().toLowerCase();
    if (!q) return CITIES;
    return CITIES.filter(
      (city) =>
        city.name.toLowerCase().includes(q) || city.state.toLowerCase().includes(q)
    );
  }, [cityQuery]);

  const areaSqFt = Number(area.replace(/[^0-9.]/g, ''));
  const preview =
    Number.isFinite(areaSqFt) && areaSqFt > 0
      ? estimateCost({ cityId, typeId, finish, areaSqFt })
      : null;

  const handleCalculate = () => {
    if (!Number.isFinite(areaSqFt) || areaSqFt < 200) {
      Alert.alert(t('cost.areaAlert'), t('cost.areaAlertCopy'));
      return;
    }
    router.push({
      pathname: '/(app)/calculations',
      params: {
        cityId,
        typeId,
        finish,
        area: String(areaSqFt),
      },
    });
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t('cost.title')}
        subtitle={t('cost.subtitle')}
        onBack={() => router.back()}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
        >
          <View style={styles.intro}>
            <Text style={styles.kicker}>{t('cost.kicker')}</Text>
            <Text style={styles.introTitle}>{t('cost.intro')}</Text>
            <Text style={styles.introCopy}>{t('cost.copy')}</Text>
          </View>

          <Text style={styles.section}>{t('cost.type')}</Text>
          {CONSTRUCTION_TYPES.map((item) => {
            const selected = typeId === item.id;
            return (
              <Pressable
                key={item.id}
                style={({ pressed }) => [
                  styles.typeCard,
                  selected && styles.typeCardSelected,
                  pressed && styles.pressed,
                ]}
                onPress={() => setTypeId(item.id)}
              >
                <View style={[styles.iconWell, { backgroundColor: selected ? 'rgba(255,255,255,0.12)' : item.tint }]}>
                  <Ionicons name={item.icon} size={20} color={selected ? Connex.surface : item.iconColor} />
                </View>
                <View style={styles.copy}>
                  <Text style={[styles.typeName, selected && styles.typeNameSelected]}>{tLabel(item.name)}</Text>
                  <Text style={[styles.typeBlurb, selected && styles.typeBlurbSelected]}>{item.blurb}</Text>
                </View>
                <Ionicons
                  name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                  size={20}
                  color={selected ? Connex.surface : Connex.line}
                />
              </Pressable>
            );
          })}

          <Text style={styles.section}>{t('cost.finish')}</Text>
          <View style={styles.chipRow}>
            {FINISH_LEVELS.map((item) => {
              const selected = finish === item.id;
              return (
                <Pressable
                  key={item.id}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => setFinish(item.id)}
                >
                  <Text style={[styles.chipTitle, selected && styles.chipTitleSelected]}>{tLabel(item.name)}</Text>
                  <Text style={[styles.chipBlurb, selected && styles.chipBlurbSelected]}>{item.blurb}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.section}>{t('cost.area')}</Text>
          <View style={styles.areaBox}>
            <TextInput
              style={styles.areaInput}
              value={area}
              onChangeText={setArea}
              keyboardType="numeric"
              placeholder="1500"
              placeholderTextColor={Connex.muted}
            />
            <Text style={styles.areaUnit}>{t('cost.sqft')}</Text>
          </View>

          <Text style={styles.section}>{t('cost.location')}</Text>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={Connex.muted} />
            <TextInput
              style={styles.searchInput}
              value={cityQuery}
              onChangeText={setCityQuery}
              placeholder={t('cost.searchCity')}
              placeholderTextColor={Connex.muted}
            />
          </View>
          <View style={styles.cityList}>
            {filteredCities.map((city) => {
              const selected = cityId === city.id;
              return (
                <Pressable
                  key={city.id}
                  style={[styles.cityRow, selected && styles.cityRowSelected]}
                  onPress={() => setCityId(city.id)}
                >
                  <View>
                    <Text style={[styles.cityName, selected && styles.cityNameSelected]}>{city.name}</Text>
                    <Text style={styles.cityState}>{city.state}</Text>
                  </View>
                  <Text style={[styles.cityRate, selected && styles.cityNameSelected]}>
                    {inr(city[finish])}/sq ft
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {preview ? (
            <View style={styles.preview}>
              <Text style={styles.previewLabel}>{t('cost.indicative')}</Text>
              <Text style={styles.previewRate}>{inr(preview.ratePerSqFt)} / {t('cost.sqft')}</Text>
              <Text style={styles.previewTotal}>
                {t('cost.forArea', { amount: inr(preview.total), area: preview.areaSqFt.toLocaleString('en-IN') })}
              </Text>
              <Text style={styles.previewMeta}>
                {t('cost.previewMeta', {
                  city: preview.cityName,
                  type: tLabel(preview.typeName),
                  finish: tLabel(preview.finishLabel),
                  pct: preview.contingencyPct,
                })}
              </Text>
            </View>
          ) : null}

          <Pressable style={({ pressed }) => [styles.cta, pressed && styles.pressed]} onPress={handleCalculate}>
            <Text style={styles.ctaText}>{t('cost.cta')}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingTop: 4,
    gap: 10,
  },
  intro: {
    backgroundColor: Connex.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: Connex.line,
    marginBottom: 6,
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
  section: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '700',
    color: Connex.muted,
  },
  typeCard: {
    backgroundColor: Connex.surface,
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Connex.line,
    gap: 12,
  },
  typeCardSelected: {
    backgroundColor: Connex.ink,
    borderColor: Connex.ink,
  },
  iconWell: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
  },
  typeName: {
    fontSize: 16,
    fontWeight: '700',
    color: Connex.ink,
  },
  typeNameSelected: {
    color: Connex.surface,
  },
  typeBlurb: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 16,
    color: Connex.muted,
  },
  typeBlurbSelected: {
    color: '#D6D3D1',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flex: 1,
    backgroundColor: Connex.surface,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: Connex.line,
  },
  chipSelected: {
    backgroundColor: Connex.ink,
    borderColor: Connex.ink,
  },
  chipTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Connex.ink,
  },
  chipTitleSelected: {
    color: Connex.surface,
  },
  chipBlurb: {
    marginTop: 2,
    fontSize: 11,
    color: Connex.muted,
  },
  chipBlurbSelected: {
    color: '#D6D3D1',
  },
  areaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Connex.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Connex.line,
    paddingHorizontal: 16,
  },
  areaInput: {
    flex: 1,
    height: 54,
    fontSize: 18,
    fontWeight: '700',
    color: Connex.ink,
  },
  areaUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: Connex.muted,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Connex.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Connex.line,
    paddingHorizontal: 14,
    height: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Connex.ink,
  },
  cityList: {
    gap: 8,
  },
  cityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Connex.surface,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Connex.line,
  },
  cityRowSelected: {
    borderColor: Connex.ink,
    backgroundColor: Connex.accentSoft,
  },
  cityName: {
    fontSize: 15,
    fontWeight: '700',
    color: Connex.ink,
  },
  cityNameSelected: {
    color: Connex.ink,
  },
  cityState: {
    marginTop: 2,
    fontSize: 12,
    color: Connex.muted,
  },
  cityRate: {
    fontSize: 13,
    fontWeight: '700',
    color: Connex.muted,
  },
  preview: {
    marginTop: 8,
    backgroundColor: Connex.ink,
    borderRadius: 20,
    padding: 18,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A8A29E',
  },
  previewRate: {
    marginTop: 6,
    fontSize: 28,
    fontWeight: '800',
    color: Connex.surface,
    letterSpacing: -0.6,
  },
  previewTotal: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: '600',
    color: Connex.surface,
  },
  previewMeta: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 17,
    color: '#D6D3D1',
  },
  cta: {
    marginTop: 4,
    height: 54,
    borderRadius: 16,
    backgroundColor: Connex.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: Connex.surface,
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.9,
  },
});
