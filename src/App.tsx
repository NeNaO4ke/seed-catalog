import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Plus, Flower2, Pencil, Trash2, X, Sprout, Tag, ImagePlus, ChevronRight, Palette, Copy, ShoppingCart, Cloud, HardDrive, CalendarDays, ArrowUp, ArrowDown, Share2 } from 'lucide-react';
import SeedDetails from './components/SeedDetails';
import SeedTagIcon from './components/SeedTagIcon';
import AddToCartDialog from './components/AddToCartDialog';
import CartDialog from './components/CartDialog';
import ImportExportMenu, { parseSeedsCsv } from './components/ImportExportMenu';
import CatalogModeDialog, { type CatalogMode } from './components/CatalogModeDialog';
import ShareDialog from './components/ShareDialog';
import { formatFloweringPeriod, formatSowingPeriods, getSeedCutHarvest, getSeedGrowingDifficulty, getSeedImageEntries, getSeedImages, getSeedPriceOptions, getSeedSecondaryTags, getSeedTagKind, getSeedTags, seedGrowingDifficultyLabels, type Seed, type SeedColor, type SeedGrowingDifficulty } from './types/seed';
import { getCartQuantity, type CartLine } from './types/cart';
import type { AppConfig } from './types/appConfig';

const initialSeeds: Seed[] = [
  { id: crypto.randomUUID(), name: 'Целозія гребінчаста', latin: 'Celosia argentea', variety: 'Багіра', category: 'Однорічники', priceOptions: [{ packaging: 'пакет', price: 25, quantity: 18 }], description: 'Насичене темно-бордове суцвіття. Для зрізки та сухих букетів.', featured: true },
  { id: crypto.randomUUID(), name: 'Гіпсофіла волотиста', latin: 'Gypsophila paniculata', variety: 'Snowflake', category: 'Багаторічники', priceOptions: [{ packaging: 'пакет', price: 30, quantity: 12 }], description: 'Повітряні білі суцвіття, гарно доповнює букети.' },
  { id: crypto.randomUUID(), name: 'Кермек виїмчастий', latin: 'Limonium sinuatum', variety: 'Pastel mix', category: 'Сухоцвіти', priceOptions: [{ packaging: 'пакет', price: 28, quantity: 20 }], description: 'Добре зберігає колір після сушіння.' },
  { id: crypto.randomUUID(), name: 'Аммі велика', latin: 'Ammi majus', category: 'Наповнювачі', priceOptions: [{ packaging: 'пакет', price: 22, quantity: 15 }], description: 'Ажурна зелень і мереживні білі суцвіття для букетів.' },
  { id: crypto.randomUUID(), name: 'Скабіоза', latin: 'Scabiosa atropurpurea', variety: 'Purple', category: 'Однорічники', priceOptions: [{ packaging: 'пакет', price: 35, quantity: 8 }], description: 'Фіолетові квіти на довгих квітконосах.' },
  { id: crypto.randomUUID(), name: 'Лагурус яйцеподібний', latin: 'Lagurus ovatus', category: 'Декоративні трави', priceOptions: [{ packaging: 'пакет', price: 24, quantity: 25 }], description: 'Пухнасті колоски для сухих і свіжих композицій.' },
];

const emptySeed = (category: string): Seed => ({ id: crypto.randomUUID(), name: '', latin: '', variety: '', category, shortDescription: '', description: '', priceOptions: [{ packaging: 'пакет', price: 0, quantity: 0 }], images: [{ url: '' }], featured: false, growingDifficulty: 'easy' });
const months = ['січень', 'лютий', 'березень', 'квітень', 'травень', 'червень', 'липень', 'серпень', 'вересень', 'жовтень', 'листопад', 'грудень'];
const decadeLabels = ['1-ша', '2-га', '3-тя'];
const floweringDecades = months.flatMap((month, monthIndex) =>
  [1, 2, 3].map(decade => ({
    value: `${monthIndex + 1}-${decade}`,
    label: `${month}, ${decadeLabels[decade - 1]} декада`
  }))
);
const money = (n: number) => new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'UAH', maximumFractionDigits: 2 }).format(n);
const taxonomyFields = [
  { key: 'family', label: 'Родина' },
  { key: 'subfamily', label: 'Підродина' },
  { key: 'tribe', label: 'Триба' },
  { key: 'genus', label: 'Рід' },
] as const;
type TaxonomyField = typeof taxonomyFields[number]['key'];
const colorThemes = [
  { id: 'sage', label: 'Шавлія' },
  { id: 'blossom', label: 'Пелюстки' },
  { id: 'ocean', label: 'Океан' },
  { id: 'sunrise', label: 'Сонячна' },
  { id: 'dark', label: 'Темна' },
] as const;
type ColorTheme = typeof colorThemes[number]['id'];

const isColorTheme = (value: string | null): value is ColorTheme =>
  colorThemes.some(theme => theme.id === value);

const readCart = (): CartLine[] => {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem('flower-seeds-cart-v1') ?? '[]');
    if (!Array.isArray(stored)) return [];
    return stored.filter((line): line is CartLine =>
      !!line &&
      typeof line.seedId === 'string' &&
      typeof line.packaging === 'string' &&
      Number.isInteger(line.quantity) &&
      line.quantity > 0
    );
  } catch {
    return [];
  }
};

const reconcileCart = (lines: CartLine[], catalog: Seed[]): CartLine[] => {
  const reconciled: CartLine[] = [];
  lines.forEach(line => {
    const seed = catalog.find(item => item.id === line.seedId);
    const option = seed && getSeedPriceOptions(seed).find(item => item.packaging === line.packaging);
    if (!seed || !option) return;
    const existing = reconciled.find(item => item.seedId === line.seedId && item.packaging === line.packaging);
    const quantity = Math.min(option.quantity, line.quantity + (existing?.quantity ?? 0));
    if (existing) existing.quantity = quantity;
    else if (quantity > 0) reconciled.push({ ...line, quantity });
  });
  return reconciled.filter(line => line.quantity > 0);
};

export default function App({ config }: { config: AppConfig }) {
  const [mode, setMode] = useState<CatalogMode>(() => {
    try {
      return localStorage.getItem('flower-seeds-mode') === 'online' ? 'online' : 'local';
    } catch {
      return 'online';
    }
  });
  const [seeds, setSeeds] = useState<Seed[]>(() => {
    try {
      if (localStorage.getItem('flower-seeds-mode') === 'online') return [];
      const saved = localStorage.getItem('flower-seeds-v1');
      return saved ? JSON.parse(saved) as Seed[] : initialSeeds;
    }
    catch { return initialSeeds; }
  });
  const [cartLines, setCartLines] = useState<CartLine[]>(() => reconcileCart(readCart(), seeds));
  const [query, setQuery] = useState('');
  const [colorTheme, setColorTheme] = useState<ColorTheme>(() => {
    try {
      const savedTheme = localStorage.getItem('flower-seeds-theme');
      return isColorTheme(savedTheme) ? savedTheme : 'sage';
    } catch {
      return 'sage';
    }
  });
  const [category, setCategory] = useState('Усі категорії');
  const [growingDifficultyFilter, setGrowingDifficultyFilter] = useState<SeedGrowingDifficulty | ''>('');
  const [taxonomyFilters, setTaxonomyFilters] = useState({ family: '', subfamily: '', tribe: '', genus: '' });
  const [tagFilter, setTagFilter] = useState('');
  const [showSowingPeriods, setShowSowingPeriods] = useState(() => {
    try {
      return localStorage.getItem('flower-seeds-show-sowing-periods') === 'true';
    } catch {
      return false;
    }
  });
  const [showFloweringPeriod, setShowFloweringPeriod] = useState(() => {
    try {
      return localStorage.getItem('flower-seeds-show-flowering-period') === 'true';
    } catch {
      return false;
    }
  });
  const [tagInput, setTagInput] = useState('');
  const [secondaryTagInput, setSecondaryTagInput] = useState('');
  const [colorDraft, setColorDraft] = useState<{ groupIndex: number; name: string; hex: string } | null>(null);
  const [editing, setEditing] = useState<Seed | null>(null);
  const [viewing, setViewing] = useState<Seed | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [addToCartTarget, setAddToCartTarget] = useState<{ seed: Seed; optionIndex: number } | null>(null);
  const [notice, setNotice] = useState('');
  const [showModeDialog, setShowModeDialog] = useState(false);
  const [modeLoading, setModeLoading] = useState(() => mode === 'online');
  const [modeError, setModeError] = useState('');
  const [expandedImage, setExpandedImage] = useState<{ seedId: string; height: number } | null>(null);
  const imageHoverTimer = useRef<number | null>(null);

  const startImageExpandTimer = (seedId: string, button: HTMLButtonElement) => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (imageHoverTimer.current !== null) window.clearTimeout(imageHoverTimer.current);
    imageHoverTimer.current = window.setTimeout(() => {
      const card = button.closest('.seed-card');
      const priceSection = card?.querySelector('.card-bottom');
      if (!card || !priceSection) return;
      const expandedHeight = priceSection.getBoundingClientRect().top - button.getBoundingClientRect().top;
      setExpandedImage({ seedId, height: Math.max(button.getBoundingClientRect().height, expandedHeight) });
      imageHoverTimer.current = null;
    }, 400);
  };

  const stopImageExpandTimer = (seedId: string) => {
    if (imageHoverTimer.current !== null) {
      window.clearTimeout(imageHoverTimer.current);
      imageHoverTimer.current = null;
    }
    setExpandedImage(current => current?.seedId === seedId ? null : current);
  };

  const saveCart = (next: CartLine[]) => {
    setCartLines(next);
    localStorage.setItem('flower-seeds-cart-v1', JSON.stringify(next));
  };
  const saveSeeds = (next: Seed[]) => {
    if (mode !== 'local') return;
    setSeeds(next);
    localStorage.setItem('flower-seeds-v1', JSON.stringify(next));
    saveCart(reconcileCart(cartLines, next));
  };
  const loadOnlineCatalog = async () => {
    setModeLoading(true);
    setModeError('');
    try {
      const response = await fetch(config.onlineCatalogCsvUrl);
      if (!response.ok) {
        throw new Error(`Сервер відповів зі статусом ${response.status}.`);
      }
      const onlineSeeds = parseSeedsCsv(await response.text());
      const nextCart = reconcileCart(readCart(), onlineSeeds);
      localStorage.setItem('flower-seeds-mode', 'online');
      setSeeds(onlineSeeds);
      saveCart(nextCart);
      setMode('online');
      setShowModeDialog(false);
    } catch (error) {
      setModeError(error instanceof Error ? `Не вдалося завантажити онлайн-каталог: ${error.message}` : 'Не вдалося завантажити онлайн-каталог.');
    } finally {
      setModeLoading(false);
    }
  };
  const selectCatalogMode = (nextMode: CatalogMode) => {
    setModeError('');
    if (nextMode === 'online') {
      void loadOnlineCatalog();
      return;
    }
    setShowCart(false);
    setAddToCartTarget(null);
    try {
      const localSeeds = mode === 'online' && seeds.length === 0
        ? (() => {
          const saved = localStorage.getItem('flower-seeds-v1');
          return saved ? JSON.parse(saved) as Seed[] : initialSeeds;
        })()
        : seeds;
      localStorage.setItem('flower-seeds-v1', JSON.stringify(localSeeds));
      localStorage.setItem('flower-seeds-mode', 'local');
      setSeeds(localSeeds);
      saveCart(reconcileCart(readCart(), localSeeds));
      setMode('local');
      setShowModeDialog(false);
    } catch (error) {
      setModeError(error instanceof Error ? `Не вдалося зберегти локальний каталог: ${error.message}` : 'Не вдалося зберегти локальний каталог.');
    }
  };
  useEffect(() => {
    if (mode === 'online') void loadOnlineCatalog();
    // Initial online mode is restored from localStorage; later changes load in selectCatalogMode.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const availableTags = useMemo(() => [...new Set(['Цвіте в перший рік', 'Дозимовий посів', 'Погано зимує', ...seeds.flatMap(seed => [...getSeedTags(seed), ...getSeedSecondaryTags(seed)])])]
    .sort((a, b) => a.localeCompare(b, 'uk')), [seeds]);
  const availableColors = useMemo(() => {
    const colors = seeds.flatMap(seed => seed.colors ?? []).flat();
    const uniqueColors = new Map<string, SeedColor>();
    colors.forEach(color => {
      const key = color.name.trim().toLocaleLowerCase('uk');
      if (key && !uniqueColors.has(key)) uniqueColors.set(key, color);
    });
    return [...uniqueColors.values()].sort((a, b) => a.name.localeCompare(b.name, 'uk'));
  }, [seeds]);
  const visible = useMemo(() => seeds.filter(seed =>
    (category === 'Усі категорії' || seed.category === category) &&
    (!growingDifficultyFilter || getSeedGrowingDifficulty(seed) === growingDifficultyFilter) &&
    taxonomyFields.every(({ key }) => !taxonomyFilters[key] || seed[key]?.trim() === taxonomyFilters[key]) &&
    (!tagFilter || [...getSeedTags(seed), ...getSeedSecondaryTags(seed)].some(tag => tag.toLocaleLowerCase() === tagFilter.toLocaleLowerCase())) &&
    `${seed.name} ${seed.latin ?? ''} ${seed.variety ?? ''} ${(seed.commonNames ?? []).join(' ')} ${(seed.commonNamesEng ?? []).join(' ')} ${(seed.colors ?? []).flat().map(color => color.name).join(' ')} ${seed.family ?? ''} ${seed.subfamily ?? ''} ${seed.tribe ?? ''} ${seed.genus ?? ''} ${seed.shortDescription ?? ''} ${seed.description ?? ''} ${seed.frostHardiness ?? ''} ${seed.springFrostTolerance ?? ''} ${seed.autumnFrostTolerance ?? ''} ${seed.varietalPurity ?? ''} ${seed.vaseLife ?? ''} ${getSeedCutHarvest(seed)} ${seed.seedHarvestAdvice ?? ''} ${seed.daysToMature ?? ''} ${getSeedTags(seed).join(' ')} ${getSeedSecondaryTags(seed).join(' ')}`.toLocaleLowerCase('uk').includes(query.toLocaleLowerCase('uk'))
  ), [seeds, category, growingDifficultyFilter, taxonomyFilters, tagFilter, query]);

  const startAdd = () => { setEditing(emptySeed(config.categories[0])); setTagInput(''); setSecondaryTagInput(''); setColorDraft(null); setShowForm(true); };
  const startEdit = (seed: Seed) => { setEditing({ ...seed, cutHarvest: getSeedCutHarvest(seed), tags: getSeedTags(seed), secondaryTags: getSeedSecondaryTags(seed), priceOptions: getSeedPriceOptions(seed).map(option => ({ ...option })), images: getSeedImageEntries(seed) }); setTagInput(''); setSecondaryTagInput(''); setColorDraft(null); setShowForm(true); };
  const moveEditingPhoto = (from: number, to: number) => {
    if (!editing?.images || from < 0 || from >= editing.images.length || to < 0 || to >= editing.images.length) return;
    const images = [...editing.images];
    [images[from], images[to]] = [images[to], images[from]];
    setEditing({ ...editing, images });
  };
  const addTag = () => {
    if (!editing) return;
    const tag = tagInput.trim().replace(/,+$/, '').trim();
    if (!tag) return;
    const tags = getSeedTags(editing);
    if (!tags.some(existing => existing.toLocaleLowerCase() === tag.toLocaleLowerCase())) {
      setEditing({ ...editing, tags: [...tags, tag] });
    }
    setTagInput('');
  };
  const addSecondaryTag = () => {
    if (!editing) return;
    const tag = secondaryTagInput.trim().replace(/,+$/, '').trim();
    if (!tag) return;
    const tags = getSeedSecondaryTags(editing);
    if (!tags.some(existing => existing.toLocaleLowerCase() === tag.toLocaleLowerCase())) {
      setEditing({ ...editing, secondaryTags: [...tags, tag] });
    }
    setSecondaryTagInput('');
  };
  const addColorGroup = () => {
    if (!editing) return;
    const groupIndex = editing.colors?.length ?? 0;
    setEditing({ ...editing, colors: [...(editing.colors ?? []), []] });
    setColorDraft({ groupIndex, name: '', hex: '#ffffff' });
  };
  const addAtomicColor = () => {
    if (!editing || !colorDraft || !colorDraft.name.trim() || !/^#[\da-f]{6}$/i.test(colorDraft.hex)) return;
    const colors = (editing.colors ?? []).map((group, index) =>
      index === colorDraft.groupIndex ? [...group, { name: colorDraft.name.trim(), hex: colorDraft.hex.toUpperCase() }] : group
    );
    setEditing({ ...editing, colors });
    setColorDraft(null);
  };
  const applySeedTaxonomyFilter = (field: TaxonomyField, seed: Seed) => {
    const fieldIndex = taxonomyFields.findIndex(item => item.key === field);
    setTaxonomyFilters(current => {
      const next = { ...current };
      taxonomyFields.forEach((item, index) => {
        next[item.key] = index <= fieldIndex ? seed[item.key]?.trim() ?? '' : '';
      });
      return next;
    });
    setViewing(null);
  };
  const taxonomyOptions = (fieldIndex: number): string[] => {
    const applicableSeeds = seeds.filter(seed =>
      taxonomyFields.slice(0, fieldIndex).every(({ key }) => !taxonomyFilters[key] || seed[key]?.trim() === taxonomyFilters[key])
    );
    const key = taxonomyFields[fieldIndex].key;
    return [...new Set(applicableSeeds.map(seed => seed[key]?.trim()).filter((value): value is string => !!value))]
      .sort((a, b) => a.localeCompare(b, 'uk'));
  };
  const setTaxonomyFilter = (fieldIndex: number, value: string) => {
    setTaxonomyFilters(current => {
      const next = { ...current, [taxonomyFields[fieldIndex].key]: value };
      taxonomyFields.slice(fieldIndex + 1).forEach(field => { next[field.key] = ''; });
      return next;
    });
  };
  const applyTagFilter = (tag: string) => {
    setTagFilter(tag);
    setViewing(null);
  };
  const clearFilters = () => {
    setCategory('Усі категорії');
    setGrowingDifficultyFilter('');
    setTaxonomyFilters({ family: '', subfamily: '', tribe: '', genus: '' });
    setTagFilter('');
    setQuery('');
  };
  const changeColorTheme = (theme: ColorTheme) => {
    setColorTheme(theme);
    localStorage.setItem('flower-seeds-theme', theme);
  };
  const addCartLine = (seed: Seed, packaging: string, quantity: number) => {
    const currentSeed = seeds.find(item => item.id === seed.id);
    const option = currentSeed && getSeedPriceOptions(currentSeed).find(item => item.packaging === packaging);
    if (!currentSeed || !option) {
      setNotice('Цей варіант фасування більше недоступний');
      window.setTimeout(() => setNotice(''), 2500);
      return;
    }
    const currentQuantity = getCartQuantity(cartLines, currentSeed.id, packaging);
    const amount = Math.min(Math.max(0, Math.floor(quantity)), Math.max(0, option.quantity - currentQuantity));
    if (amount <= 0) {
      setNotice('Недостатньо товару в наявності для цієї кількості');
      window.setTimeout(() => setNotice(''), 2500);
      return;
    }
    const existing = cartLines.find(line => line.seedId === currentSeed.id && line.packaging === packaging);
    const next = existing
      ? cartLines.map(line => line === existing ? { ...line, quantity: line.quantity + amount } : line)
      : [...cartLines, { seedId: currentSeed.id, packaging, quantity: amount }];
    saveCart(next);
    setAddToCartTarget(null);
    setNotice('Додано до кошика');
    window.setTimeout(() => setNotice(''), 2500);
  };
  const setCartQuantity = (seedId: string, packaging: string, quantity: number) => {
    const seed = seeds.find(item => item.id === seedId);
    const option = seed && getSeedPriceOptions(seed).find(item => item.packaging === packaging);
    const maximum = option?.quantity ?? 0;
    const nextQuantity = Number.isFinite(quantity) ? Math.min(Math.floor(quantity), maximum) : 0;
    if (nextQuantity <= 0) {
      saveCart(cartLines.filter(line => line.seedId !== seedId || line.packaging !== packaging));
      return;
    }
    saveCart(cartLines.map(line => line.seedId === seedId && line.packaging === packaging
      ? { ...line, quantity: nextQuantity }
      : line));
  };
  const removeCartLine = (seedId: string, packaging: string) => {
    saveCart(cartLines.filter(line => line.seedId !== seedId || line.packaging !== packaging));
  };
  const cartCount = cartLines.reduce((sum, line) => sum + line.quantity, 0);
  const submit = (e: React.FormEvent) => {
    e.preventDefault(); if (!editing || !editing.name.trim()) return;
    const exists = seeds.some(s => s.id === editing.id);
    const priceOptions = getSeedPriceOptions(editing).map(option => ({ ...option, packaging: option.packaging.trim() }));
    const savedSeed = {
      ...editing,
      priceOptions,
      cutHarvest: editing.cutHarvest?.trim() || undefined,
      colors: editing.colors?.map(group => group.filter(color => color.name.trim() && /^#[\da-f]{6}$/i.test(color.hex))).filter(group => group.length),
      commonNames: editing.commonNames?.map(name => name.trim()).filter(Boolean),
      commonNamesEng: editing.commonNamesEng?.map(name => name.trim()).filter(Boolean),
      images: getSeedImageEntries(editing)
        .map(image => ({ ...image, url: image.url.trim() }))
        .filter(image => image.url),
    };
    saveSeeds(exists ? seeds.map(s => s.id === editing.id ? savedSeed : s) : [savedSeed, ...seeds]);
    setShowForm(false); setEditing(null); setNotice(exists ? 'Зміни збережено' : 'Насіння додано до каталогу');
    window.setTimeout(() => setNotice(''), 2500);
  };
  const duplicateEditing = () => {
    if (!editing || !seeds.some(seed => seed.id === editing.id)) return;
    if (!editing.name.trim()) {
      setNotice('Вкажіть назву позиції перед копіюванням');
      window.setTimeout(() => setNotice(''), 2500);
      return;
    }
    const priceOptions = getSeedPriceOptions(editing).map(option => ({ ...option, packaging: option.packaging.trim() }));
    const duplicate: Seed = {
      ...editing,
      id: crypto.randomUUID(),
      name: `${editing.name.trim()} (копія)`,
      priceOptions,
      colors: editing.colors?.map(group => group.filter(color => color.name.trim() && /^#[\da-f]{6}$/i.test(color.hex))).filter(group => group.length),
      commonNames: editing.commonNames?.map(name => name.trim()).filter(Boolean),
      commonNamesEng: editing.commonNamesEng?.map(name => name.trim()).filter(Boolean),
      tags: getSeedTags(editing),
      images: getSeedImageEntries(editing)
        .map(image => ({ ...image, url: image.url.trim() }))
        .filter(image => image.url)
    };
    saveSeeds([duplicate, ...seeds]);
    setShowForm(false);
    setEditing(null);
    setNotice('Копію позиції створено');
    window.setTimeout(() => setNotice(''), 2500);
  };
  const remove = (seed: Seed, onRemoved?: () => void) => {
    if (window.confirm(`Видалити «${seed.name}» з каталогу?`)) {
      saveSeeds(seeds.filter(s => s.id !== seed.id));
      onRemoved?.();
    }
  };
  return <div className="app-shell" data-theme={colorTheme}>
    <header className="topbar">
      <div className="brand"><div className="brand-icon"><Flower2 size={25} /></div><div><strong>Квіткова комора</strong><span>Насіння квітів</span></div></div>
      <div className="top-actions">
        <button type="button" className="btn btn-light share-trigger" onClick={() => setShowShareDialog(true)} aria-label="Поділитись сайтом">
          <Share2 size={16} />
        </button>
        <label className="theme-picker">
          <Palette size={16} aria-hidden="true" />
          <select value={colorTheme} onChange={e => {
            if (isColorTheme(e.target.value)) changeColorTheme(e.target.value);
          }} aria-label="Тема кольорів">
            {colorThemes.map(theme => <option key={theme.id} value={theme.id}>{theme.label}</option>)}
          </select>
        </label>
        <button type="button" className="btn btn-light mode-trigger" onClick={() => { setModeError(''); setShowModeDialog(true); }}>
          {mode === 'local' ? <HardDrive size={16} /> : <Cloud size={16} />}
          <span>{mode === 'local' ? 'Локально' : 'Онлайн'}</span>
        </button>
        <ImportExportMenu
          seeds={seeds}
          allowImport={mode === 'local'}
          onImport={saveSeeds}
          onNotice={message => {
            setNotice(message);
            window.setTimeout(() => setNotice(''), 2500);
          }}
        />
        {mode === 'online' && <button type="button" className="btn btn-light cart-trigger" onClick={() => setShowCart(true)} aria-label={`Відкрити кошик, ${cartCount} порцій`}>
          <ShoppingCart size={17} /><span className="cart-trigger-label">Кошик</span>{cartCount > 0 && <span className="cart-count">{cartCount}</span>}
        </button>}
        {mode === 'local' && <button className="btn btn-primary" onClick={startAdd}><Plus size={17} /> Додати насіння</button>}
      </div>
    </header>

    {config.banner && (
      <aside className="site-banner">
        {config.banner.linkUrl ? (
          <a href={config.banner.linkUrl} target="_blank" rel="noopener noreferrer">
            {config.banner.imageUrl && <img src={config.banner.imageUrl} alt={config.banner.alt ?? config.banner.text ?? 'Банер Квіткова комора'} />}
            {config.banner.text && <span>{config.banner.text}</span>}
          </a>
        ) : (
          <>
            {config.banner.imageUrl && <img src={config.banner.imageUrl} alt={config.banner.alt ?? config.banner.text ?? 'Банер Квіткова комора'} />}
            {config.banner.text && <span>{config.banner.text}</span>}
          </>
        )}
      </aside>
    )}

    <main>
      <section className="hero">
        <div className="hero-copy"><div className="eyebrow"><Sprout size={15} /> ВАША КОЛЕКЦІЯ КВІТІВ</div>
          <h1>Насіння для<br /><em>квітучих ідей.</em></h1>
          <p>{mode === 'local' ? 'Зручний каталог сортів, цін і залишків — дані зберігаються на цьому пристрої.' : 'Перегляд актуального каталогу насіння з онлайн-таблиці.'}</p>
        </div>
        <div className="hero-art"><div className="sun"></div><div className="stem stem-one"></div><div className="stem stem-two"></div><div className="flower flower-one"><svg className="flower-center flower-center-one" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" /></svg><span className="flower-petals">✿</span></div><div className="flower flower-two"><svg className="flower-center flower-center-two" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" /></svg><span className="flower-petals">✿</span></div><div className="leaf leaf-one"></div><div className="leaf leaf-two"></div><div className="leaf leaf-three"></div></div>
      </section>

      <section className="stats">
        <div className="stat"><span className="stat-icon"><Flower2 size={18} /></span><div><small>Позицій у каталозі</small><strong>{seeds.length}</strong></div></div>
        <div className="stat"><span className="stat-icon"><Tag size={18} /></span><div><small>Категорій</small><strong>{new Set(seeds.map(s => s.category)).size}</strong></div></div>
      </section>

      <div className="catalog-heading">
        <div>
          <h2>Каталог насіння</h2>
        </div>
        <span className="result-count">{visible.length} позицій</span>
      </div>
      <section className="filters">
        <div className="searchbox"><Search size={18} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Знайти квітку, сорт або опис…" /></div>
        <div className="filter-controls">
          <div className="filter-primary-controls">
            <select value={category} onChange={e => setCategory(e.target.value)} aria-label="Фільтр категорій"><option>Усі категорії</option>{config.categories.map(c => <option key={c}>{c}</option>)}</select>
            <select value={tagFilter} onChange={e => setTagFilter(e.target.value)} aria-label="Фільтр тегів">
              <option value="">Усі теги</option>
              {availableTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
            </select>
            <select value={growingDifficultyFilter} onChange={e => setGrowingDifficultyFilter(e.target.value as SeedGrowingDifficulty | '')} aria-label="Фільтр складності вирощування">
              <option value="">Усі рівні складності</option>
              {Object.entries(seedGrowingDifficultyLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            {(category !== 'Усі категорії' || growingDifficultyFilter || Object.values(taxonomyFilters).some(Boolean) || tagFilter || query) &&
              <button type="button" className="clear-filters" onClick={clearFilters}>Очистити фільтри</button>}
          </div>
          <nav className="taxonomy-breadcrumb" aria-label="Фільтр таксономії">
            {taxonomyFields.map(({ key, label }, index) => (
              <div className="taxonomy-breadcrumb-step" key={key}>
                {index > 0 && <ChevronRight className="taxonomy-separator" size={15} aria-hidden="true" />}
                <select
                  value={taxonomyFilters[key]}
                  onChange={e => setTaxonomyFilter(index, e.target.value)}
                  aria-label={`Фільтр: ${label}`}
                >
                  <option value="">Усі: {label.toLocaleLowerCase('uk')}</option>
                  {taxonomyOptions(index).map(value => <option key={value} value={value}>{value}</option>)}
                </select>
              </div>
            ))}
          </nav>
          <div className="period-visibility-controls">
            <label>
              <input
                type="checkbox"
                checked={showSowingPeriods}
                onChange={event => {
                  const checked = event.target.checked;
                  setShowSowingPeriods(checked);
                  localStorage.setItem('flower-seeds-show-sowing-periods', String(checked));
                }}
              />
              <span>Показувати періоди висіву на картках</span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={showFloweringPeriod}
                onChange={event => {
                  const checked = event.target.checked;
                  setShowFloweringPeriod(checked);
                  localStorage.setItem('flower-seeds-show-flowering-period', String(checked));
                }}
              />
              <span>Показувати період цвітіння на картках</span>
            </label>
          </div>
        </div>
      </section>

      {visible.length ? <section className="seed-grid">{visible.map(seed => {
        const coverImage = getSeedImages(seed)[0];
        const priceOptions = getSeedPriceOptions(seed);
        const sowingPeriods = formatSowingPeriods(seed);
        const colorGroups = (seed.colors ?? []).filter(group => group.length > 0);
        const lowestPrice = Math.min(...priceOptions.map(option => option.price));
        const totalQuantity = priceOptions.reduce((sum, option) => sum + option.quantity, 0);
        return <article className="seed-card" key={seed.id}>
          <button
            type="button"
            className={`seed-image-button${expandedImage?.seedId === seed.id ? ' is-expanded' : ''}`}
            onMouseEnter={event => startImageExpandTimer(seed.id, event.currentTarget)}
            onMouseLeave={() => stopImageExpandTimer(seed.id)}
            onClick={() => setViewing(seed)}
            aria-label={`Переглянути ${seed.name}`}
          >
            <div className="seed-image" style={{
              ...(coverImage ? { backgroundImage: `linear-gradient(180deg, transparent 45%, rgba(25,38,26,.24)), url("${coverImage.replaceAll('"', '%22')}")` } : {}),
              ...(expandedImage?.seedId === seed.id ? { height: expandedImage.height } : {})
            }}>
              {!coverImage && <div className={`flower-placeholder p${Math.abs(seed.name.length) % 4}`}><span>✿</span><small>{seed.category}</small></div>}
              {(seed.featured || seed.topSelling) && (
                <span className="seed-image-badges">
                  {seed.featured && <span className="featured">Обране</span>}
                  {seed.topSelling && <span className="top-selling-image">Топ продажів</span>}
                </span>
              )}
              {getSeedImages(seed).length > 1 && <span className="image-count"><ImagePlus size={12} />{getSeedImages(seed).length} фото</span>}
            </div>
          </button>
          {mode === 'local' && <div className="card-actions"><button type="button" title="Редагувати" aria-label={`Редагувати ${seed.name}`} onClick={() => startEdit(seed)}><Pencil size={15} /></button></div>}
          <div className="seed-content"><div className="seed-meta"><span>{seed.category}</span><span className="seed-meta-badges">
            {seed.lowStock && <b className="low-stock">Мало залишилось</b>}
          </span></div>
            <h3>{seed.name}</h3>{(seed.variety || seed.latin || colorGroups.length > 0) && (
              <div className="card-variety-colors">
                {(seed.variety || seed.latin) && <div className="variety">{seed.variety}{seed.variety && seed.latin ? ' · ' : ''}<i>{seed.latin}</i></div>}
                {colorGroups.length > 0 && (
                  <div className="card-color-compositions" aria-label={`${colorGroups.length} композицій кольорів`}>
                    {colorGroups.slice(0, 3).map((group, index) => (
                      <span
                        className="card-color-composition"
                        key={`card-color-${index}`}
                        title={group.map(color => color.name).join(' + ')}
                        aria-label={group.map(color => color.name).join(' + ')}
                      >
                        {group.slice(0, 4).map((color, colorIndex) => (
                          <i key={`${color.name}-${colorIndex}`} style={{ backgroundColor: color.hex }} />
                        ))}
                        {group.length > 4 && <small>+{group.length - 4}</small>}
                      </span>
                    ))}
                    {colorGroups.length > 3 && <span className="card-color-overflow">+{colorGroups.length - 3}</span>}
                  </div>
                )}
              </div>
            )}
            {getSeedTags(seed).length > 0 && (
              <div className="seed-tags">
                {getSeedTags(seed).map(tag => (
                  <button type="button" className={`tag-chip${getSeedTagKind(tag) === 'default' ? '' : ` tag-${getSeedTagKind(tag)}`}`} key={tag} onClick={() => applyTagFilter(tag)}>
                    <SeedTagIcon tag={tag} />{tag}
                  </button>
                ))}
              </div>
            )}
            {seed.shortDescription && <p className="short-description">{seed.shortDescription}</p>}
            {showFloweringPeriod && formatFloweringPeriod(seed) && <div className="card-flowering-period"><Sprout size={13} /> Цвітіння: {formatFloweringPeriod(seed)}</div>}
            {showSowingPeriods && sowingPeriods.length > 0 && (
              <div className="card-sowing-period">
                <Sprout size={13} />
                <span className="card-sowing-period-content">
                  <small>Висів</small>
                  {sowingPeriods.map((period, index) => (
                    <span className="card-sowing-period-entry" key={`${period.interval}-${index}`}>
                      <strong>{period.interval}</strong>
                      {period.details && <small>{period.details}</small>}
                    </span>
                  ))}
                </span>
              </div>
            )}
            <div className="card-bottom">
              <div><strong>{priceOptions.length > 1 ? 'від ' : ''}{money(lowestPrice)}</strong><small>{priceOptions.length === 1 ? ` / ${priceOptions[0].packaging}` : ` · ${priceOptions.length} фасування`}</small></div>
              <span className="stock">{totalQuantity} порцій</span>
            </div>
            {mode === 'online' && <button
              type="button"
              className="card-cart-button"
              onClick={() => setAddToCartTarget({ seed, optionIndex: 0 })}
              disabled={!priceOptions.some(option => option.quantity > getCartQuantity(cartLines, seed.id, option.packaging))}
            ><ShoppingCart size={15} /> Додати до кошика</button>}
          </div>
        </article>;
      })}</section> : <div className="empty"><Flower2 size={32} /><h3>{modeLoading ? 'Завантаження каталогу…' : 'Нічого не знайдено'}</h3><p>{modeError || 'Спробуйте змінити пошук або фільтри.'}</p>{mode === 'local' && <button className="btn btn-primary" onClick={startAdd}><Plus size={16} /> Додати насіння</button>}</div>}

      <footer>
        <span>Квіткова комора</span>
        <div className="footer-export-menu" />
        <span>{mode === 'local' ? 'Локальний каталог · Дані зберігаються у вашому браузері' : 'Онлайн-каталог · Дані з Google Таблиці'}</span>
      </footer>
    </main>

    {notice && <div className="toast">{notice}</div>}
    {showShareDialog && <ShareDialog url={config.url} onClose={() => setShowShareDialog(false)} />}
    {showModeDialog && <CatalogModeDialog
      mode={mode}
      isLoading={modeLoading}
      error={modeError}
      onClose={() => { if (!modeLoading) setShowModeDialog(false); }}
      onSelect={selectCatalogMode}
    />}
    {mode === 'online' && showCart && <CartDialog
      seeds={seeds}
      lines={cartLines}
      formatPrice={money}
      recipientEmail={config.orderRecipientEmail}
      orderSubject={config.orderSubject}
      telegramChatUrl={config.telegramChatUrl}
      onClose={() => setShowCart(false)}
      onQuantityChange={setCartQuantity}
      onRemove={removeCartLine}
    />}
    {mode === 'online' && addToCartTarget && <AddToCartDialog
      key={`${addToCartTarget.seed.id}-${addToCartTarget.optionIndex}`}
      seed={seeds.find(seed => seed.id === addToCartTarget.seed.id) ?? addToCartTarget.seed}
      initialOptionIndex={addToCartTarget.optionIndex}
      cartLines={cartLines}
      formatPrice={money}
      onClose={() => setAddToCartTarget(null)}
      onAdd={(packaging, quantity) => addCartLine(addToCartTarget.seed, packaging, quantity)}
    />}
    {showForm && editing && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) { setShowForm(false); setEditing(null); } }}>
      <form className="edit-modal" onSubmit={submit}>
        <div className="modal-head"><div><h2>{seeds.some(s => s.id === editing.id) ? 'Редагувати позицію' : 'Нова позиція'}</h2><p>Заповніть інформацію про насіння</p></div><button type="button" className="close-btn" onClick={() => { setShowForm(false); setEditing(null); }}><X size={20} /></button></div>
        <div className="form-grid">
          <label className="full">Назва квітки *<input autoFocus required value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="Наприклад, Космея двічіпериста" /></label>
          <label>Сорт<input value={editing.variety ?? ''} onChange={e => setEditing({ ...editing, variety: e.target.value })} placeholder="Назва сорту" /></label>
          <label>Латинська назва<input value={editing.latin ?? ''} onChange={e => setEditing({ ...editing, latin: e.target.value })} placeholder="Cosmos bipinnatus" /></label>
          <label className="full">Інші українські назви<textarea rows={2} value={(editing.commonNames ?? []).join('\n')} onChange={e => setEditing({ ...editing, commonNames: e.target.value.split('\n').map(name => name.trim()) })} placeholder="Кожну назву введіть з нового рядка" /></label>
          <label className="full">Англійські назви<textarea rows={2} value={(editing.commonNamesEng ?? []).join('\n')} onChange={e => setEditing({ ...editing, commonNamesEng: e.target.value.split('\n').map(name => name.trim()) })} placeholder="Введіть англійські назви, кожну з нового рядка" /></label>
          <label>Родина<input value={editing.family ?? ''} onChange={e => setEditing({ ...editing, family: e.target.value })} placeholder="Asteraceae" /></label>
          <label>Підродина<input value={editing.subfamily ?? ''} onChange={e => setEditing({ ...editing, subfamily: e.target.value })} placeholder="Asteroideae" /></label>
          <label>Триба<input value={editing.tribe ?? ''} onChange={e => setEditing({ ...editing, tribe: e.target.value })} placeholder="Coreopsideae" /></label>
          <label>Рід<input value={editing.genus ?? ''} onChange={e => setEditing({ ...editing, genus: e.target.value })} placeholder="Cosmos" /></label>
          <label>Категорія<select value={editing.category} onChange={e => setEditing({ ...editing, category: e.target.value })}>{config.categories.map(c => <option key={c}>{c}</option>)}</select></label>
          <label>Складність вирощування
            <select
              value={getSeedGrowingDifficulty(editing)}
              onChange={e => setEditing({ ...editing, growingDifficulty: e.target.value as SeedGrowingDifficulty })}
            >
              {Object.entries(seedGrowingDifficultyLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label>Висота<input value={editing.height ?? ''} onChange={e => setEditing({ ...editing, height: e.target.value })} placeholder="Наприклад, 60–80 см" /></label>
          <label>Ширина<input value={editing.diameter ?? ''} onChange={e => setEditing({ ...editing, diameter: e.target.value })} placeholder="Наприклад, 30–40 см" /></label>
          <label>Морозостійкість<input value={editing.frostHardiness ?? ''} onChange={e => setEditing({ ...editing, frostHardiness: e.target.value || undefined })} placeholder="−25 °C, USDA 5–7 або з укриттям" /></label>
          <label>Стійкість до весняних приморозків<input value={editing.springFrostTolerance ?? ''} onChange={e => setEditing({ ...editing, springFrostTolerance: e.target.value || undefined })} placeholder="Наприклад, до −3 °C" /></label>
          <label>Стійкість до осінніх приморозків<input value={editing.autumnFrostTolerance ?? ''} onChange={e => setEditing({ ...editing, autumnFrostTolerance: e.target.value || undefined })} placeholder="Наприклад, витримує перші приморозки" /></label>
          <label>Чистота (відповідність сорту)<input value={editing.varietalPurity ?? ''} onChange={e => setEditing({ ...editing, varietalPurity: e.target.value || undefined })} placeholder="Наприклад, відповідає сорту" /></label>
          <label>Вазостійкість<input value={editing.vaseLife ?? ''} onChange={e => setEditing({ ...editing, vaseLife: e.target.value || undefined })} placeholder="Наприклад, 7–10 днів" /></label>
          <label className="full">Зріз<textarea rows={3} value={editing.cutHarvest ?? ''} onChange={e => setEditing({ ...editing, cutHarvest: e.target.value || undefined })} placeholder="Умови зрізування та поради щодо збору квітів" /></label>
          <label className="full">Збір насіння<textarea rows={2} value={editing.seedHarvestAdvice ?? ''} onChange={e => setEditing({ ...editing, seedHarvestAdvice: e.target.value || undefined })} placeholder="Коли та як збирати насіння" /></label>
          <label>Днів до достигання
            <input
              type="text"
              value={editing.daysToMature ?? ''}
              onChange={e => setEditing({ ...editing, daysToMature: e.target.value || undefined })}
              placeholder="Наприклад, 75–90 днів"
            />
          </label>
          <div className="full flowering-period-fields">
            <span className="price-options-label">Час цвітіння</span>
            <div className="flowering-period-inputs">
              <label>Початок
                <select value={editing.floweringStart ?? ''} onChange={e => setEditing({ ...editing, floweringStart: e.target.value || undefined })}>
                  <option value="">Не вказано</option>
                  {floweringDecades.map(decade => <option key={decade.value} value={decade.value}>{decade.label}</option>)}
                </select>
              </label>
              <label>Кінець
                <input
                  list="flowering-period-ends"
                  value={editing.floweringEnd ?? ''}
                  onChange={e => setEditing({ ...editing, floweringEnd: e.target.value || undefined })}
                  placeholder="Наприклад, 8-2 або до морозу"
                  disabled={!editing.floweringStart}
                />
                <datalist id="flowering-period-ends">
                  {floweringDecades.map(decade => <option key={decade.value} value={decade.value}>{decade.label}</option>)}
                  <option value="до морозу" />
                </datalist>
              </label>
            </div>
          </div>
          <div className="full sowing-period-fields">
            <span className="price-options-label">Період висіву</span>
            {(editing.sowingPeriods ?? []).map((period, index) => (
              <div className="sowing-period-row" key={index}>
                <label>Початок
                  <select
                    value={period.start}
                    onChange={e => setEditing({
                      ...editing,
                      sowingPeriods: editing.sowingPeriods?.map((item, itemIndex) => itemIndex === index ? { ...item, start: e.target.value } : item)
                    })}
                    required
                  >
                    <option value="">Оберіть декаду</option>
                    {floweringDecades.map(decade => <option key={decade.value} value={decade.value}>{decade.label}</option>)}
                  </select>
                </label>
                <label>Кінець
                  <select
                    value={period.end}
                    onChange={e => setEditing({
                      ...editing,
                      sowingPeriods: editing.sowingPeriods?.map((item, itemIndex) => itemIndex === index ? { ...item, end: e.target.value } : item)
                    })}
                    required
                  >
                    <option value="">Оберіть декаду</option>
                    {floweringDecades.map(decade => <option key={decade.value} value={decade.value}>{decade.label}</option>)}
                  </select>
                </label>
                <div className="sowing-period-meta">
                  <label>Спосіб висіву
                    <select
                      value={period.method ?? 'seedling'}
                      onChange={e => setEditing({
                        ...editing,
                        sowingPeriods: editing.sowingPeriods?.map((item, itemIndex) => itemIndex === index
                          ? { ...item, method: e.target.value === 'direct' ? 'direct' : 'seedling' }
                          : item)
                      })}
                    >
                      <option value="seedling">На розсаду</option>
                      <option value="direct">Прямий у ґрунт</option>
                    </select>
                  </label>
                  <label>Складність
                    <input
                      value={period.difficulty ?? ''}
                      onChange={e => setEditing({
                        ...editing,
                        sowingPeriods: editing.sowingPeriods?.map((item, itemIndex) => itemIndex === index
                          ? { ...item, difficulty: e.target.value || undefined }
                          : item)
                      })}
                      placeholder="Наприклад, легка або потребує стратифікації"
                    />
                  </label>
                  <label className="full">Опис періоду висіву
                    <textarea
                      rows={2}
                      value={period.description ?? ''}
                      onChange={e => setEditing({
                        ...editing,
                        sowingPeriods: editing.sowingPeriods?.map((item, itemIndex) => itemIndex === index
                          ? { ...item, description: e.target.value || undefined }
                          : item)
                      })}
                      placeholder="Додаткові поради для цього періоду"
                    />
                  </label>
                  <label className="sowing-same-year">Цвітіння у рік посіву
                    <select
                      value={period.sameYearFlowering === undefined ? '' : String(period.sameYearFlowering)}
                      onChange={e => setEditing({
                        ...editing,
                        sowingPeriods: editing.sowingPeriods?.map((item, itemIndex) => itemIndex === index
                          ? e.target.value === ''
                            ? { ...item, sameYearFlowering: undefined }
                            : { ...item, sameYearFlowering: e.target.value === 'true' }
                          : item)
                      })}
                    >
                      <option value="">Не вказано</option>
                      <option value="true">Цвістиме того ж року</option>
                      <option value="false">Не цвістиме того ж року</option>
                    </select>
                  </label>
                  <label className="sowing-recommended">
                    <input
                      type="checkbox"
                      checked={period.recommended ?? false}
                      onChange={e => setEditing({
                        ...editing,
                        sowingPeriods: editing.sowingPeriods?.map((item, itemIndex) => itemIndex === index
                          ? { ...item, recommended: e.target.checked }
                          : item)
                      })}
                    />
                    Рекомендовано
                  </label>
                  <button
                    type="button"
                    className="remove-photo"
                    onClick={() => setEditing({ ...editing, sowingPeriods: editing.sowingPeriods?.filter((_, periodIndex) => periodIndex !== index) })}
                    aria-label={`Видалити період висіву ${index + 1}`}
                  ><X size={16} /></button>
                </div>
              </div>
            ))}
            <button type="button" className="add-photo" onClick={() => setEditing({
              ...editing,
              sowingPeriods: [...(editing.sowingPeriods ?? []), { start: '', end: '', method: 'seedling' }]
            })}><Plus size={15} /> Додати період висіву</button>
          </div>
          <label className="full">Освітлення
            <input
              list="seed-lighting-options"
              value={editing.lighting ?? ''}
              onChange={e => setEditing({ ...editing, lighting: e.target.value || undefined })}
              placeholder="Оберіть або введіть свій варіант"
            />
            <datalist id="seed-lighting-options">
              <option value="Повне сонце" />
              <option value="Напівтінь" />
              <option value="Тінь" />
            </datalist>
          </label>
          <label className="full">Короткий опис<textarea rows={2} value={editing.shortDescription ?? ''} onChange={e => setEditing({ ...editing, shortDescription: e.target.value })} placeholder="Короткий текст для картки каталогу" /></label>
          <div className="full seed-color-editor">
            <span className="price-options-label">Кольори</span>
            <datalist id="existing-seed-colors">
              {availableColors.map(color => <option key={`${color.name}-${color.hex}`} value={color.name} label={color.hex} />)}
            </datalist>
            {(editing.colors ?? []).map((group, groupIndex) => (
              <div className="seed-color-group" key={`color-group-${groupIndex}`}>
                <div className="seed-color-group-header">
                  <strong>Композиція {groupIndex + 1}</strong>
                  <button
                    type="button"
                    className="remove-photo"
                    onClick={() => {
                      setEditing({ ...editing, colors: editing.colors?.filter((_, index) => index !== groupIndex) });
                      setColorDraft(null);
                    }}
                    aria-label={`Видалити композицію кольорів ${groupIndex + 1}`}
                  ><X size={16} /></button>
                </div>
                {group.length > 0 && (
                  <div className="seed-color-swatches">
                    {group.map((color, colorIndex) => (
                      <span className="seed-color-swatch" key={`${color.name}-${colorIndex}`}>
                        <i style={{ backgroundColor: color.hex }} aria-hidden="true" />
                        <span>{color.name}<small>{color.hex}</small></span>
                        <button
                          type="button"
                          className="remove-photo"
                          onClick={() => setEditing({
                            ...editing,
                            colors: editing.colors?.map((colors, index) => index === groupIndex
                              ? colors.filter((_, itemIndex) => itemIndex !== colorIndex)
                              : colors)
                          })}
                          aria-label={`Видалити колір ${color.name}`}
                        ><X size={14} /></button>
                      </span>
                    ))}
                  </div>
                )}
                {colorDraft?.groupIndex === groupIndex ? (
                  <div className="seed-color-input-row">
                    <input
                      list="existing-seed-colors"
                      value={colorDraft.name}
                      onChange={event => {
                        const name = event.target.value;
                        const existing = availableColors.find(color => color.name.toLocaleLowerCase('uk') === name.trim().toLocaleLowerCase('uk'));
                        setColorDraft({ ...colorDraft, name, ...(existing ? { hex: existing.hex } : {}) });
                      }}
                      placeholder="Назва кольору українською"
                      aria-label="Назва кольору"
                    />
                    <input
                      type="color"
                      value={/^#[\da-f]{6}$/i.test(colorDraft.hex) ? colorDraft.hex : '#ffffff'}
                      onChange={event => setColorDraft({ ...colorDraft, hex: event.target.value })}
                      aria-label="Значення кольору у форматі HEX"
                    />
                    <button type="button" className="add-photo" onClick={addAtomicColor} disabled={!colorDraft.name.trim()}>Додати</button>
                    <button type="button" className="remove-photo" onClick={() => setColorDraft(null)} aria-label="Скасувати додавання кольору"><X size={16} /></button>
                  </div>
                ) : (
                  <button type="button" className="add-photo" onClick={() => setColorDraft({ groupIndex, name: '', hex: '#ffffff' })}>
                    <Plus size={15} /> Додати колір до композиції
                  </button>
                )}
              </div>
            ))}
            <button type="button" className="add-photo" onClick={addColorGroup}><Plus size={15} /> Додати композицію кольорів</button>
          </div>
          <div className="full tag-editor">
            <span className="price-options-label">Основні теги</span>
            <div className="tag-input-row">
              <input
                list="existing-seed-tags"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Виберіть наявний або введіть новий тег"
                aria-label="Новий або наявний тег"
              />
              <datalist id="existing-seed-tags">
                {availableTags
                  .filter(tag => !getSeedTags(editing).some(existing => existing.toLocaleLowerCase() === tag.toLocaleLowerCase()))
                  .map(tag => <option key={tag} value={tag} />)}
              </datalist>
              <button type="button" className="add-photo" onClick={addTag}><Plus size={15} /> Додати тег</button>
            </div>
            {getSeedTags(editing).length > 0 && (
              <div className="seed-tags">
                {getSeedTags(editing).map(tag => (
                  <span className={`tag-chip tag-chip-static${getSeedTagKind(tag) === 'default' ? '' : ` tag-${getSeedTagKind(tag)}`}`} key={tag}>
                    <SeedTagIcon tag={tag} />{tag}
                    <button
                      type="button"
                      onClick={() => setEditing({ ...editing, tags: getSeedTags(editing).filter(existing => existing !== tag) })}
                      aria-label={`Видалити тег ${tag}`}
                    ><X size={13} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="full tag-editor">
            <span className="price-options-label">Другорядні теги</span>
            <div className="tag-input-row">
              <input
                list="existing-secondary-seed-tags"
                value={secondaryTagInput}
                onChange={e => setSecondaryTagInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    addSecondaryTag();
                  }
                }}
                placeholder="Виберіть наявний або введіть новий тег"
                aria-label="Новий або наявний другорядний тег"
              />
              <datalist id="existing-secondary-seed-tags">
                {availableTags
                  .filter(tag => !getSeedSecondaryTags(editing).some(existing => existing.toLocaleLowerCase() === tag.toLocaleLowerCase()))
                  .map(tag => <option key={tag} value={tag} />)}
              </datalist>
              <button type="button" className="add-photo" onClick={addSecondaryTag}><Plus size={15} /> Додати тег</button>
            </div>
            {getSeedSecondaryTags(editing).length > 0 && (
              <div className="seed-tags secondary-seed-tags">
                {getSeedSecondaryTags(editing).map(tag => (
                  <span className={`tag-chip tag-chip-static secondary-tag${getSeedTagKind(tag) === 'default' ? '' : ` tag-${getSeedTagKind(tag)}`}`} key={tag}>
                    <SeedTagIcon tag={tag} />{tag}
                    <button
                      type="button"
                      onClick={() => setEditing({ ...editing, secondaryTags: getSeedSecondaryTags(editing).filter(existing => existing !== tag) })}
                      aria-label={`Видалити другорядний тег ${tag}`}
                    ><X size={13} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="full price-options-fields">
            <span className="price-options-label">Варіанти фасування та ціни</span>
            {(editing.priceOptions ?? []).map((option, index) => (
              <div className={`price-option-row${editing.priceOptions && editing.priceOptions.length > 1 ? ' has-remove' : ''}`} key={index}>
                <label>Тара / кількість
                  <input
                    required
                    value={option.packaging}
                    onChange={e => setEditing({
                      ...editing,
                      priceOptions: editing.priceOptions?.map((item, optionIndex) => optionIndex === index ? { ...item, packaging: e.target.value } : item)
                    })}
                    placeholder="Наприклад, 10 насінин або 0,5 г"
                  />
                </label>
                <label>Ціна, грн
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={option.price}
                    onChange={e => setEditing({
                      ...editing,
                      priceOptions: editing.priceOptions?.map((item, optionIndex) => optionIndex === index ? { ...item, price: Number(e.target.value) } : item)
                    })}
                  />
                </label>
                <label>Залишок, порцій
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={option.quantity}
                    onChange={e => setEditing({
                      ...editing,
                      priceOptions: editing.priceOptions?.map((item, optionIndex) => optionIndex === index ? { ...item, quantity: Number(e.target.value) } : item)
                    })}
                  />
                </label>
                {editing.priceOptions && editing.priceOptions.length > 1 && (
                  <button
                    type="button"
                    className="remove-photo"
                    onClick={() => setEditing({ ...editing, priceOptions: editing.priceOptions?.filter((_, optionIndex) => optionIndex !== index) })}
                    aria-label={`Видалити варіант фасування ${index + 1}`}
                  ><X size={16} /></button>
                )}
              </div>
            ))}
            <button type="button" className="add-photo" onClick={() => setEditing({
              ...editing,
              priceOptions: [...(editing.priceOptions ?? []), { packaging: '', price: 0, quantity: 0 }]
            })}><Plus size={15} /> Додати варіант</button>
          </div>
          <div className="full photo-fields">
            <span className="photo-fields-label">Фото та описи</span>
            {(editing.images ?? []).map((photo, index) => {
              return (
                <div className="photo-input-row" key={index}>
                  <div className="photo-input-preview" aria-label={`Попередній перегляд фото ${index + 1}`}>
                    {photo.url.trim() ? <img src={photo.url} alt={`Попередній перегляд фото ${index + 1}`} /> : <ImagePlus size={20} aria-hidden="true" />}
                    <span>{index + 1}</span>
                  </div>
                  <div className="photo-order-controls">
                    <button
                      type="button"
                      className="photo-order-button"
                      onClick={() => moveEditingPhoto(index, index - 1)}
                      disabled={index === 0}
                      aria-label={`Перемістити фото ${index + 1} вище`}
                    ><ArrowUp size={16} /></button>
                    <button
                      type="button"
                      className="photo-order-button"
                      onClick={() => moveEditingPhoto(index, index + 1)}
                      disabled={index === (editing.images?.length ?? 0) - 1}
                      aria-label={`Перемістити фото ${index + 1} нижче`}
                    ><ArrowDown size={16} /></button>
                  </div>
                  <div className="photo-input-fields">
                    <input type="url" value={photo.url} onChange={e => setEditing({ ...editing, images: editing.images?.map((currentPhoto, photoIndex) => photoIndex === index ? { ...photo, url: e.target.value } : currentPhoto) })} placeholder="https://… (необов'язково)" />
                    <input type="date" value={photo.date ?? ''} onChange={e => setEditing({ ...editing, images: editing.images?.map((currentPhoto, photoIndex) => photoIndex === index ? { ...photo, date: e.target.value || undefined } : currentPhoto) })} aria-label={`Дата фото ${index + 1}`} />
                    <input value={photo.shortDescription ?? ''} onChange={e => setEditing({ ...editing, images: editing.images?.map((currentPhoto, photoIndex) => photoIndex === index ? { ...photo, shortDescription: e.target.value || undefined } : currentPhoto) })} placeholder="Короткий опис фото" aria-label={`Короткий опис фото ${index + 1}`} />
                    <textarea rows={2} value={photo.description ?? ''} onChange={e => setEditing({ ...editing, images: editing.images?.map((currentPhoto, photoIndex) => photoIndex === index ? { ...photo, description: e.target.value || undefined } : currentPhoto) })} placeholder="Повний опис фото" aria-label={`Повний опис фото ${index + 1}`} />
                  </div>
                  {editing.images && editing.images.length > 1 && <button type="button" className="remove-photo" onClick={() => setEditing({ ...editing, images: editing.images?.filter((_, photoIndex) => photoIndex !== index) })} aria-label={`Видалити фото ${index + 1}`}><X size={16} /></button>}
                </div>
              );
            })}
            <button type="button" className="add-photo" onClick={() => setEditing({ ...editing, images: [...(editing.images ?? []), { url: '' }] })}><ImagePlus size={15} /> Додати ще фото</button>
          </div>
          <label className="full">Основний опис<textarea rows={4} value={editing.description ?? ''} onChange={e => setEditing({ ...editing, description: e.target.value })} placeholder="Детальна інформація про рослину…" /></label>
          <label className="check-label full"><input type="checkbox" checked={!!editing.featured} onChange={e => setEditing({ ...editing, featured: e.target.checked })} /> Позначити як обране</label>
          <label className="check-label full"><input type="checkbox" checked={!!editing.lowStock} onChange={e => setEditing({ ...editing, lowStock: e.target.checked })} /> Показувати мітку «Мало залишилось»</label>
          <label className="check-label full"><input type="checkbox" checked={!!editing.topSelling} onChange={e => setEditing({ ...editing, topSelling: e.target.checked })} /> Позначити як «Топ продажів»</label>
        </div>
        <div className="modal-footer">
          {seeds.some(seed => seed.id === editing.id) && <button type="button" className="btn btn-danger" onClick={() => remove(editing, () => { setShowForm(false); setEditing(null); })}><Trash2 size={15} /> Видалити</button>}
          {seeds.some(seed => seed.id === editing.id) && <button type="button" className="btn btn-light" onClick={duplicateEditing}><Copy size={15} /> Зробити копію</button>}
          <button type="button" className="btn btn-light" onClick={() => { setShowForm(false); setEditing(null); }}>Скасувати</button>
          <button type="submit" className="btn btn-primary">Зберегти позицію</button>
        </div>
      </form>
    </div>}
    {viewing && <SeedDetails
      key={viewing.id}
      seed={viewing}
      onClose={() => setViewing(null)}
      formatPrice={money}
      onTaxonomyFilter={applySeedTaxonomyFilter}
      onTagFilter={applyTagFilter}
      cartLines={cartLines}
      allowOrdering={mode === 'online'}
      onAddToCart={(seed, optionIndex) => {
        setViewing(null);
        setAddToCartTarget({ seed, optionIndex });
      }}
    />}
  </div>;
}