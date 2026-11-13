"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type BottomActionsContextValue = {
  slotEl: HTMLElement | null;
  setSlotEl: (el: HTMLElement | null) => void;
  hasActions: boolean;
  register: () => () => void;
};

const BottomActionsContext = createContext<BottomActionsContextValue | null>(
  null,
);

export function BottomActionsProvider({ children }: { children: ReactNode }) {
  const [slotEl, setSlotEl] = useState<HTMLElement | null>(null);
  const [count, setCount] = useState(0);

  const register = useCallback(() => {
    setCount((c) => c + 1);
    return () => setCount((c) => Math.max(0, c - 1));
  }, []);

  const value = useMemo(
    () => ({
      slotEl,
      setSlotEl,
      hasActions: count > 0,
      register,
    }),
    [slotEl, count, register],
  );

  return (
    <BottomActionsContext.Provider value={value}>
      {children}
    </BottomActionsContext.Provider>
  );
}

export function useBottomActionsSlot() {
  const ctx = useContext(BottomActionsContext);
  if (!ctx) {
    throw new Error(
      "useBottomActionsSlot must be used within BottomActionsProvider",
    );
  }
  return ctx;
}

/**
 * Portal page actions into the unified bottom chrome above the nav.
 * Renders nothing in-place; content appears in BottomNav's action slot.
 */
export function BottomActions({ children }: { children: ReactNode }) {
  const ctx = useContext(BottomActionsContext);

  useEffect(() => {
    if (!ctx) return;
    return ctx.register();
  }, [ctx]);

  if (!ctx?.slotEl) return null;
  return createPortal(children, ctx.slotEl);
}
