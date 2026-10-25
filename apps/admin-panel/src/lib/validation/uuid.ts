import { z } from "zod";

/** Accepts PostgreSQL UUID strings (seed IDs are not RFC-4122 strict). */
export const uuidSchema = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "Invalid UUID");

export const optionalUuidSchema = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  uuidSchema.optional(),
);

export const uuidArraySchema = z.array(uuidSchema);
