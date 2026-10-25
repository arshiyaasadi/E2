"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { hasPermission } from "@/config/roles";
import { ROUTES } from "@/config/routes";
import { useAuthUser } from "@/store/slices/auth.slice";

/** Forbid /admin/project/* without settings.manage (hides Project management from editors). */
export default function ProjectSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const user = useAuthUser();

  const allowed = hasPermission(user.permissions ?? [], "settings.manage", user.role);

  useEffect(() => {
    if (!user.userId) return;
    if (!allowed) {
      router.replace(ROUTES.adminProducts);
    }
  }, [allowed, router, user.userId]);

  if (!user.userId || !allowed) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-neutral-500">
        Checking access…
      </div>
    );
  }

  return <>{children}</>;
}
