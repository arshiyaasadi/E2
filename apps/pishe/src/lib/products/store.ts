import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  BrandRecord,
  CategoryKind,
  CategoryRecord,
  MediaRecord,
  ProductRecord,
  ProductsStoreDocument,
  ProductVariants,
} from "@/features/products/types";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "products.json");

const emptyStore = (): ProductsStoreDocument => ({
  products: [],
  media: [],
  brands: [],
  categories: [],
});

function slugify(name: string) {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return base || `item-${randomUUID().slice(0, 8)}`;
}

function normalizeProduct(raw: ProductRecord): ProductRecord {
  return {
    ...raw,
    brandId: raw.brandId ?? null,
    categoryId: raw.categoryId ?? null,
    groupCategoryIds: Array.isArray(raw.groupCategoryIds)
      ? raw.groupCategoryIds
      : [],
  };
}

let writeChain: Promise<unknown> = Promise.resolve();

async function ensureStoreFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(STORE_PATH);
  } catch {
    await fs.writeFile(STORE_PATH, JSON.stringify(emptyStore(), null, 2), "utf8");
  }
}

async function readStore(): Promise<ProductsStoreDocument> {
  await ensureStoreFile();
  const raw = await fs.readFile(STORE_PATH, "utf8");
  try {
    const parsed = JSON.parse(raw) as Partial<ProductsStoreDocument>;
    return {
      products: Array.isArray(parsed.products)
        ? parsed.products.map((p) => normalizeProduct(p as ProductRecord))
        : [],
      media: Array.isArray(parsed.media) ? parsed.media : [],
      brands: Array.isArray(parsed.brands) ? parsed.brands : [],
      categories: Array.isArray(parsed.categories) ? parsed.categories : [],
    };
  } catch {
    return emptyStore();
  }
}

async function writeStore(doc: ProductsStoreDocument) {
  await ensureStoreFile();
  const tmp = `${STORE_PATH}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(doc, null, 2), "utf8");
  await fs.rename(tmp, STORE_PATH);
}

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = writeChain.then(fn, fn);
  writeChain = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

function uniqueSlug(
  doc: ProductsStoreDocument,
  name: string,
  excludeBrandId?: string,
) {
  const base = slugify(name);
  let candidate = base;
  let n = 2;
  while (
    doc.brands.some((b) => b.slug === candidate && b.id !== excludeBrandId)
  ) {
    candidate = `${base}-${n}`;
    n += 1;
  }
  return candidate;
}

export async function listProductsForUser(userId: string): Promise<ProductRecord[]> {
  const doc = await readStore();
  return doc.products
    .filter((p) => p.userId === userId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getProductForUser(
  userId: string,
  productId: string,
): Promise<ProductRecord | null> {
  const doc = await readStore();
  return doc.products.find((p) => p.id === productId && p.userId === userId) ?? null;
}

export async function getMediaForUser(
  userId: string,
  fileId: string,
): Promise<MediaRecord | null> {
  const doc = await readStore();
  return doc.media.find((m) => m.fileId === fileId && m.userId === userId) ?? null;
}

export async function listMediaForUser(userId: string): Promise<MediaRecord[]> {
  const doc = await readStore();
  return doc.media
    .filter((m) => m.userId === userId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function createProduct(input: {
  userId: string;
  title: string;
  priceRial: number;
  description: string;
  mediaIds: string[];
  brandId?: string | null;
  categoryId?: string | null;
  groupCategoryIds?: string[];
}): Promise<ProductRecord> {
  return withLock(async () => {
    const doc = await readStore();
    const now = new Date().toISOString();
    const product: ProductRecord = {
      id: randomUUID(),
      userId: input.userId,
      title: input.title,
      priceRial: input.priceRial,
      description: input.description,
      mediaIds: input.mediaIds,
      brandId: input.brandId ?? null,
      categoryId: input.categoryId ?? null,
      groupCategoryIds: input.groupCategoryIds ?? [],
      unit: "piece",
      status: "basic",
      createdAt: now,
      updatedAt: now,
    };

    for (const fileId of input.mediaIds) {
      const media = doc.media.find((m) => m.fileId === fileId && m.userId === input.userId);
      if (!media) {
        throw Object.assign(new Error(`Unknown media: ${fileId}`), { code: "VALIDATION_ERROR" });
      }
      if (!media.productIds.includes(product.id)) {
        media.productIds.push(product.id);
        media.updatedAt = now;
      }
    }

    doc.products.push(product);
    await writeStore(doc);
    return product;
  });
}

export async function updateProduct(
  userId: string,
  productId: string,
  patch: {
    title?: string;
    priceRial?: number;
    description?: string;
    mediaIds?: string[];
    brandId?: string | null;
    categoryId?: string | null;
    groupCategoryIds?: string[];
    unit?: ProductRecord["unit"];
    variants?: ProductVariants;
    status?: ProductRecord["status"];
  },
): Promise<ProductRecord | null> {
  return withLock(async () => {
    const doc = await readStore();
    const product = doc.products.find((p) => p.id === productId && p.userId === userId);
    if (!product) return null;

    const now = new Date().toISOString();
    const previousMedia = [...product.mediaIds];

    if (patch.title !== undefined) product.title = patch.title;
    if (patch.priceRial !== undefined) product.priceRial = patch.priceRial;
    if (patch.description !== undefined) product.description = patch.description;
    if (patch.unit !== undefined) product.unit = patch.unit;
    if (patch.variants !== undefined) product.variants = patch.variants;
    if (patch.status !== undefined) product.status = patch.status;
    if (patch.brandId !== undefined) product.brandId = patch.brandId;
    if (patch.categoryId !== undefined) product.categoryId = patch.categoryId;
    if (patch.groupCategoryIds !== undefined) {
      product.groupCategoryIds = patch.groupCategoryIds;
    }

    if (patch.mediaIds !== undefined) {
      for (const fileId of patch.mediaIds) {
        const media = doc.media.find((m) => m.fileId === fileId && m.userId === userId);
        if (!media) {
          throw Object.assign(new Error(`Unknown media: ${fileId}`), {
            code: "VALIDATION_ERROR",
          });
        }
      }
      product.mediaIds = patch.mediaIds;

      const removed = previousMedia.filter((id) => !patch.mediaIds!.includes(id));
      const added = patch.mediaIds.filter((id) => !previousMedia.includes(id));

      for (const fileId of removed) {
        const media = doc.media.find((m) => m.fileId === fileId);
        if (media) {
          media.productIds = media.productIds.filter((id) => id !== productId);
          media.updatedAt = now;
        }
      }
      for (const fileId of added) {
        const media = doc.media.find((m) => m.fileId === fileId);
        if (media && !media.productIds.includes(productId)) {
          media.productIds.push(productId);
          media.updatedAt = now;
        }
      }
    }

    product.updatedAt = now;
    await writeStore(doc);
    return product;
  });
}

export async function deleteProduct(
  userId: string,
  productId: string,
): Promise<{ product: ProductRecord; orphanedFileIds: string[] } | null> {
  return withLock(async () => {
    const doc = await readStore();
    const index = doc.products.findIndex((p) => p.id === productId && p.userId === userId);
    if (index < 0) return null;

    const [product] = doc.products.splice(index, 1);
    const now = new Date().toISOString();
    const orphanedFileIds: string[] = [];

    for (const fileId of product.mediaIds) {
      const media = doc.media.find((m) => m.fileId === fileId);
      if (!media) continue;
      media.productIds = media.productIds.filter((id) => id !== productId);
      media.updatedAt = now;
      if (media.productIds.length === 0) {
        orphanedFileIds.push(fileId);
      }
    }

    doc.media = doc.media.filter((m) => !orphanedFileIds.includes(m.fileId));
    await writeStore(doc);
    return { product, orphanedFileIds };
  });
}

export async function upsertMediaRecord(input: {
  fileId: string;
  userId: string;
  mimeType: string;
  sizeBytes: number;
}): Promise<MediaRecord> {
  return withLock(async () => {
    const doc = await readStore();
    const now = new Date().toISOString();
    const existing = doc.media.find((m) => m.fileId === input.fileId);
    if (existing) {
      existing.mimeType = input.mimeType;
      existing.sizeBytes = input.sizeBytes;
      existing.updatedAt = now;
      await writeStore(doc);
      return existing;
    }
    const media: MediaRecord = {
      fileId: input.fileId,
      userId: input.userId,
      productIds: [],
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      createdAt: now,
      updatedAt: now,
    };
    doc.media.push(media);
    await writeStore(doc);
    return media;
  });
}

export async function removeMediaRecord(
  userId: string,
  fileId: string,
): Promise<MediaRecord | null> {
  return withLock(async () => {
    const doc = await readStore();
    const index = doc.media.findIndex((m) => m.fileId === fileId && m.userId === userId);
    if (index < 0) return null;
    const [media] = doc.media.splice(index, 1);
    const now = new Date().toISOString();
    for (const product of doc.products) {
      if (product.userId !== userId) continue;
      if (!product.mediaIds.includes(fileId)) continue;
      product.mediaIds = product.mediaIds.filter((id) => id !== fileId);
      product.updatedAt = now;
    }
    for (const brand of doc.brands) {
      if (brand.userId === userId && brand.imageId === fileId) {
        brand.imageId = null;
        brand.updatedAt = now;
      }
    }
    for (const category of doc.categories) {
      if (category.userId === userId && category.imageId === fileId) {
        category.imageId = null;
        category.updatedAt = now;
      }
    }
    await writeStore(doc);
    return media;
  });
}

export async function productsUsingMedia(
  userId: string,
  fileId: string,
): Promise<ProductRecord[]> {
  const doc = await readStore();
  return doc.products.filter(
    (p) => p.userId === userId && p.mediaIds.includes(fileId),
  );
}

export async function remapMediaFileId(opts: {
  userId: string;
  fromFileId: string;
  toFileId: string;
  mimeType: string;
  sizeBytes: number;
}): Promise<void> {
  return withLock(async () => {
    const doc = await readStore();
    const now = new Date().toISOString();
    const from = doc.media.find(
      (m) => m.fileId === opts.fromFileId && m.userId === opts.userId,
    );
    if (!from) {
      throw Object.assign(new Error("Media not found"), { code: "NOT_FOUND" });
    }

    let to = doc.media.find(
      (m) => m.fileId === opts.toFileId && m.userId === opts.userId,
    );
    if (!to) {
      to = {
        fileId: opts.toFileId,
        userId: opts.userId,
        productIds: [...from.productIds],
        mimeType: opts.mimeType,
        sizeBytes: opts.sizeBytes,
        createdAt: now,
        updatedAt: now,
      };
      doc.media.push(to);
    } else {
      to.productIds = [...new Set([...to.productIds, ...from.productIds])];
      to.mimeType = opts.mimeType;
      to.sizeBytes = opts.sizeBytes;
      to.updatedAt = now;
    }

    for (const product of doc.products) {
      if (product.userId !== opts.userId) continue;
      product.mediaIds = product.mediaIds.map((id) =>
        id === opts.fromFileId ? opts.toFileId : id,
      );
      product.updatedAt = now;
    }

    for (const brand of doc.brands) {
      if (brand.userId === opts.userId && brand.imageId === opts.fromFileId) {
        brand.imageId = opts.toFileId;
        brand.updatedAt = now;
      }
    }
    for (const category of doc.categories) {
      if (
        category.userId === opts.userId &&
        category.imageId === opts.fromFileId
      ) {
        category.imageId = opts.toFileId;
        category.updatedAt = now;
      }
    }

    doc.media = doc.media.filter((m) => m.fileId !== opts.fromFileId);
    await writeStore(doc);
  });
}

/* ── Brands ── */

export async function listBrandsForUser(userId: string): Promise<BrandRecord[]> {
  const doc = await readStore();
  return doc.brands
    .filter((b) => b.userId === userId)
    .sort((a, b) => a.name.localeCompare(b.name, "fa"));
}

export async function getBrandForUser(
  userId: string,
  brandId: string,
): Promise<BrandRecord | null> {
  const doc = await readStore();
  return doc.brands.find((b) => b.id === brandId && b.userId === userId) ?? null;
}

export async function createBrand(input: {
  userId: string;
  name: string;
  description?: string;
  imageId?: string | null;
}): Promise<BrandRecord> {
  return withLock(async () => {
    const doc = await readStore();
    const now = new Date().toISOString();
    const brand: BrandRecord = {
      id: randomUUID(),
      userId: input.userId,
      name: input.name.trim(),
      slug: uniqueSlug(doc, input.name),
      description: (input.description ?? "").trim(),
      imageId: input.imageId ?? null,
      createdAt: now,
      updatedAt: now,
    };
    doc.brands.push(brand);
    await writeStore(doc);
    return brand;
  });
}

export async function updateBrand(
  userId: string,
  brandId: string,
  patch: {
    name?: string;
    description?: string;
    imageId?: string | null;
  },
): Promise<BrandRecord | null> {
  return withLock(async () => {
    const doc = await readStore();
    const brand = doc.brands.find((b) => b.id === brandId && b.userId === userId);
    if (!brand) return null;
    const now = new Date().toISOString();
    if (patch.name !== undefined) {
      brand.name = patch.name.trim();
      brand.slug = uniqueSlug(doc, patch.name, brand.id);
    }
    if (patch.description !== undefined) brand.description = patch.description.trim();
    if (patch.imageId !== undefined) brand.imageId = patch.imageId;
    brand.updatedAt = now;
    await writeStore(doc);
    return brand;
  });
}

export async function deleteBrand(
  userId: string,
  brandId: string,
): Promise<BrandRecord | null> {
  return withLock(async () => {
    const doc = await readStore();
    const index = doc.brands.findIndex((b) => b.id === brandId && b.userId === userId);
    if (index < 0) return null;
    const [brand] = doc.brands.splice(index, 1);
    const now = new Date().toISOString();
    for (const product of doc.products) {
      if (product.userId === userId && product.brandId === brandId) {
        product.brandId = null;
        product.updatedAt = now;
      }
    }
    await writeStore(doc);
    return brand;
  });
}

/* ── Categories ── */

export async function listCategoriesForUser(
  userId: string,
): Promise<CategoryRecord[]> {
  const doc = await readStore();
  return doc.categories
    .filter((c) => c.userId === userId)
    .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name, "fa"));
}

export async function getCategoryForUser(
  userId: string,
  categoryId: string,
): Promise<CategoryRecord | null> {
  const doc = await readStore();
  return (
    doc.categories.find((c) => c.id === categoryId && c.userId === userId) ?? null
  );
}

export async function createCategory(input: {
  userId: string;
  name: string;
  kind: CategoryKind;
  parentId?: string | null;
  description?: string;
  imageId?: string | null;
}): Promise<CategoryRecord> {
  return withLock(async () => {
    const doc = await readStore();
    const now = new Date().toISOString();
    const parentId = input.parentId ?? null;

    if (input.kind === "real" && parentId) {
      const parent = doc.categories.find(
        (c) => c.id === parentId && c.userId === input.userId && c.kind === "real",
      );
      if (!parent) {
        throw Object.assign(new Error("Invalid parent category"), {
          code: "VALIDATION_ERROR",
        });
      }
    }
    if (input.kind === "virtual" && parentId) {
      throw Object.assign(new Error("Group categories cannot have a parent"), {
        code: "VALIDATION_ERROR",
      });
    }

    const siblings = doc.categories.filter(
      (c) =>
        c.userId === input.userId &&
        c.kind === input.kind &&
        (c.parentId ?? null) === parentId,
    );
    const category: CategoryRecord = {
      id: randomUUID(),
      userId: input.userId,
      name: input.name.trim(),
      kind: input.kind,
      parentId: input.kind === "real" ? parentId : null,
      description: (input.description ?? "").trim(),
      imageId: input.imageId ?? null,
      position: siblings.length,
      createdAt: now,
      updatedAt: now,
    };
    doc.categories.push(category);
    await writeStore(doc);
    return category;
  });
}

export async function updateCategory(
  userId: string,
  categoryId: string,
  patch: {
    name?: string;
    parentId?: string | null;
    description?: string;
    imageId?: string | null;
  },
): Promise<CategoryRecord | null> {
  return withLock(async () => {
    const doc = await readStore();
    const category = doc.categories.find(
      (c) => c.id === categoryId && c.userId === userId,
    );
    if (!category) return null;
    const now = new Date().toISOString();

    if (patch.parentId !== undefined) {
      if (category.kind === "virtual") {
        throw Object.assign(new Error("Group categories cannot have a parent"), {
          code: "VALIDATION_ERROR",
        });
      }
      if (patch.parentId === categoryId) {
        throw Object.assign(new Error("Category cannot be its own parent"), {
          code: "VALIDATION_ERROR",
        });
      }
      if (patch.parentId) {
        const parent = doc.categories.find(
          (c) => c.id === patch.parentId && c.userId === userId && c.kind === "real",
        );
        if (!parent) {
          throw Object.assign(new Error("Invalid parent category"), {
            code: "VALIDATION_ERROR",
          });
        }
      }
      category.parentId = patch.parentId;
    }

    if (patch.name !== undefined) category.name = patch.name.trim();
    if (patch.description !== undefined) {
      category.description = patch.description.trim();
    }
    if (patch.imageId !== undefined) category.imageId = patch.imageId;
    category.updatedAt = now;
    await writeStore(doc);
    return category;
  });
}

export async function deleteCategory(
  userId: string,
  categoryId: string,
): Promise<CategoryRecord | null> {
  return withLock(async () => {
    const doc = await readStore();
    const index = doc.categories.findIndex(
      (c) => c.id === categoryId && c.userId === userId,
    );
    if (index < 0) return null;
    const [category] = doc.categories.splice(index, 1);
    const now = new Date().toISOString();

    for (const child of doc.categories) {
      if (child.userId === userId && child.parentId === categoryId) {
        child.parentId = category.parentId;
        child.updatedAt = now;
      }
    }
    for (const product of doc.products) {
      if (product.userId !== userId) continue;
      if (product.categoryId === categoryId) {
        product.categoryId = null;
        product.updatedAt = now;
      }
      if (product.groupCategoryIds.includes(categoryId)) {
        product.groupCategoryIds = product.groupCategoryIds.filter(
          (id) => id !== categoryId,
        );
        product.updatedAt = now;
      }
    }
    await writeStore(doc);
    return category;
  });
}
