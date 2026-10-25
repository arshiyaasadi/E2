"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Eye, FolderTree, ImageIcon, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { CategoryTreeNode } from "@/features/categories/tree";
import { cn } from "@/lib/utils";

function CategoryThumb({ url, name }: { url?: string | null; name: string }) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt={name} className="size-10 shrink-0 rounded-xl object-cover ring-1 ring-white/60" />
    );
  }

  return (
    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/55 text-muted ring-1 ring-white/60">
      <ImageIcon className="size-4" />
    </div>
  );
}

function NestedCategoryNode({
  node,
  depth,
  expandedIds,
  onToggle,
  selectedId,
  onSelect,
  onEdit,
  onView,
  onDelete,
}: {
  node: CategoryTreeNode;
  depth: number;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onEdit?: (node: CategoryTreeNode) => void;
  onView?: (node: CategoryTreeNode) => void;
  onDelete?: (node: CategoryTreeNode) => void;
}) {
  const t = useTranslations("admin.categories");
  const active = selectedId === node.id;
  const hasChildren = node.children.length > 0;
  const expanded = expandedIds.has(node.id);

  return (
    <li className="flex flex-col gap-pad-atom">
      <div
        className={cn(
          "flex items-center gap-pad-atom-md rounded-xl border px-pad-mol py-pad-atom-md transition-all",
          active
            ? "border-primary/30 bg-primary/10 shadow-sm ring-1 ring-primary/15"
            : "border-white/45 bg-white/40 hover:bg-white/65",
        )}
        style={{ marginInlineStart: `${depth * 1.25}rem` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggle(node.id)}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-white/60 bg-white/50 px-2 py-1.5 text-[10px] font-medium text-muted transition-colors hover:bg-white/80 hover:text-foreground"
            aria-expanded={expanded}
            aria-label={expanded ? t("tree.collapse") : t("tree.expand")}
          >
            <ChevronDown className={cn("size-3.5 transition-transform", !expanded && "-rotate-90")} />
            <span>{node.children.length}</span>
          </button>
        ) : (
          <span className="inline-flex size-8 shrink-0" aria-hidden />
        )}

        <button
          type="button"
          onClick={() => onSelect(node.id)}
          className="flex min-w-0 flex-1 items-center gap-pad-atom-md text-start"
        >
          <CategoryThumb url={node.image?.url} name={node.name} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-foreground">{node.nameFa || node.name}</p>
            {node.nameFa && node.name !== node.nameFa ? (
              <p className="truncate text-[11px] text-muted" dir="ltr">
                {node.name}
              </p>
            ) : null}
            <p className="truncate font-mono text-[11px] text-muted" dir="ltr">
              {node.slug}
            </p>
          </div>
        </button>

        <div className="flex shrink-0 items-center gap-1">
          {onView ? (
            <button
              type="button"
              onClick={() => onView(node)}
              className="inline-flex items-center justify-center rounded-lg border border-white/60 bg-white/65 p-2 text-muted transition hover:text-foreground"
              aria-label={`View ${node.name}`}
            >
              <Eye className="size-4" />
            </button>
          ) : null}
          {onEdit ? (
            <button
              type="button"
              onClick={() => onEdit(node)}
              className="inline-flex items-center justify-center rounded-lg border border-white/60 bg-white/65 p-2 text-muted transition hover:text-foreground"
              aria-label={`Edit ${node.name}`}
            >
              <Pencil className="size-4" />
            </button>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              onClick={() => onDelete(node)}
              className="inline-flex items-center justify-center rounded-lg border border-red-200/80 bg-red-50/80 p-2 text-danger transition hover:bg-red-100"
              aria-label={`Delete ${node.name}`}
            >
              <Trash2 className="size-4" />
            </button>
          ) : null}
        </div>
      </div>

      {hasChildren && expanded ? (
        <ul className="flex flex-col gap-pad-atom">
          {node.children.map((child) => (
            <NestedCategoryNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedIds={expandedIds}
              onToggle={onToggle}
              selectedId={selectedId}
              onSelect={onSelect}
              onEdit={onEdit}
              onView={onView}
              onDelete={onDelete}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function CategoryNestedTree({
  forest,
  selectedId,
  onSelect,
  onEdit,
  onView,
  onDelete,
  expandAll = false,
}: {
  forest: CategoryTreeNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onEdit?: (node: CategoryTreeNode) => void;
  onView?: (node: CategoryTreeNode) => void;
  onDelete?: (node: CategoryTreeNode) => void;
  expandAll?: boolean;
}) {
  const t = useTranslations("admin.categories");
  const defaultExpanded = useMemo(() => {
    const ids = new Set<string>();
    const collect = (node: CategoryTreeNode) => {
      ids.add(node.id);
      if (expandAll) {
        for (const child of node.children) collect(child);
      }
    };
    for (const node of forest) collect(node);
    return ids;
  }, [expandAll, forest]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(defaultExpanded);

  useEffect(() => {
    setExpandedIds(defaultExpanded);
  }, [defaultExpanded]);

  function toggleNode(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  if (!forest.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-pad-atom-md py-mol-lg text-muted">
        <FolderTree className="size-8 opacity-60" />
        <p className="text-sm">{t("tree.empty")}</p>
      </div>
    );
  }

  return (
    <ul className="flex max-h-[min(52vh,560px)] flex-col gap-pad-atom overflow-y-auto p-pad-mol">
      {forest.map((node) => (
        <NestedCategoryNode
          key={node.id}
          node={node}
          depth={0}
          expandedIds={expandedIds}
          onToggle={toggleNode}
          selectedId={selectedId}
          onSelect={onSelect}
          onEdit={onEdit}
          onView={onView}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
