"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchReportsDashboard } from "@/features/reports/service";

export function useReportsDashboard() {
  return useQuery({
    queryKey: ["admin", "reports"],
    queryFn: fetchReportsDashboard,
  });
}
