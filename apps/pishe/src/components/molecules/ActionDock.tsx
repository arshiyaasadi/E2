/**
 * @level molecule
 * Floating action island above the bottom navigation.
 * Radius/padding aligned with BottomNav for visual harmony.
 */
"use client";

import { cn } from "@/lib/cn";

export function ActionDock({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 z-40 px-pad-mol",
        /* Sit just above BottomNav island with a tight gap */
        "bottom-[calc(4.35rem+env(safe-area-inset-bottom))]",
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-auto mx-auto flex max-w-3xl items-center gap-atom-md rounded-2xl border border-border/80 bg-surface/95 px-pad-atom py-pad-atom backdrop-blur-md",
          "shadow-[0_10px_32px_rgba(15,23,42,0.12)] dark:shadow-[0_10px_32px_rgba(0,0,0,0.4)]",
          "animate-dock-in",
        )}
      >
        {children}
      </div>
    </div>
  );
}
