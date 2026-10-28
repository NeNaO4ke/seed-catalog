import { useEffect, useRef, useState } from 'react';
//@ts-ignore
import { createPortal } from 'react-dom';
//@ts-ignore
import Papa from 'papaparse';
import { Copy, Download, Upload } from 'lucide-react';
import { getSeedCutHarvest, getSeedGrowingDifficulty, getSeedImageEntries, getSeedPriceOptions, type Seed, type SeedColor, type SeedGrowingDifficulty, type SeedImage, type SeedPriceOption, type SeedSowingPeriod } from '../types/seed';

type DataFormat = 'json' | 'csv';
type ImportExportMenuProps = {
  seeds: Seed[];
  allowImport: boolean;
  onImport: (seeds: Seed[]) => void;
  onNotice: (message: string) => void;
};

const csvFields: (keyof Seed)[] = [
  'id', 'name', 'latin', 'variety', 'commonNames', 'commonNamesEng', 'family', 'subfamily', 'tribe', 'genus',
  'tags', 'secondaryTags', 'category',
  'shortDescription', 'description', 'height', 'diameter', 'frostHardiness', 'springFrostTolerance', 'autumnFrostTolerance', 'varietalPurity',
  'vaseLife', 'cutHarvest', 'seedHarvestAdvice', 'daysToMature', 'floweringStart', 'floweringEnd',
  'sowingPeriods', 'lighting', 'priceOptions', 'colors', 'images', 'featured',
  'lowStock', 'topSelling', 'growingDifficulty'
];

const createSeedsCsv = (seeds: Seed[]): string => {
  const rows = seeds.map(seed => ({
    ...seed,
    cutHarvest: getSeedCutHarvest(seed),
    growingDifficulty: getSeedGrowingDifficulty(seed),
    tags: JSON.stringify(seed.tags ?? []),
    secondaryTags: JSON.stringify(seed.secondaryTags ?? []),
    commonNames: JSON.stringify(seed.commonNames ?? []),
    commonNamesEng: JSON.stringify(seed.commonNamesEng ?? []),
    colors: JSON.stringify(seed.colors ?? []),
    sowingPeriods: JSON.stringify(seed.sowingPeriods ?? []),
    images: JSON.stringify(getSeedImageEntries(seed)),
    priceOptions: JSON.stringify(getSeedPriceOptions(seed))
  }));
  return `\uFEFF${Papa.unparse({ fields: csvFields, data: rows })}`;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizePriceOptions = (value: unknown): SeedPriceOption[] => {
  if (!Array.isArray(value) || value.length === 0) throw new Error('Кожна позиція має містити хоча б один варіант фасування.');
  return value.map(option => {
    if (!isRecord(option) || typeof option.packaging !== 'string' || !option.packaging.trim() ||
      typeof option.price !== 'number' || !Number.isFinite(option.price) || option.price < 0 ||
      typeof option.quantity !== 'number' || !Number.isFinite(option.quantity) || option.quantity < 0) {
      throw new Error('Некоректні дані одного з варіантів фасування.');
    }
    return {
      packaging: option.packaging.trim(),
      price: option.price,
      quantity: option.quantity
    };
  });
};

const normalizeSeed = (value: unknown): Seed => {
  if (!isRecord(value) || typeof value.name !== 'string') {
    throw new Error('Кожна позиція має містити назву.');
  }
  const priceOptions = normalizePriceOptions(value.priceOptions);

  const optionalString = (key: string): string | undefined => {
    const fieldValue = value[key];
    if (fieldValue !== undefined && typeof fieldValue !== 'string') {
      throw new Error(`Некоректне значення поля «${key}».`);
    }
    return typeof fieldValue === 'string' ? fieldValue : undefined;
  };
  const category = optionalString('category');
  const latin = optionalString('latin');
  const variety = optionalString('variety');
  const normalizeNames = (key: 'commonNames' | 'commonNamesEng'): string[] | undefined => {
    const names = value[key];
    if (names === undefined) return undefined;
    if (!Array.isArray(names) || !names.every(name => typeof name === 'string')) {
      throw new Error(`Некоректний формат поля «${key}».`);
    }
    return names.map(name => name.trim()).filter(Boolean);
  };
  const commonNames = normalizeNames('commonNames');
  const commonNamesEng = normalizeNames('commonNamesEng');
  const colorsValue = value.colors;
  const colors = colorsValue === undefined
    ? undefined
    : Array.isArray(colorsValue)
      ? colorsValue.map((group): SeedColor[] => {
        if (!Array.isArray(group)) throw new Error('Некоректний формат груп кольорів.');
        return group.map((color): SeedColor => {
          if (!isRecord(color) || typeof color.name !== 'string' || !color.name.trim() ||
            typeof color.hex !== 'string' || !/^#[\da-f]{6}$/i.test(color.hex)) {
            throw new Error('Кожен колір має містити українську назву та HEX-код у форматі #RRGGBB.');
          }
          return { name: color.name.trim(), hex: color.hex.toUpperCase() };
        });
      })
      : (() => { throw new Error('Некоректний формат кольорів.'); })();
  const family = optionalString('family');
  const subfamily = optionalString('subfamily');
  const tribe = optionalString('tribe');
  const genus = optionalString('genus');
  const shortDescription = optionalString('shortDescription');
  const description = optionalString('description');
  const height = optionalString('height');
  const diameter = optionalString('diameter');
  const frostHardiness = optionalString('frostHardiness');
  const springFrostTolerance = optionalString('springFrostTolerance');
  const autumnFrostTolerance = optionalString('autumnFrostTolerance');
  const varietalPurity = optionalString('varietalPurity');
  const vaseLife = optionalString('vaseLife');
  const cutHarvestValue = optionalString('cutHarvest');
  const cutHarvest = cutHarvestValue?.trim() || undefined;
  const seedHarvestAdvice = optionalString('seedHarvestAdvice');
  const daysToMature = optionalString('daysToMature');
  const floweringStart = optionalString('floweringStart');
  const floweringEnd = optionalString('floweringEnd');
  const lighting = optionalString('lighting');
  const growingDifficulty = value.growingDifficulty === undefined
    ? undefined
    : ['easy', 'medium', 'hard'].includes(value.growingDifficulty as string)
      ? value.growingDifficulty as SeedGrowingDifficulty
      : (() => { throw new Error('Некоректний рівень складності вирощування.'); })();
  const optionalBoolean = (key: 'featured' | 'lowStock' | 'topSelling'): boolean | undefined => {
    if (value[key] !== undefined && typeof value[key] !== 'boolean') {
      throw new Error(`Некоректне значення поля «${key}».`);
    }
    return value[key] as boolean | undefined;
  };
  const featured = optionalBoolean('featured');
  const lowStock = optionalBoolean('lowStock');
  const topSelling = optionalBoolean('topSelling');
  const tags = value.tags === undefined
    ? undefined
    : Array.isArray(value.tags) && value.tags.every(tag => typeof tag === 'string')
      ? value.tags
      : (() => { throw new Error('Некоректний формат тегів.'); })();
  const secondaryTags = value.secondaryTags === undefined
    ? undefined
    : Array.isArray(value.secondaryTags) && value.secondaryTags.every(tag => typeof tag === 'string')
      ? value.secondaryTags
      : (() => { throw new Error('Некоректний формат другорядних тегів.'); })();
  const images = value.images === undefined
    ? undefined
    : Array.isArray(value.images)
      ? value.images.map((image): SeedImage => {
        if (!isRecord(image) || typeof image.url !== 'string' ||
          (image.date !== undefined && typeof image.date !== 'string') ||
          (image.shortDescription !== undefined && typeof image.shortDescription !== 'string') ||
          (image.description !== undefined && typeof image.description !== 'string')) {
          throw new Error('Некоректний формат фото. Перевірте URL, дату й описи.');
        }
        return {
          url: image.url,
          ...(typeof image.date === 'string' ? { date: image.date } : {}),
          ...(typeof image.shortDescription === 'string' ? { shortDescription: image.shortDescription } : {}),
          ...(typeof image.description === 'string' ? { description: image.description } : {})
        };
      })
      : (() => { throw new Error('Некоректний формат списку фото.'); })();
  const sowingPeriods = value.sowingPeriods === undefined
    ? undefined
    : Array.isArray(value.sowingPeriods)
      ? value.sowingPeriods.map((period): SeedSowingPeriod => {
        if (!isRecord(period) || typeof period.start !== 'string' || typeof period.end !== 'string') {
          throw new Error('Некоректний формат періодів висіву.');
        }
        if (period.method !== undefined && period.method !== 'seedling' && period.method !== 'direct') {
          throw new Error('Некоректний спосіб висіву.');
        }
        if (period.sameYearFlowering !== undefined && typeof period.sameYearFlowering !== 'boolean') {
          throw new Error('Некоректне значення цвітіння у рік посіву.');
        }
        if (period.recommended !== undefined && typeof period.recommended !== 'boolean') {
          throw new Error('Некоректне значення поля «Рекомендовано».');
        }
        if (period.difficulty !== undefined && typeof period.difficulty !== 'string') {
          throw new Error('Некоректне значення поля «Складність».');
        }
        if (period.description !== undefined && typeof period.description !== 'string') {
          throw new Error('Некоректне значення опису періоду висіву.');
        }
        return {
          start: period.start,
          end: period.end,
          ...(period.method !== undefined ? { method: period.method } : {}),
          ...(period.sameYearFlowering !== undefined ? { sameYearFlowering: period.sameYearFlowering } : {}),
          ...(period.recommended !== undefined ? { recommended: period.recommended } : {}),
          ...(period.difficulty !== undefined ? { difficulty: period.difficulty } : {}),
          ...(period.description !== undefined ? { description: period.description } : {})
        };
      })
      : (() => { throw new Error('Некоректний формат періодів висіву.'); })();
  return {
    id: typeof value.id === 'string' && value.id ? value.id : crypto.randomUUID(),
    name: value.name,
    category: category || 'Інше',
    priceOptions,
    ...(latin !== undefined ? { latin } : {}),
    ...(variety !== undefined ? { variety } : {}),
    ...(commonNames !== undefined ? { commonNames } : {}),
    ...(commonNamesEng !== undefined ? { commonNamesEng } : {}),
    ...(colors !== undefined ? { colors } : {}),
    ...(family !== undefined ? { family } : {}),
    ...(subfamily !== undefined ? { subfamily } : {}),
    ...(tribe !== undefined ? { tribe } : {}),
    ...(genus !== undefined ? { genus } : {}),
    ...(shortDescription !== undefined ? { shortDescription } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(height !== undefined ? { height } : {}),
    ...(diameter !== undefined ? { diameter } : {}),
    ...(frostHardiness !== undefined ? { frostHardiness } : {}),
    ...(springFrostTolerance !== undefined ? { springFrostTolerance } : {}),
    ...(autumnFrostTolerance !== undefined ? { autumnFrostTolerance } : {}),
    ...(varietalPurity !== undefined ? { varietalPurity } : {}),
    ...(vaseLife !== undefined ? { vaseLife } : {}),
    ...(cutHarvest !== undefined ? { cutHarvest } : {}),
    ...(seedHarvestAdvice !== undefined ? { seedHarvestAdvice } : {}),
    ...(daysToMature !== undefined ? { daysToMature } : {}),
    ...(floweringStart !== undefined ? { floweringStart } : {}),
    ...(floweringEnd !== undefined ? { floweringEnd } : {}),
    ...(sowingPeriods !== undefined ? { sowingPeriods } : {}),
    ...(lighting !== undefined ? { lighting } : {}),
    growingDifficulty: growingDifficulty ?? 'easy',
    ...(tags ? { tags } : {}),
    ...(secondaryTags ? { secondaryTags } : {}),
    ...(images ? { images } : {}),
    ...(featured !== undefined ? { featured } : {}),
    ...(lowStock !== undefined ? { lowStock } : {}),
    ...(topSelling !== undefined ? { topSelling } : {})
  };
};

const parseCsvValue = (row: Record<string, string>): Record<string, unknown> => {
  const parsed: Record<string, unknown> = { ...row };
  for (const field of ['tags', 'secondaryTags', 'commonNames', 'commonNamesEng', 'colors', 'images', 'priceOptions', 'sowingPeriods'] as const) {
    const value = row[field]?.trim();
    if (!value) {
      delete parsed[field];
      continue;
    }
    try {
      parsed[field] = JSON.parse(value) as unknown;
    } catch {
      throw new Error(`Не вдалося прочитати CSV-поле «${field}» як JSON.`);
    }
  }
  for (const field of ['featured', 'lowStock', 'topSelling'] as const) {
    const booleanValue = row[field]?.trim().toLocaleLowerCase('uk');
    if (booleanValue) {
      if (!['true', 'false'].includes(booleanValue)) throw new Error(`Некоректне значення CSV-поля «${field}».`);
      parsed[field] = booleanValue === 'true';
    } else {
      delete parsed[field];
    }
  }
  return parsed;
};

export const parseSeedsCsv = (csvText: string): Seed[] => {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim().replace(/^\uFEFF/, '')
  });
  if (result.errors.length) {
    throw new Error(`Помилка CSV: ${result.errors[0].message}`);
  }
  if (!result.data.length) {
    throw new Error('CSV-файл не містить позицій.');
  }
  return result.data.map((row: Record<string, string>) => normalizeSeed(parseCsvValue(row)));
};

export default function ImportExportMenu({ seeds, allowImport, onImport, onNotice }: ImportExportMenuProps) {
  const [openMenu, setOpenMenu] = useState<'export' | 'import' | null>(null);
  const [isSmallScreen, setIsSmallScreen] = useState(() => window.matchMedia('(max-width: 800px)').matches);
  const [footerExportTarget, setFooterExportTarget] = useState<HTMLElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importFormatRef = useRef<DataFormat>('json');

  useEffect(() => {
    const media = window.matchMedia('(max-width: 800px)');
    const updateExportTarget = (isSmall: boolean) => {
      setFooterExportTarget(isSmall ? document.querySelector('.footer-export-menu') : null);
    };
    updateExportTarget(media.matches);
    const updateScreenSize = () => {
      setIsSmallScreen(media.matches);
      updateExportTarget(media.matches);
      setOpenMenu(null);
    };
    media.addEventListener('change', updateScreenSize);
    return () => media.removeEventListener('change', updateScreenSize);
  }, []);

  const download = (content: string, fileName: string, mimeType: string) => {
    const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const exportData = (format: DataFormat) => {
    if (format === 'json') {
      download(JSON.stringify(seeds.map(seed => {
        return {
          ...seed,
          cutHarvest: getSeedCutHarvest(seed) || undefined,
          images: getSeedImageEntries(seed),
          growingDifficulty: getSeedGrowingDifficulty(seed)
        };
      }), null, 2), 'kvitkove-nasinnia-catalog.json', 'application/json');
    } else {
      download(createSeedsCsv(seeds), 'kvitkove-nasinnia-catalog.csv', 'text/csv;charset=utf-8');
    }
    setOpenMenu(null);
  };

  const copyCsv = async () => {
    try {
      await navigator.clipboard.writeText(createSeedsCsv(seeds));
      onNotice('CSV скопійовано в буфер обміну');
      setOpenMenu(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Невідома помилка доступу до буфера обміну.';
      onNotice(`Не вдалося скопіювати CSV: ${message}`);
    }
  };

  const importData = async (file?: File) => {
    if (!file) return;
    try {
      const fileText = await file.text();
      let importedSeeds: Seed[];
      if (importFormatRef.current === 'json') {
        const data: unknown = JSON.parse(fileText) as unknown;
        if (!Array.isArray(data)) throw new Error('Файл має містити список позицій.');
        importedSeeds = data.map(normalizeSeed);
      } else {
        importedSeeds = parseSeedsCsv(fileText);
      }
      if (!window.confirm(`Імпортувати ${importedSeeds.length} позицій? Поточний каталог буде замінено.`)) return;
      onImport(importedSeeds);
      onNotice('Каталог імпортовано');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Невідома помилка читання файлу.';
      window.alert(`Не вдалося імпортувати каталог: ${message}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
      setOpenMenu(null);
    }
  };

  const chooseImportFormat = (format: DataFormat) => {
    importFormatRef.current = format;
    setOpenMenu(null);
    if (fileInputRef.current) {
      fileInputRef.current.accept = format === 'json' ? 'application/json,.json' : 'text/csv,.csv';
    }
    fileInputRef.current?.click();
  };

  const exportAction = (
    <div className="import-export-action">
      <button type="button" className="btn btn-light" aria-expanded={openMenu === 'export'} onClick={() => setOpenMenu(current => current === 'export' ? null : 'export')}>
        <Download size={16} /> Експорт
      </button>
      {openMenu === 'export' && (
        <div className="import-export-options" role="menu" aria-label="Формат експорту">
          <button type="button" role="menuitem" onClick={() => exportData('json')}>JSON</button>
          <button type="button" role="menuitem" onClick={() => exportData('csv')}>CSV</button>
          {/* <button type="button" role="menuitem" onClick={copyCsv}><Copy size={14} /> Копіювати CSV</button> */}
        </div>
      )}
    </div>
  );
  const importAction = (
    <div className="import-export-action">
      {allowImport && (
        <>
          <button type="button" className="btn btn-light" aria-expanded={openMenu === 'import'} onClick={() => setOpenMenu(current => current === 'import' ? null : 'import')}>
            <Upload size={16} /> Імпорт
          </button>
          {openMenu === 'import' && (
            <div className="import-export-options" role="menu" aria-label="Формат імпорту">
              <button type="button" role="menuitem" onClick={() => chooseImportFormat('json')}>JSON</button>
              <button type="button" role="menuitem" onClick={() => chooseImportFormat('csv')}>CSV</button>
            </div>
          )}
          <input ref={fileInputRef} type="file" accept="application/json,.json" hidden onChange={event => void importData(event.target.files?.[0])} />
        </>
      )}
    </div>
  );
  return (
    <div className="import-export-menu">
      {!isSmallScreen && <>{exportAction}{importAction}</>}
      {isSmallScreen && footerExportTarget && createPortal(
        <div className="import-export-menu footer-import-export-menu">
          {exportAction}
          {importAction}
        </div>,
        footerExportTarget
      )}
    </div>
  );
}
