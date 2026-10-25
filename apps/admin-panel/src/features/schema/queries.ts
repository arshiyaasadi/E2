"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchDatabaseSchema } from "@/features/schema/service";

export function useDatabaseSchema() {
  return useQuery({
    queryKey: ["admin", "schema"],
    queryFn: fetchDatabaseSchema,
  });
}
