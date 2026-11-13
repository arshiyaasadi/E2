import { z } from "zod";
import { PRODUCT_UNITS } from "@/features/products/types";

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;

export const productUnitSchema = z.enum(PRODUCT_UNITS);

export const stage1CreateSchema = z.object({
  title: z.string().trim().min(2).max(100),
  priceRial: z.number().int().min(0).optional().default(0),
  description: z.string().trim().max(1000).optional().default(""),
  mediaIds: z.array(z.string().uuid()).min(1).max(10),
  brandId: z.string().uuid().nullable().optional().default(null),
  categoryId: z.string().uuid().nullable().optional().default(null),
  groupCategoryIds: z.array(z.string().uuid()).max(20).optional().default([]),
});

export const stage1PatchSchema = z.object({
  title: z.string().trim().min(2).max(100).optional(),
  priceRial: z.number().int().min(0).optional(),
  description: z.string().trim().max(1000).optional(),
  mediaIds: z.array(z.string().uuid()).min(1).max(10).optional(),
  brandId: z.string().uuid().nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  groupCategoryIds: z.array(z.string().uuid()).max(20).optional(),
});

const variantAttrSchema = z.object({
  kind: z.enum(["color", "size", "custom", "none"]),
  label: z.string().trim().max(40).optional(),
  values: z.array(z.string().trim().min(1).max(40)).max(20),
});

const variantRowSchema = z.object({
  id: z.string().min(1),
  attr1Value: z.string().trim().min(1),
  attr2Value: z.string().trim().min(1).optional(),
  priceRial: z.number().int().min(0),
  active: z.boolean(),
});

export const stage2PatchSchema = z.object({
  unit: productUnitSchema.optional(),
  variants: z
    .object({
      attr1: variantAttrSchema,
      attr2: variantAttrSchema.optional(),
      rows: z.array(variantRowSchema).max(50),
    })
    .optional(),
  complete: z.literal(true).optional(),
});

export const productPatchSchema = stage1PatchSchema
  .merge(stage2PatchSchema)
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export function isAllowedImageMime(mime: string): boolean {
  return (ALLOWED_MIME as readonly string[]).includes(mime);
}

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
