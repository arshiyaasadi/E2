/**
 * @level template
 * @spacing internal: gap-mol | external: none
 */
"use client";

import { Suspense } from "react";
import { AppHeader } from "@/components/molecules/AppHeader";
import { BottomNav } from "@/components/molecules/BottomNav";
import { ThemeSync } from "@/components/molecules/ThemeSync";
import {
  ProfileOverlays,
  ProfileTrigger,
} from "@/features/auth/components/ProfileSheet";
import {
  NotificationBell,
  NotificationModal,
} from "@/features/notifications/components/NotificationBell";
import {
  BottomActionsProvider,
  useBottomActionsSlot,
} from "@/providers/BottomActionsProvider";
import {
  HeaderStatusProvider,
  useHeaderStatusSlot,
} from "@/providers/HeaderStatusProvider";
import type { AppCrumb } from "@/config/routes";
import { cn } from "@/lib/cn";

function AppShell({
  title,
  crumbs,
  brand,
  actions,
  children,
  showBottomNav,
  denseMain,
}: {
  title?: string;
  crumbs?: AppCrumb[];
  brand: boolean;
  actions?: React.ReactNode;
  children: React.ReactNode;
  showBottomNav: boolean;
  denseMain: boolean;
}) {
  const { hasActions: hasPageActions } = useBottomActionsSlot();
  const { status } = useHeaderStatusSlot();

  return (
    <div
      className={cn(
        "min-h-dvh bg-background transition-[padding] duration-300",
        hasPageActions ? "pb-32" : "pb-28",
      )}
    >
      <ThemeSync />
      <AppHeader
        title={title}
        crumbs={crumbs}
        brand={brand}
        actions={actions}
        status={status}
        trailing={
          <Suspense fallback={null}>
            <div className="flex items-center gap-atom-md">
              <NotificationBell />
              <ProfileTrigger />
            </div>
          </Suspense>
        }
      />
      <main
        className={cn(
          "mx-auto max-w-3xl px-pad-mol-md pb-pad-org",
          denseMain ? "pt-0" : "pt-pad-org",
        )}
      >
        {children}
      </main>
      {showBottomNav ? <BottomNav /> : null}
      <Suspense fallback={null}>
        <ProfileOverlays />
        <NotificationModal />
      </Suspense>
    </div>
  );
}

export function AppTemplate({
  title,
  crumbs,
  brand = false,
  actions,
  children,
  showBottomNav = true,
  denseMain = false,
  dockPadding = false,
}: {
  title?: string;
  crumbs?: AppCrumb[];
  brand?: boolean;
  actions?: React.ReactNode;
  children: React.ReactNode;
  showBottomNav?: boolean;
  /** Skip top padding under the sticky header (forms that already feel spaced). */
  denseMain?: boolean;
  /** @deprecated Padding adapts automatically when page actions are registered. */
  dockPadding?: boolean;
}) {
  void dockPadding;
  return (
    <BottomActionsProvider>
      <HeaderStatusProvider>
        <AppShell
          title={title}
          crumbs={crumbs}
          brand={brand}
          actions={actions}
          showBottomNav={showBottomNav}
          denseMain={denseMain}
        >
          {children}
        </AppShell>
      </HeaderStatusProvider>
    </BottomActionsProvider>
  );
}
