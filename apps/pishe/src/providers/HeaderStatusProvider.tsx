"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type HeaderStatusTone =
  | "muted"
  | "success"
  | "warning"
  | "danger"
  | "primary";

export type HeaderStatusValue = {
  label: string;
  tone?: HeaderStatusTone;
};

type HeaderStatusContextValue = {
  status: HeaderStatusValue | null;
  setStatus: (value: HeaderStatusValue | null) => void;
};

const HeaderStatusContext = createContext<HeaderStatusContextValue | null>(
  null,
);

export function HeaderStatusProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [status, setStatusState] = useState<HeaderStatusValue | null>(null);
  const setStatus = useCallback((value: HeaderStatusValue | null) => {
    setStatusState(value);
  }, []);

  const value = useMemo(
    () => ({ status, setStatus }),
    [status, setStatus],
  );

  return (
    <HeaderStatusContext.Provider value={value}>
      {children}
    </HeaderStatusContext.Provider>
  );
}

export function useHeaderStatusSlot() {
  const ctx = useContext(HeaderStatusContext);
  if (!ctx) {
    throw new Error(
      "useHeaderStatusSlot must be used within HeaderStatusProvider",
    );
  }
  return ctx;
}

/** Register a colored status label into the app header; clears on unmount. */
export function useHeaderStatus(value: HeaderStatusValue | null) {
  const ctx = useContext(HeaderStatusContext);
  const label = value?.label ?? null;
  const tone = value?.tone ?? "muted";

  useEffect(() => {
    if (!ctx) return;
    if (!label) {
      ctx.setStatus(null);
      return () => ctx.setStatus(null);
    }
    ctx.setStatus({ label, tone });
    return () => ctx.setStatus(null);
  }, [ctx, label, tone]);
}
