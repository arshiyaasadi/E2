"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchAdminOverview } from "@/features/admin/service";

export function useAdminOverview() {
  return useQuery({
    queryKey: ["admin", "overview"],
    queryFn: fetchAdminOverview,
  });
}
