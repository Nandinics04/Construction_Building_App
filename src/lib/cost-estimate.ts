export type ConstructionTypeId = 'load_bearing' | 'rcc' | 'prefab' | 'industrial';
export type FinishLevel = 'basic' | 'standard' | 'premium';

export type CityRate = {
  id: string;
  name: string;
  state: string;
  /** Midpoint ₹ / sq ft for turnkey RCC residential (Jun 2026). */
  basic: number;
  standard: number;
  premium: number;
};

export type ConstructionType = {
  id: ConstructionTypeId;
  name: string;
  blurb: string;
  icon: 'home-outline' | 'business-outline' | 'cube-outline' | 'hammer-outline';
  tint: string;
  iconColor: string;
  /** Applied on top of the city RCC rate. */
  multiplier: number;
};

export type CostLine = {
  name: string;
  percentage: number;
  amount: number;
  note?: string;
};

export type CostEstimate = {
  cityName: string;
  typeName: string;
  finishLabel: string;
  areaSqFt: number;
  ratePerSqFt: number;
  baseCost: number;
  contingencyPct: number;
  contingency: number;
  total: number;
  lines: CostLine[];
  materials: CostLine[];
  labour: CostLine;
  professional: CostLine;
};

/**
 * City ₹/sq ft bands from Speak Arch Construction Cost Calculator
 * (Jun 2026), turnkey RCC residential. Not contractor quotes.
 * https://speakarch.com/india-construction-cost-rates-by-city/
 */
export const CITIES: CityRate[] = [
  { id: 'mumbai', name: 'Mumbai / Navi Mumbai', state: 'Maharashtra', basic: 2000, standard: 2500, premium: 3400 },
  { id: 'delhi', name: 'Delhi NCR', state: 'Delhi / NCR', basic: 1800, standard: 2300, premium: 3200 },
  { id: 'bengaluru', name: 'Bengaluru', state: 'Karnataka', basic: 1900, standard: 2400, premium: 3300 },
  { id: 'hyderabad', name: 'Hyderabad', state: 'Telangana', basic: 1700, standard: 2150, premium: 2950 },
  { id: 'chennai', name: 'Chennai', state: 'Tamil Nadu', basic: 1700, standard: 2150, premium: 2900 },
  { id: 'pune', name: 'Pune', state: 'Maharashtra', basic: 1600, standard: 2050, premium: 2750 },
  { id: 'kolkata', name: 'Kolkata', state: 'West Bengal', basic: 1500, standard: 1950, premium: 2600 },
  { id: 'ahmedabad', name: 'Ahmedabad', state: 'Gujarat', basic: 1500, standard: 1900, premium: 2500 },
  { id: 'kochi', name: 'Kochi / Thrissur', state: 'Kerala', basic: 1600, standard: 2050, premium: 2700 },
  { id: 'surat', name: 'Surat', state: 'Gujarat', basic: 1400, standard: 1800, premium: 2350 },
  { id: 'coimbatore', name: 'Coimbatore', state: 'Tamil Nadu', basic: 1400, standard: 1800, premium: 2350 },
  { id: 'jaipur', name: 'Jaipur', state: 'Rajasthan', basic: 1350, standard: 1700, premium: 2250 },
  { id: 'lucknow', name: 'Lucknow', state: 'Uttar Pradesh', basic: 1350, standard: 1700, premium: 2250 },
  { id: 'nagpur', name: 'Nagpur', state: 'Maharashtra', basic: 1350, standard: 1700, premium: 2250 },
  { id: 'vizag', name: 'Visakhapatnam', state: 'Andhra Pradesh', basic: 1350, standard: 1700, premium: 2250 },
  { id: 'vijayawada', name: 'Vijayawada', state: 'Andhra Pradesh', basic: 1300, standard: 1650, premium: 2200 },
  { id: 'warangal', name: 'Warangal', state: 'Telangana', basic: 1250, standard: 1600, premium: 2100 },
  { id: 'indore', name: 'Indore', state: 'Madhya Pradesh', basic: 1250, standard: 1600, premium: 2100 },
  { id: 'bhopal', name: 'Bhopal', state: 'Madhya Pradesh', basic: 1250, standard: 1600, premium: 2100 },
  { id: 'patna', name: 'Patna', state: 'Bihar', basic: 1150, standard: 1500, premium: 1950 },
  { id: 'tier3', name: 'Other / Tier-3 town', state: 'India', basic: 1150, standard: 1500, premium: 2000 },
];

export const CONSTRUCTION_TYPES: ConstructionType[] = [
  {
    id: 'load_bearing',
    name: 'Load-bearing',
    blurb: 'Brick walls carry the load. Best for G+1 homes.',
    icon: 'home-outline',
    tint: '#F7EDD8',
    iconColor: '#A16207',
    multiplier: 0.88,
  },
  {
    id: 'rcc',
    name: 'RCC frame',
    blurb: 'Columns and slabs. Standard for most houses.',
    icon: 'business-outline',
    tint: '#F4E4D6',
    iconColor: '#C45C26',
    multiplier: 1,
  },
  {
    id: 'prefab',
    name: 'Prefab / LGSF',
    blurb: 'Factory panels or light steel. Faster on site.',
    icon: 'cube-outline',
    tint: '#E8F0F7',
    iconColor: '#2F5D8A',
    multiplier: 0.9,
  },
  {
    id: 'industrial',
    name: 'Industrial / PEB',
    blurb: 'Pre-engineered sheds, workshops, warehouses.',
    icon: 'hammer-outline',
    tint: '#EEEAE6',
    iconColor: '#5C534A',
    multiplier: 0.8,
  },
];

export const FINISH_LEVELS: { id: FinishLevel; name: string; blurb: string }[] = [
  { id: 'basic', name: 'Basic', blurb: 'Economy finishes' },
  { id: 'standard', name: 'Standard', blurb: 'Owner-occupied' },
  { id: 'premium', name: 'Premium', blurb: 'High-end fittings' },
];

const CONTINGENCY_PCT = 5;

const SPLITS: Record<ConstructionTypeId, { name: string; pct: number }[]> = {
  load_bearing: [
    { name: 'Cement', pct: 10 },
    { name: 'Steel', pct: 10 },
    { name: 'Sand', pct: 9 },
    { name: 'Aggregate', pct: 5 },
    { name: 'Bricks / blocks', pct: 16 },
    { name: 'Finishing (tiles, paint, doors)', pct: 14 },
    { name: 'Plumbing & electrical', pct: 10 },
    { name: 'Labour', pct: 21 },
    { name: 'Architect / engineer', pct: 5 },
  ],
  rcc: [
    { name: 'Cement', pct: 12 },
    { name: 'Steel', pct: 18 },
    { name: 'Sand', pct: 8 },
    { name: 'Aggregate', pct: 5 },
    { name: 'Bricks / blocks', pct: 8 },
    { name: 'Finishing (tiles, paint, doors)', pct: 14 },
    { name: 'Plumbing & electrical', pct: 10 },
    { name: 'Labour', pct: 20 },
    { name: 'Architect / engineer', pct: 5 },
  ],
  prefab: [
    { name: 'Cement / foundation', pct: 6 },
    { name: 'Steel / light frame', pct: 16 },
    { name: 'Sand', pct: 4 },
    { name: 'Aggregate', pct: 3 },
    { name: 'Factory panels / modules', pct: 22 },
    { name: 'Finishing (tiles, paint, doors)', pct: 12 },
    { name: 'Plumbing & electrical', pct: 10 },
    { name: 'Labour / erection', pct: 18 },
    { name: 'Architect / engineer', pct: 5 },
  ],
  industrial: [
    { name: 'Cement / foundation', pct: 6 },
    { name: 'Steel structure', pct: 28 },
    { name: 'Sand', pct: 4 },
    { name: 'Aggregate', pct: 4 },
    { name: 'Cladding & roofing', pct: 18 },
    { name: 'Finishing', pct: 8 },
    { name: 'Plumbing & electrical', pct: 10 },
    { name: 'Labour / erection', pct: 17 },
    { name: 'Architect / engineer', pct: 5 },
  ],
};

export function inr(amount: number) {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export function getCity(id: string) {
  return CITIES.find((city) => city.id === id) ?? CITIES[CITIES.length - 1];
}

export function getConstructionType(id: string) {
  return CONSTRUCTION_TYPES.find((type) => type.id === id) ?? CONSTRUCTION_TYPES[1];
}

export function finishRate(city: CityRate, finish: FinishLevel) {
  return city[finish];
}

export function estimateCost(input: {
  cityId: string;
  typeId: ConstructionTypeId;
  finish: FinishLevel;
  areaSqFt: number;
}): CostEstimate {
  const city = getCity(input.cityId);
  const type = getConstructionType(input.typeId);
  const finish = FINISH_LEVELS.find((item) => item.id === input.finish) ?? FINISH_LEVELS[1];
  const areaSqFt = Math.max(0, input.areaSqFt);
  const ratePerSqFt = Math.round(finishRate(city, input.finish) * type.multiplier);
  const baseCost = ratePerSqFt * areaSqFt;
  const contingency = Math.round(baseCost * (CONTINGENCY_PCT / 100));
  const total = baseCost + contingency;

  const lines = SPLITS[type.id].map((row) => ({
    name: row.name,
    percentage: row.pct,
    amount: Math.round(baseCost * (row.pct / 100)),
  }));

  const labour = lines.find((row) => row.name.toLowerCase().includes('labour')) ?? lines[lines.length - 2];
  const professional = lines.find((row) => row.name.toLowerCase().includes('engineer')) ?? lines[lines.length - 1];
  const materials = lines.filter((row) => row !== labour && row !== professional);

  return {
    cityName: city.name,
    typeName: type.name,
    finishLabel: finish.name,
    areaSqFt,
    ratePerSqFt,
    baseCost,
    contingencyPct: CONTINGENCY_PCT,
    contingency,
    total,
    lines,
    materials,
    labour,
    professional,
  };
}
