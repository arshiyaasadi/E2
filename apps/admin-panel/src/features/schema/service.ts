import { apiClient } from "@/lib/api/client";
import type { SchemaTableGroup } from "@/lib/db/repositories/schema.repository";

export function fetchDatabaseSchema() {
  return apiClient.get<SchemaTableGroup[]>("/admin/schema");
}
