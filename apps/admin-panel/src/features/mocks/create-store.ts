"use client";

import { useSyncExternalStore } from "react";

export type MockStore<T> = {
  getState: () => T;
  setState: (updater: (prev: T) => T) => void;
  subscribe: (listener: () => void) => () => void;
  reset: (next?: T) => void;
};

export function createMockStore<T>(initial: T): MockStore<T> {
  let state = structuredClone(initial);
  const listeners = new Set<() => void>();
  const snapshot = structuredClone(initial);

  return {
    getState: () => state,
    setState: (updater) => {
      state = updater(state);
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    reset: (next) => {
      state = structuredClone(next ?? snapshot);
      listeners.forEach((listener) => listener());
    },
  };
}

export function useMockStore<T, S>(store: MockStore<T>, selector: (state: T) => S): S {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getState()),
  );
}

export function newId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
