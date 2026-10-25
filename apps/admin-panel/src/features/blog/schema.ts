import { z } from "zod";

export const englishSlugSchema = z
  .string()
  .min(1, "Slug is required")
  .max(220)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase English kebab-case");

export const blogFaqItemSchema = z.object({
  question: z.string().min(1).max(300),
  answer: z.string().min(1).max(2000),
});

export const blogPostStatusSchema = z.enum(["draft", "pending", "published"]);

const nullableUuid = z.union([z.string().uuid(), z.null()]).optional();
const nullableString = z.union([z.string(), z.null()]).optional();

export const blogPostContentSchema = z.record(z.string(), z.unknown());

export const createBlogPostSchema = z.object({
  titleFa: z.string().min(1).max(200),
  title: z.string().max(200).nullable().optional(),
  slug: englishSlugSchema,
  excerpt: z.string().max(2000).nullable().optional(),
  excerptFa: z.string().max(2000).nullable().optional(),
  content: blogPostContentSchema.optional(),
  coverImageId: nullableUuid,
  status: blogPostStatusSchema.optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
  categoryIds: z.array(z.string().uuid()).optional(),
  tagIds: z.array(z.string().uuid()).optional(),
  faqItems: z.array(blogFaqItemSchema).max(20).optional(),
  seoTitle: z.string().max(180).nullable().optional(),
  seoDescription: z.string().max(320).nullable().optional(),
  ogTitle: z.string().max(180).nullable().optional(),
  ogDescription: z.string().max(320).nullable().optional(),
  ogImageId: nullableUuid,
  canonicalUrl: z.string().max(500).nullable().optional(),
  metaRobots: z.string().max(60).optional(),
});

export const updateBlogPostSchema = createBlogPostSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: "No fields to update" });

/** Autosave: allow incomplete SEO; still require slug format when provided */
export const patchBlogPostSchema = z
  .object({
    titleFa: z.string().min(1).max(200).optional(),
    title: z.string().max(200).nullable().optional(),
    slug: englishSlugSchema.optional(),
    excerpt: z.string().max(2000).nullable().optional(),
    excerptFa: z.string().max(2000).nullable().optional(),
    content: blogPostContentSchema.optional(),
    coverImageId: nullableUuid,
    status: blogPostStatusSchema.optional(),
    scheduledAt: z.string().datetime().nullable().optional(),
    categoryIds: z.array(z.string().uuid()).optional(),
    tagIds: z.array(z.string().uuid()).optional(),
    faqItems: z.array(blogFaqItemSchema).max(20).optional(),
    seoTitle: z.string().max(180).nullable().optional(),
    seoDescription: z.string().max(320).nullable().optional(),
    ogTitle: z.string().max(180).nullable().optional(),
    ogDescription: z.string().max(320).nullable().optional(),
    ogImageId: nullableUuid,
    canonicalUrl: z.string().max(500).nullable().optional(),
    metaRobots: z.string().max(60).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "No fields to update" });

export const blogPostFormSchema = z.object({
  titleFa: z.string().min(1, "عنوان فارسی الزامی است").max(200),
  title: z.string().max(200).optional().or(z.literal("")),
  slug: englishSlugSchema,
  excerpt: z.string().max(2000).optional().or(z.literal("")),
  excerptFa: z.string().max(2000).optional().or(z.literal("")),
  content: blogPostContentSchema,
  coverImageId: z.string().uuid().nullable(),
  status: blogPostStatusSchema,
  scheduledAt: z.string().nullable().optional(),
  categoryIds: z.array(z.string().uuid()),
  tagIds: z.array(z.string().uuid()),
  faqItems: z.array(blogFaqItemSchema).max(20),
  seoTitle: z.string().max(180).optional().or(z.literal("")),
  seoDescription: z.string().max(320).optional().or(z.literal("")),
  ogTitle: z.string().max(180).optional().or(z.literal("")),
  ogDescription: z.string().max(320).optional().or(z.literal("")),
  ogImageId: z.string().uuid().nullable(),
  canonicalUrl: z.string().max(500).optional().or(z.literal("")),
  metaRobots: z.string().max(60).optional(),
});

export type BlogPostFormValues = z.infer<typeof blogPostFormSchema>;

export const createBlogCategorySchema = z.object({
  parentId: nullableUuid,
  name: nullableString,
  nameFa: z.string().min(1).max(150),
  slug: englishSlugSchema,
  description: nullableString,
  position: z.number().int().min(0).optional(),
});

export const updateBlogCategorySchema = createBlogCategorySchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: "No fields to update" });

export const createBlogTagSchema = z.object({
  name: nullableString,
  nameFa: z.string().min(1).max(100),
  slug: englishSlugSchema,
});

export const updateBlogTagSchema = createBlogTagSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: "No fields to update" });

export const emptyTipTapDoc: Record<string, unknown> = {
  type: "doc",
  content: [{ type: "paragraph" }],
};
