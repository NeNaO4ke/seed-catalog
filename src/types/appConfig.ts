export type AppBanner = {
  imageUrl?: string;
  text?: string;
  linkUrl?: string;
  alt?: string;
};

export type AppConfig = {
  url: string;
  orderRecipientEmail: string;
  orderSubject: string;
  onlineCatalogCsvUrl: string;
  telegramChatUrl: string;
  googleFontsStylesheetUrl: string;
  categories: string[];
  banner?: AppBanner;
};

export const parseAppConfig = (value: unknown): AppConfig => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Файл конфігурації має містити JSON-об’єкт.');
  }

  const record = value as Record<string, unknown>;
  const readString = (field: keyof AppConfig): string => {
    const fieldValue = record[field];
    if (typeof fieldValue !== 'string' || !fieldValue.trim()) {
      throw new Error(`У файлі конфігурації відсутнє текстове поле «${field}».`);
    }
    return fieldValue.trim();
  };
  const categoriesValue = record.categories;
  if (!Array.isArray(categoriesValue) || categoriesValue.length === 0) {
    throw new Error('Поле «categories» має бути непорожнім списком назв категорій.');
  }
  const categories = categoriesValue.flatMap(category =>
    typeof category === 'string' && category.trim() ? [category.trim()] : []
  );
  if (categories.length !== categoriesValue.length) {
    throw new Error('Кожна категорія має бути непорожнім текстом.');
  }
  if (new Set(categories).size !== categories.length || categories.includes('Усі категорії')) {
    throw new Error('Категорії мають бути унікальними та не повинні містити «Усі категорії».');
  }

  let banner: AppBanner | undefined;
  if (record.banner !== undefined && record.banner !== null) {
    if (typeof record.banner !== 'object' || Array.isArray(record.banner)) {
      throw new Error('Поле «banner» має бути об’єктом.');
    }
    const bannerRecord = record.banner as Record<string, unknown>;
    const readBannerString = (field: keyof AppBanner): string | undefined => {
      const fieldValue = bannerRecord[field];
      if (fieldValue === undefined || fieldValue === '') return undefined;
      if (typeof fieldValue !== 'string') {
        throw new Error(`Поле банера «${field}» має бути текстовим.`);
      }
      return fieldValue.trim() || undefined;
    };
    const imageUrl = readBannerString('imageUrl');
    const text = readBannerString('text');
    const linkUrl = readBannerString('linkUrl');
    const alt = readBannerString('alt');
    if (!imageUrl && !text) {
      throw new Error('Банер має містити зображення або текст.');
    }
    for (const [field, urlValue] of [['imageUrl', imageUrl], ['linkUrl', linkUrl]] as const) {
      if (!urlValue) continue;
      try {
        const parsedUrl = new URL(urlValue);
        if (parsedUrl.protocol !== 'https:') throw new Error();
      } catch {
        throw new Error(`Поле банера «${field}» має містити коректне HTTPS-посилання.`);
      }
    }
    banner = {
      ...(imageUrl ? { imageUrl } : {}),
      ...(text ? { text } : {}),
      ...(linkUrl ? { linkUrl } : {}),
      ...(alt ? { alt } : {})
    };
  }

  for (const field of ['url', 'onlineCatalogCsvUrl', 'telegramChatUrl', 'googleFontsStylesheetUrl'] as const) {
    try {
      const url = new URL(readString(field));
      if (url.protocol !== 'https:') throw new Error();
    } catch {
      throw new Error(`Поле «${field}» має містити коректне HTTPS-посилання.`);
    }
  }

  return {
    url: readString('url'),
    orderRecipientEmail: readString('orderRecipientEmail'),
    orderSubject: readString('orderSubject'),
    onlineCatalogCsvUrl: readString('onlineCatalogCsvUrl'),
    telegramChatUrl: readString('telegramChatUrl'),
    googleFontsStylesheetUrl: readString('googleFontsStylesheetUrl'),
    categories,
    ...(banner ? { banner } : {})
  };
};
