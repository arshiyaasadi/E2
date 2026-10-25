/**
 * Canonical media folder taxonomy.
 * Every upload lands under one of these prefixes in object storage.
 * Keys look like: `{folder}/{yyyy}/{mm}/{uuid}/original.ext`
 */
export const MEDIA_FOLDERS = {
  /** Site chrome: logo, favicon, hero banners, homepage assets */
  SITE: "site",
  /** Product gallery + product OG images */
  PRODUCTS: "products",
  /** Category tree images + category OG */
  CATEGORIES: "categories",
  /** Brand logos */
  BRANDS: "brands",
  /** Blog / magazine article covers and inline images */
  BLOG: "blog",
  /** CMS / static pages OG and page media */
  PAGES: "pages",
  /** Uncategorized uploads from the image bank */
  GENERAL: "general",
  /** Customer card-to-card payment receipts */
  RECEIPTS: "receipts",
} as const;

export type MediaFolder = (typeof MEDIA_FOLDERS)[keyof typeof MEDIA_FOLDERS];

export const MEDIA_FOLDER_VALUES = Object.values(MEDIA_FOLDERS) as MediaFolder[];

const FOLDER_SET = new Set<string>(MEDIA_FOLDER_VALUES);

/** Legacy prefixes remapped when reading old storage keys / form values */
const FOLDER_ALIASES: Record<string, MediaFolder> = {
  media: MEDIA_FOLDERS.GENERAL,
  website: MEDIA_FOLDERS.SITE,
  store: MEDIA_FOLDERS.SITE,
  product: MEDIA_FOLDERS.PRODUCTS,
  category: MEDIA_FOLDERS.CATEGORIES,
  brand: MEDIA_FOLDERS.BRANDS,
  article: MEDIA_FOLDERS.BLOG,
  articles: MEDIA_FOLDERS.BLOG,
  page: MEDIA_FOLDERS.PAGES,
};

export function isMediaFolder(value: string): value is MediaFolder {
  return FOLDER_SET.has(value);
}

export function normalizeMediaFolder(input?: string | null): MediaFolder {
  if (!input) return MEDIA_FOLDERS.GENERAL;
  const cleaned = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9/_-]/g, "")
    .replace(/^\/+|\/+$/g, "")
    .split("/")[0];

  if (!cleaned) return MEDIA_FOLDERS.GENERAL;
  if (isMediaFolder(cleaned)) return cleaned;
  if (cleaned in FOLDER_ALIASES) return FOLDER_ALIASES[cleaned];
  return MEDIA_FOLDERS.GENERAL;
}

export function buildMediaObjectPrefix(folder: MediaFolder, id: string, now = new Date()) {
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${folder}/${yyyy}/${mm}/${id}`;
}

export function mediaFolderFromStorageKey(storageKey: string): MediaFolder {
  const first = storageKey.split("/")[0] ?? "";
  return normalizeMediaFolder(first);
}
