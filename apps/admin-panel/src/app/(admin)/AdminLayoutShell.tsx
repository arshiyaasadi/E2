"use client";

import { AdminSidebar } from "@/components/organisms/admin/AdminSidebar";
import { AuthHydrator } from "@/features/auth/AuthHydrator";

export function AdminLayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-mesh-bg flex min-h-dvh">
      <AuthHydrator />
      <AdminSidebar />
      <main className="min-h-dvh min-w-0 flex-1 overflow-auto p-mol-md lg:p-mol-lg">{children}</main>
    </div>
  );
}
