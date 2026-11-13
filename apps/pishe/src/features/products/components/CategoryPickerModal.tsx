"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Search, X } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { cn } from "@/lib/cn";
import {
  SEED_CATEGORY_TREE,
  findSeedCategoryPath,
  flattenSeedCategories,
  type SeedCategoryNode,
} from "@/features/products/seed/category-tree";

export function CategoryPickerModal({
  open,
  selectedId,
  onClose,
  onConfirm,
}: {
  open: boolean;
  selectedId: string | null;
  onClose: () => void;
  onConfirm: (categoryId: string) => void;
}) {
  const t = useTranslations("products.categoryPicker");
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [stack, setStack] = useState<SeedCategoryNode[]>([]);
  const [pickedId, setPickedId] = useState<string | null>(selectedId);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setPickedId(selectedId);
    if (selectedId) {
      const path = findSeedCategoryPath(SEED_CATEGORY_TREE, selectedId);
      if (path && path.length > 1) {
        setStack(path.slice(0, -1));
        return;
      }
    }
    setStack([]);
  }, [open, selectedId]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const currentChildren = useMemo(() => {
    if (stack.length === 0) return SEED_CATEGORY_TREE;
    return stack[stack.length - 1]?.children ?? [];
  }, [stack]);

  const searchHits = useMemo(() => {
    const q = query.trim();
    if (!q) return null;
    return flattenSeedCategories(SEED_CATEGORY_TREE).filter(
      (n) => !n.children?.length && n.name.includes(q),
    );
  }, [query]);

  const displayNodes = searchHits ?? currentChildren;
  const canContinue = Boolean(
    pickedId &&
      !findSeedCategoryNodeHasChildren(SEED_CATEGORY_TREE, pickedId),
  );

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[210] flex items-end justify-center bg-black/40 p-pad-mol sm:items-center">
      <button
        type="button"
        className="absolute inset-0"
        aria-label={t("close")}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal
        aria-label={t("title")}
        className="relative z-10 flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_16px_48px_rgba(15,23,42,0.22)]"
      >
        <header className="flex items-center justify-between gap-mol border-b border-border px-pad-mol py-pad-atom-md">
          <h2 className="text-base font-semibold text-foreground">
            {t("title")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-pad-atom text-muted hover:bg-surface-2 hover:text-foreground"
            aria-label={t("close")}
          >
            <X className="size-5" aria-hidden />
          </button>
        </header>

        <div className="flex flex-col gap-atom-md overflow-y-auto px-pad-mol py-pad-mol">
          <div className="relative">
            <Search
              className="pointer-events-none absolute start-pad-mol top-1/2 size-4 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("search")}
              className="h-control w-full rounded-xl border-0 bg-surface-2 pe-pad-mol ps-10 text-sm text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            />
          </div>

          {!searchHits && stack.length > 0 ? (
            <p className="text-xs text-muted">
              {stack.map((n) => n.name).join(" / ")}
            </p>
          ) : null}

          <ul className="grid grid-cols-2 overflow-hidden rounded-xl border border-border">
            {displayNodes.map((node, index) => {
              const isLeaf = !node.children?.length;
              const checked = pickedId === node.id;
              return (
                <li
                  key={node.id}
                  className={cn(
                    "border-border",
                    index % 2 === 0 ? "border-e" : "",
                    index >= 2 ? "border-t" : "",
                  )}
                >
                  <button
                    type="button"
                    className="flex w-full items-center gap-atom-md px-pad-atom-md py-pad-atom-md text-start text-sm text-foreground hover:bg-surface-2"
                    onClick={() => {
                      if (isLeaf) {
                        setPickedId(node.id);
                        return;
                      }
                      setQuery("");
                      setPickedId(null);
                      setStack((prev) => [...prev, node]);
                    }}
                  >
                    <span
                      className={cn(
                        "size-4 shrink-0 rounded-full border",
                        checked
                          ? "border-primary bg-primary"
                          : "border-border bg-surface",
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 leading-snug">
                      {node.name}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {displayNodes.length === 0 ? (
            <p className="text-sm text-muted">{t("empty")}</p>
          ) : null}
        </div>

        <footer className="flex items-center justify-end gap-atom-md border-t border-border px-pad-mol py-pad-atom-md">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={stack.length === 0 && !searchHits}
            onClick={() => {
              if (searchHits) {
                setQuery("");
                return;
              }
              setStack((prev) => prev.slice(0, -1));
              setPickedId(null);
            }}
          >
            {t("back")}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!canContinue || !pickedId}
            onClick={() => {
              if (!pickedId) return;
              onConfirm(pickedId);
              onClose();
            }}
          >
            {t("continue")}
          </Button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

function findSeedCategoryNodeHasChildren(
  tree: SeedCategoryNode[],
  id: string,
): boolean {
  const path = findSeedCategoryPath(tree, id);
  const node = path?.[path.length - 1];
  return Boolean(node?.children?.length);
}
