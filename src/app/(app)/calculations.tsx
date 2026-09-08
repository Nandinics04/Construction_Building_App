import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/screen-header';
import { Connex } from '@/constants/theme';
import { useI18n } from '@/i18n/language-provider';
import {
  estimateCost,
  inr,
  type ConstructionTypeId,
  type FinishLevel,
} from '@/lib/cost-estimate';

const BAR_COLORS = [
  '#C45C26',
  '#2F5D8A',
  '#3F6F54',
  '#A16207',
  '#6D4B8A',
  '#5C534A',
  '#B45309',
  '#1D4E89',
  '#44403C',
];

export default function CalculationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, tLabel } = useI18n();
  const { cityId, typeId, finish, area } = useLocalSearchParams<{
    cityId?: string;
    typeId?: string;
    finish?: string;
    area?: string;
  }>();

  const estimate = estimateCost({
    cityId: cityId ?? 'hyderabad',
    typeId: (typeId as ConstructionTypeId) || 'rcc',
    finish: (finish as FinishLevel) || 'standard',
    areaSqFt: Number(area) || 0,
  });

  const materialPct = estimate.materials.reduce((sum, row) => sum + row.percentage, 0);
  const materialAmt = estimate.materials.reduce((sum, row) => sum + row.amount, 0);

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t('cost.breakdown')}
        subtitle={t('cost.breakdownSub', { city: estimate.cityName, area: estimate.areaSqFt.toLocaleString('en-IN') })}
        onBack={() => router.back()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
      >
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>{t('cost.indicativeTotal')}</Text>
          <Text style={styles.heroTotal}>{inr(estimate.total)}</Text>
          <Text style={styles.heroMeta}>
            {inr(estimate.ratePerSqFt)} / {t('cost.sqft')} · {tLabel(estimate.typeName)} · {tLabel(estimate.finishLabel)}
          </Text>
          <Text style={styles.heroFormula}>
            {t('cost.formula', {
              area: estimate.areaSqFt.toLocaleString('en-IN'),
              rate: inr(estimate.ratePerSqFt),
              pct: estimate.contingencyPct,
            })}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('cost.split')}</Text>
          <View style={styles.bar}>
            {estimate.lines.map((line, index) => (
              <View
                key={line.name}
                style={[
                  styles.barSeg,
                  {
                    flex: line.percentage,
                    backgroundColor: BAR_COLORS[index % BAR_COLORS.length],
                  },
                ]}
              />
            ))}
          </View>
          {estimate.lines.map((line, index) => (
            <View key={line.name} style={styles.line}>
              <View style={[styles.dot, { backgroundColor: BAR_COLORS[index % BAR_COLORS.length] }]} />
              <Text style={styles.lineName}>{tLabel(line.name)}</Text>
              <Text style={styles.linePct}>{line.percentage}%</Text>
              <Text style={styles.lineAmt}>{inr(line.amount)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Materials & site work</Text>
            <Text style={styles.summaryValue}>
              {materialPct}% · {inr(materialAmt)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{tLabel(estimate.labour.name)}</Text>
            <Text style={styles.summaryValue}>
              {estimate.labour.percentage}% · {inr(estimate.labour.amount)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{tLabel(estimate.professional.name)}</Text>
            <Text style={styles.summaryValue}>
              {estimate.professional.percentage}% · {inr(estimate.professional.amount)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Contingency</Text>
            <Text style={styles.summaryValue}>
              {estimate.contingencyPct}% · {inr(estimate.contingency)}
            </Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryTotal]}>
            <Text style={styles.totalLabel}>Total construction cost</Text>
            <Text style={styles.totalValue}>{inr(estimate.total)}</Text>
          </View>
        </View>

        <View style={styles.note}>
          <Text style={styles.noteTitle}>Planning figure only</Text>
          <Text style={styles.noteCopy}>
            City rates follow 2026 India turnkey RCC bands. Load-bearing is about 12% lower, prefab
            about 10% lower, and industrial / PEB about 20% lower than RCC. Soil, design, and
            contractor quotes will change the number. Land, statutory fees, lifts, and GST are
            excluded.
          </Text>
        </View>
      </ScrollView>
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
    padding: 20,
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
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: Connex.surface,
  },
  heroFormula: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 17,
    color: '#D6D3D1',
  },
  card: {
    backgroundColor: Connex.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: Connex.line,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Connex.ink,
    marginBottom: 14,
  },
  bar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 14,
  },
  barSeg: {
    height: 10,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Connex.line,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  lineName: {
    flex: 1,
    fontSize: 13,
    color: Connex.ink,
  },
  linePct: {
    width: 40,
    fontSize: 12,
    fontWeight: '600',
    color: Connex.muted,
    textAlign: 'right',
  },
  lineAmt: {
    width: 92,
    fontSize: 13,
    fontWeight: '700',
    color: Connex.ink,
    textAlign: 'right',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Connex.line,
  },
  summaryLabel: {
    flex: 1,
    fontSize: 14,
    color: Connex.muted,
    paddingRight: 12,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Connex.ink,
  },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: Connex.ink,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Connex.ink,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Connex.accent,
  },
  note: {
    backgroundColor: Connex.accentSoft,
    borderRadius: 16,
    padding: 16,
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Connex.ink,
  },
  noteCopy: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: Connex.muted,
  },
});
