export type SeedPriceOption = {
  packaging: string;
  price: number;
  quantity: number;
};

export type SeedGrowingDifficulty = 'easy' | 'medium' | 'hard';

export type SeedSowingPeriod = {
  start: string;
  end: string;
  method?: 'seedling' | 'direct';
  sameYearFlowering?: boolean;
  recommended?: boolean;
  difficulty?: string;
  description?: string;
};

export type SeedColor = {
  name: string;
  hex: string;
};

export type SeedImage = {
  url: string;
  date?: string;
  shortDescription?: string;
  description?: string;
};

export type Seed = {
  id: string;
  name: string;
  latin?: string;
  variety?: string;
  commonNames?: string[];
  commonNamesEng?: string[];
  colors?: SeedColor[][];
  family?: string;
  subfamily?: string;
  tribe?: string;
  genus?: string;
  tags?: string[];
  secondaryTags?: string[];
  category: string;
  shortDescription?: string;
  description?: string;
  height?: string;
  diameter?: string;
  frostHardiness?: string;
  springFrostTolerance?: string;
  autumnFrostTolerance?: string;
  varietalPurity?: string;
  vaseLife?: string;
  cutHarvest?: string;
  seedHarvestAdvice?: string;
  daysToMature?: string;
  floweringStart?: string;
  floweringEnd?: string;
  sowingPeriods?: SeedSowingPeriod[];
  lighting?: string;
  priceOptions: SeedPriceOption[];
  images?: SeedImage[];
  featured?: boolean;
  lowStock?: boolean;
  topSelling?: boolean;
  growingDifficulty?: SeedGrowingDifficulty;
};

export const getSeedGrowingDifficulty = (seed: Seed): SeedGrowingDifficulty =>
  seed.growingDifficulty ?? 'easy';

export const seedGrowingDifficultyLabels: Record<SeedGrowingDifficulty, string> = {
  easy: 'Легкий',
  medium: 'Середній',
  hard: 'Складний'
};

export const getSeedCutHarvest = (seed: Seed): string => seed.cutHarvest?.trim() ?? '';

export const getSeedTags = (seed: Seed): string[] => {
  if (!Array.isArray(seed.tags)) return [];
  return [...new Set(seed.tags
    .filter((tag): tag is string => typeof tag === 'string')
    .map(tag => tag.trim())
    .filter(Boolean))];
};

export const getSeedSecondaryTags = (seed: Seed): string[] => {
  if (!Array.isArray(seed.secondaryTags)) return [];
  return [...new Set(seed.secondaryTags
    .filter((tag): tag is string => typeof tag === 'string')
    .map(tag => tag.trim())
    .filter(Boolean))];
};

const floweringMonths = ['січень', 'лютий', 'березень', 'квітень', 'травень', 'червень', 'липень', 'серпень', 'вересень', 'жовтень', 'листопад', 'грудень'];
const floweringDecades = ['перша', 'друга', 'третя'];
const romanDecades = ['I', 'II', 'III'];

const formatDecade = (value: string | undefined, decades: string[]) => {
  if (!value) return '';
  const [month, decade] = value.split('-').map(Number);
  if (!Number.isInteger(month) || !Number.isInteger(decade) || month < 1 || month > 12 || decade < 1 || decade > 3) return value;
  const monthName = floweringMonths[month - 1];
  return `${monthName[0].toLocaleUpperCase('uk')}${monthName.slice(1)} ${decades[decade - 1]} декада`;
};

export const formatFloweringDecade = (value?: string) => formatDecade(value, floweringDecades);
const formatSowingDecade = (value?: string) => formatDecade(value, romanDecades);

export const formatFloweringPeriod = (seed: Seed) => {
  if (!seed.floweringStart) return '';
  const start = formatFloweringDecade(seed.floweringStart);
  const end = seed.floweringEnd?.toLocaleLowerCase('uk') === 'до морозу'
    ? 'до морозу'
    : formatFloweringDecade(seed.floweringEnd);
  return end ? `${start} — ${end}` : start;
};

export const formatSowingPeriods = (seed: Seed) => (seed.sowingPeriods ?? [])
  .filter(period => period.start && period.end)
  .map(period => ({
    interval: `${formatSowingDecade(period.start)} — ${formatSowingDecade(period.end)}`,
    details: [
      period.method === 'seedling' ? 'На розсаду' : period.method === 'direct' ? 'У ґрунт' : '',
      period.sameYearFlowering === undefined
        ? ''
        : period.sameYearFlowering
          ? 'Зацвіте того ж року'
          : 'Не цвістиме у рік посіву',
      period.recommended ? 'Рекомендовано' : '',
      period.difficulty?.trim() ? `Складність: ${period.difficulty.trim()}` : ''
    ].filter(Boolean).join(' · '),
    description: period.description?.trim() ?? ''
  }));

export type SeedTagKind =
  | 'frost-resistant'
  | 'dried-flower'
  | 'self-seeding'
  | 'drought-tolerant'
  | 'heat-loving'
  | 'moisture-loving'
  | 'cold-loving'
  | 'cut-flower'
  | 'first-year-flowering'
  | 'winter-sowing'
  | 'poor-wintering'
  | 'default';

export const getSeedTagKind = (tag: string): SeedTagKind => {
  const normalizedTag = tag.toLocaleLowerCase('uk');
  if (normalizedTag.includes('на зріз')) return 'cut-flower';
  if (normalizedTag.includes('морозостій')) return 'frost-resistant';
  if (normalizedTag.includes('сухоцвіт')) return 'dried-flower';
  if (normalizedTag.includes('самосі')) return 'self-seeding';
  if (normalizedTag.includes('посухостій')) return 'drought-tolerant';
  if (normalizedTag.includes('теплолюб')) return 'heat-loving';
  if (normalizedTag.includes('вологолюб')) return 'moisture-loving';
  if (normalizedTag.includes('холодолюб')) return 'cold-loving';
  if (normalizedTag.includes('цвіте в перший рік')) return 'first-year-flowering';
  if (normalizedTag.includes('дозимовий посів')) return 'winter-sowing';
  if (normalizedTag.includes('погано зимує')) return 'poor-wintering';
  return 'default';
};

export const getSeedPriceOptions = (seed: Seed): SeedPriceOption[] => {
  return seed.priceOptions
    .filter((option): option is SeedPriceOption =>
      !!option &&
      typeof option.packaging === 'string' &&
      option.packaging.trim().length > 0 &&
      typeof option.price === 'number' &&
      Number.isFinite(option.price) &&
      typeof option.quantity === 'number' &&
      Number.isFinite(option.quantity)
    )
    .map(option => ({ ...option, quantity: Math.max(0, option.quantity) }));
};

export const getSeedImageEntries = (seed: Seed): SeedImage[] => {
  return (seed.images ?? [])
    .filter(image => typeof image.url === 'string' && image.url.trim())
    .map(image => ({
      ...image,
      url: image.url.trim()
    }));
};

export const getSeedImages = (seed: Seed): string[] => getSeedImageEntries(seed).map(image => image.url);
