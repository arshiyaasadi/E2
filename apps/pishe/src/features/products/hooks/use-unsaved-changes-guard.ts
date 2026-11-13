"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * Blocks in-app link clicks / back / refresh while `enabled`.
 * Shows a confirm flow via `pendingHref` (null = idle).
 */
export function useUnsavedChangesGuard(enabled: boolean) {
  const router = useRouter();
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const allowNextRef = useRef(false);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const clearPending = useCallback(() => setPendingHref(null), []);

  const confirmLeave = useCallback(() => {
    const href = pendingHref;
    setPendingHref(null);
    if (!href) return;
    allowNextRef.current = true;
    if (href === "__back__") {
      router.back();
      return;
    }
    router.push(href);
  }, [pendingHref, router]);

  useEffect(() => {
    if (!enabled) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    window.history.pushState({ __pisheUnsaved: true }, "");

    const onPopState = () => {
      if (allowNextRef.current) {
        allowNextRef.current = false;
        return;
      }
      if (!enabledRef.current) return;
      window.history.pushState({ __pisheUnsaved: true }, "");
      setPendingHref("__back__");
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [enabled]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!enabledRef.current) return;
      if (allowNextRef.current) {
        allowNextRef.current = false;
        return;
      }
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const el = e.target as Element | null;
      const anchor = el?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.hasAttribute("download")) return;
      if (anchor.target && anchor.target !== "_self") return;

      const raw = anchor.getAttribute("href");
      if (!raw || raw.startsWith("#") || raw.startsWith("mailto:") || raw.startsWith("tel:")) {
        return;
      }

      let url: URL;
      try {
        url = new URL(raw, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;

      const next = `${url.pathname}${url.search}${url.hash}`;
      const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (next === current) return;
      if (url.pathname === pathname && !url.search && !url.hash) {
        // still allow query-less same path only when truly same
      }

      e.preventDefault();
      e.stopPropagation();
      setPendingHref(next);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [pathname]);

  return {
    pendingHref,
    clearPending,
    confirmLeave,
  };
}
