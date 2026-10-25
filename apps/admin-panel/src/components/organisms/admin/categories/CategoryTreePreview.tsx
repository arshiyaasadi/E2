"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { GitBranch, ListTree, Maximize2, Minimize2, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, Input, Modal, ModalBody, Select, Spinner, Tabs } from "@/components/atoms";
import { CategoryMegaMenuPreview } from "@/components/organisms/admin/categories/CategoryMegaMenuPreview";
import { CategorySortableTree } from "@/components/organisms/admin/categories/CategorySortableTree";
import { buildCategoryForest, filterCategoryForest, type CategoryTreeFilterMode } from "@/features/categories/tree";
import type { CategoryDto } from "@/types/domain";
import { cn } from "@/lib/utils";

const CategoryD3TreeView = dynamic(
  () =>
    import("@/components/organisms/admin/categories/CategoryD3TreeView").then(
      (mod) => mod.CategoryD3TreeView,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[min(52vh,560px)] items-center justify-center">
        <Spinner size="lg" />
      </div>
    ),
  },
);

type PanelTab = "tree" | "megaMenu";
type TreeViewMode = "nested" | "d3";

export function CategoryTreePreview({
  categories,
  selectedId,
  onSelect,
  onEdit,
  onView,
  onDelete,
}: {
  categories: CategoryDto[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onEdit?: (category: CategoryDto) => void;
  onView?: (category: CategoryDto) => void;
  onDelete?: (category: CategoryDto) => void;
}) {
  const t = useTranslations("admin.categories");
  const [panelTab, setPanelTab] = useState<PanelTab>("tree");
  const [mode, setMode] = useState<TreeViewMode>("nested");
  const [query, setQuery] = useState("");
  const [filterMode, setFilterMode] = useState<CategoryTreeFilterMode>("all");
  const [d3ModalOpen, setD3ModalOpen] = useState(false);
  const forest = useMemo(() => buildCategoryForest(categories), [categories]);
  const filteredForest = useMemo(
    () => filterCategoryForest(forest, query, filterMode),
    [filterMode, forest, query],
  );
  const filteredCategories = useMemo(() => {
    const ids = new Set<string>();
    const walk = (nodes: typeof filteredForest) => {
      for (const node of nodes) {
        ids.add(node.id);
        walk(node.children);
      }
    };
    walk(filteredForest);
    return categories.filter((item) => ids.has(item.id));
  }, [categories, filteredForest]);

  const d3Props = {
    categories: filteredCategories,
    selectedId,
    onSelect,
    onEdit,
    onView,
    onDelete,
  };

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="border-b border-white/45 px-mol-md py-pad-mol glass-toolbar">
        <Tabs
          variant="boxed"
          active={panelTab}
          onChange={(key) => setPanelTab(key as PanelTab)}
          items={[
            { key: "tree", label: t("tabs.tree") },
            { key: "megaMenu", label: t("tabs.megaMenu") },
          ]}
        />
      </div>

      {panelTab === "megaMenu" ? (
        <CategoryMegaMenuPreview categories={categories} embedded />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-pad-atom border-b border-white/45 px-mol-md py-pad-mol">
            <div>
              <h3 className="text-base font-semibold text-foreground">{t("tree.title")}</h3>
              <p className="mt-atom-md text-xs text-muted">{t("tree.subtitle")}</p>
            </div>

            <div className="flex flex-wrap items-center gap-pad-atom">
              <button
                type="button"
                onClick={() => setMode("nested")}
                className={cn(
                  "inline-flex items-center gap-pad-atom rounded-full border px-pad-mol py-pad-atom text-xs transition-all",
                  mode === "nested"
                    ? "border-primary/30 bg-primary/10 font-medium text-primary"
                    : "border-white/50 bg-white/40 text-muted hover:text-foreground",
                )}
              >
                <ListTree className="size-3.5" />
                {t("tree.nested")}
              </button>
              <button
                type="button"
                onClick={() => setMode("d3")}
                className={cn(
                  "inline-flex items-center gap-pad-atom rounded-full border px-pad-mol py-pad-atom text-xs transition-all",
                  mode === "d3"
                    ? "border-primary/30 bg-primary/10 font-medium text-primary"
                    : "border-white/50 bg-white/40 text-muted hover:text-foreground",
                )}
              >
                <GitBranch className="size-3.5" />
                {t("tree.d3")}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-pad-atom border-b border-white/40 px-mol-md py-pad-mol sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <Input
                placeholder={t("tree.searchPlaceholder")}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                startAddon={<Search className="size-4" />}
                aria-label={t("tree.searchLabel")}
              />
            </div>
            <div className="w-full shrink-0 sm:w-44">
              <Select
                value={filterMode}
                onChange={(event) => setFilterMode(event.target.value as CategoryTreeFilterMode)}
                aria-label={t("tree.filterLabel")}
                options={[
                  { value: "all", label: t("tree.filters.all") },
                  { value: "roots", label: t("tree.filters.roots") },
                  { value: "parents", label: t("tree.filters.parents") },
                  { value: "leaves", label: t("tree.filters.leaves") },
                ]}
              />
            </div>
          </div>

          {mode === "nested" ? (
            <CategorySortableTree
              categories={filteredCategories}
              selectedId={selectedId}
              onSelect={onSelect}
              onEdit={onEdit}
              onView={onView}
              onDelete={onDelete}
            />
          ) : (
            <div className="relative p-pad-mol">
              <button
                type="button"
                onClick={() => setD3ModalOpen(true)}
                className="absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-lg border border-white/60 bg-white/90 px-2.5 py-1.5 text-xs text-muted shadow-sm transition-colors hover:text-foreground"
                aria-label={t("tree.d3Expand")}
              >
                <Maximize2 className="size-3.5" />
                {t("tree.d3Expand")}
              </button>
              <CategoryD3TreeView {...d3Props} />
            </div>
          )}

          <Modal
            open={d3ModalOpen}
            onClose={() => setD3ModalOpen(false)}
            size="full"
            className="flex max-h-[calc(100vh-2rem)] flex-col overflow-hidden"
            closeOnBackdrop={false}
          >
            <div className="flex items-center justify-between border-b border-border px-mol-md py-pad-mol">
              <div>
                <h2 className="text-base font-semibold text-foreground">{t("tree.d3ModalTitle")}</h2>
                <p className="mt-atom-md text-xs text-muted">{t("tree.d3ModalSubtitle")}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setD3ModalOpen(false)}
                  className="inline-flex items-center gap-1 rounded-lg px-pad-atom-md py-pad-atom text-sm text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                  aria-label={t("tree.d3Minimize")}
                >
                  <Minimize2 className="size-4" />
                  {t("tree.d3Minimize")}
                </button>
                <button
                  type="button"
                  onClick={() => setD3ModalOpen(false)}
                  className="rounded-lg p-atom text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                  aria-label={t("tree.d3Close")}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </button>
              </div>
            </div>
            <ModalBody className="flex min-h-0 flex-1 flex-col py-pad-mol">
              <CategoryD3TreeView
                {...d3Props}
                heightClassName="h-[min(72vh,760px)]"
                className="min-h-0 flex-1"
              />
            </ModalBody>
          </Modal>
        </>
      )}
    </Card>
  );
}
