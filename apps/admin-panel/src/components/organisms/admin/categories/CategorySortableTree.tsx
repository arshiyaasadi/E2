"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronsDownUp,
  ChevronsUpDown,
  ChevronDown,
  Eye,
  EyeOff,
  FolderTree,
  GripVertical,
  ImageIcon,
  Pencil,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useReorderCategories } from "@/features/categories/queries";
import {
  buildCategoryForest,
  type CategoryTreeNode,
} from "@/features/categories/tree";
import type { CategoryDto, CategoryReorderItem } from "@/types/domain";
import { cn } from "@/lib/utils";
import { handleApiError } from "@/lib/api/client";

type FlatNode = {
  id: string;
  parentId: string | null;
  depth: number;
  category: CategoryTreeNode;
};

function flattenForest(nodes: CategoryTreeNode[], parentId: string | null = null, depth = 0): FlatNode[] {
  const result: FlatNode[] = [];
  for (const node of nodes) {
    result.push({ id: node.id, parentId, depth, category: node });
    if (node.children.length) {
      result.push(...flattenForest(node.children, node.id, depth + 1));
    }
  }
  return result;
}

function forestFromFlat(flat: FlatNode[]): CategoryTreeNode[] {
  const byId = new Map<string, CategoryTreeNode>();
  for (const item of flat) {
    byId.set(item.id, { ...item.category, children: [], parentId: item.parentId, position: 0 });
  }
  const roots: CategoryTreeNode[] = [];
  for (const item of flat) {
    const node = byId.get(item.id)!;
    if (item.parentId && byId.has(item.parentId)) {
      byId.get(item.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const assignPositions = (nodes: CategoryTreeNode[]) => {
    nodes.forEach((n, i) => {
      n.position = i;
      assignPositions(n.children);
    });
  };
  assignPositions(roots);
  return roots;
}

function toReorderPayload(flat: FlatNode[]): CategoryReorderItem[] {
  const siblingIndex = new Map<string, number>();
  return flat.map((item) => {
    const key = item.parentId ?? "__root__";
    const position = siblingIndex.get(key) ?? 0;
    siblingIndex.set(key, position + 1);
    return { id: item.id, parentId: item.parentId, position };
  });
}

function parentIdsWithChildren(flat: FlatNode[]): Set<string> {
  return new Set(flat.filter((item) => item.category.children.length > 0).map((item) => item.id));
}

function CategoryThumb({
  url,
  name,
  size,
}: {
  url?: string | null;
  name: string;
  size: "sm" | "md";
}) {
  const box = size === "md" ? "size-10 rounded-xl" : "size-7 rounded-lg";
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt={name} className={cn(box, "shrink-0 object-cover ring-1 ring-white/60")} />
    );
  }
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center bg-white/55 text-muted ring-1 ring-white/60",
        box,
      )}
    >
      <ImageIcon className={size === "md" ? "size-4" : "size-3"} />
    </div>
  );
}

function SortableRow({
  item,
  selectedId,
  onSelect,
  onEdit,
  onView,
  onDelete,
  collapsed,
  onToggle,
}: {
  item: FlatNode;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onEdit?: (node: CategoryTreeNode) => void;
  onView?: (node: CategoryTreeNode) => void;
  onDelete?: (node: CategoryTreeNode) => void;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const t = useTranslations("admin.categories");
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const node = item.category;
  const hasChildren = node.children.length > 0;
  const active = selectedId === node.id;
  const isRoot = item.depth === 0;
  const showThumb = item.depth <= 1;

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        paddingInlineStart: `${item.depth * 1.1}rem`,
      }}
      className={cn("list-none", isDragging && "opacity-40")}
    >
      <div
        className={cn(
          "relative flex items-center gap-pad-atom-md border transition-all",
          isRoot
            ? "rounded-2xl px-pad-mol py-pad-atom-md"
            : "rounded-xl px-pad-atom-md py-pad-atom",
          active
            ? "border-primary/30 bg-primary/10 shadow-sm ring-1 ring-primary/15"
            : isRoot
              ? "border-white/55 bg-white/55 hover:bg-white/75"
              : "border-white/35 bg-white/30 hover:bg-white/55",
        )}
      >
        {item.depth > 0 ? (
          <span
            className="pointer-events-none absolute inset-y-2 start-0 w-px bg-border/70"
            style={{ insetInlineStart: `-${0.55}rem` }}
            aria-hidden
          />
        ) : null}

        <button
          type="button"
          className="inline-flex cursor-grab touch-none rounded-lg border border-white/60 bg-white/65 p-1.5 text-muted active:cursor-grabbing"
          aria-label="Drag"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-3.5" />
        </button>

        {hasChildren ? (
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-white/60 bg-white/50 px-2 py-1 text-[10px] font-medium text-muted"
            aria-expanded={!collapsed}
            aria-label={collapsed ? t("tree.expand") : t("tree.collapse")}
          >
            <ChevronDown className={cn("size-3.5 transition-transform", collapsed && "-rotate-90")} />
            <span>{node.children.length}</span>
          </button>
        ) : (
          <span className="inline-flex size-7 shrink-0" aria-hidden />
        )}

        <button
          type="button"
          onClick={() => onSelect(node.id)}
          className="flex min-w-0 flex-1 items-center gap-pad-atom-md text-start"
        >
          {showThumb ? (
            <CategoryThumb url={node.image?.url} name={node.name} size={isRoot ? "md" : "sm"} />
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1">
              <p
                className={cn(
                  "truncate text-foreground",
                  isRoot ? "text-sm font-semibold" : "text-sm font-medium",
                )}
              >
                {node.nameFa || node.name}
              </p>
              {node.kind === "virtual" ? (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800">
                  <Sparkles className="size-3" />
                  {t("kind.virtual")}
                </span>
              ) : null}
              {!node.menuVisible ? (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                  <EyeOff className="size-3" />
                  {t("menu.hidden")}
                </span>
              ) : null}
            </div>
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
              className="inline-flex rounded-lg border border-white/60 bg-white/65 p-1.5 text-muted hover:text-foreground"
            >
              <Eye className="size-3.5" />
            </button>
          ) : null}
          {onEdit ? (
            <button
              type="button"
              onClick={() => onEdit(node)}
              className="inline-flex rounded-lg border border-white/60 bg-white/65 p-1.5 text-muted hover:text-foreground"
            >
              <Pencil className="size-3.5" />
            </button>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              onClick={() => onDelete(node)}
              className="inline-flex rounded-lg border border-red-200/80 bg-red-50/80 p-1.5 text-danger"
            >
              <Trash2 className="size-3.5" />
            </button>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export function CategorySortableTree({
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
  const reorder = useReorderCategories();
  const forest = useMemo(() => buildCategoryForest(categories), [categories]);
  const [flat, setFlat] = useState<FlatNode[]>(() => flattenForest(forest));
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => parentIdsWithChildren(flattenForest(forest)));
  const collapseInitialized = useRef(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const next = flattenForest(forest);
    setFlat(next);
    if (!collapseInitialized.current && next.length) {
      collapseInitialized.current = true;
      setCollapsedIds(parentIdsWithChildren(next));
    }
  }, [forest]);

  const visibleFlat = useMemo(() => {
    const hidden = new Set<string>();
    for (const item of flat) {
      if (item.parentId && (collapsedIds.has(item.parentId) || hidden.has(item.parentId))) {
        hidden.add(item.id);
      }
    }
    return flat.filter((item) => !hidden.has(item.id));
  }, [collapsedIds, flat]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function expandAll() {
    setCollapsedIds(new Set());
  }

  function collapseAll() {
    setCollapsedIds(parentIdsWithChildren(flat));
  }

  async function persist(nextFlat: FlatNode[]) {
    setError(null);
    try {
      await reorder.mutateAsync(toReorderPayload(nextFlat));
    } catch (err) {
      setError(handleApiError(err));
      setFlat(flattenForest(forest));
    }
  }

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = flat.findIndex((i) => i.id === active.id);
    const overIndex = flat.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || overIndex < 0) return;

    const activeItem = flat[oldIndex];
    const overItem = flat[overIndex];
    const descendantIds = new Set(
      flattenForest([activeItem.category]).map((d) => d.id).filter((id) => id !== activeItem.id),
    );
    if (descendantIds.has(overItem.id)) return;

    const subtree = flat.filter(
      (item) => item.id === activeItem.id || descendantIds.has(item.id),
    );
    const without = flat.filter((item) => item.id !== activeItem.id && !descendantIds.has(item.id));

    const nestAsChild = overItem.category.children.length === 0 || collapsedIds.has(overItem.id);
    const newParentId = nestAsChild ? overItem.id : overItem.parentId;
    const newDepth = nestAsChild ? overItem.depth + 1 : overItem.depth;
    const depthDelta = newDepth - activeItem.depth;

    const moved = subtree.map((item) => ({
      ...item,
      parentId: item.id === activeItem.id ? newParentId : item.parentId,
      depth: item.depth + depthDelta,
    }));

    const insertAt = without.findIndex((i) => i.id === overItem.id);
    const next =
      insertAt < 0
        ? [...without, ...moved]
        : [
            ...without.slice(0, insertAt + 1),
            ...moved,
            ...without.slice(insertAt + 1),
          ];

    setFlat(next);
    void persist(next);
  }

  const activeItem = activeId ? flat.find((i) => i.id === activeId) : null;

  if (!flat.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-pad-atom-md py-mol-lg text-muted">
        <FolderTree className="size-8 opacity-60" />
        <p className="text-sm">{t("tree.empty")}</p>
      </div>
    );
  }

  return (
    <div className="p-pad-mol">
      <div className="mb-pad-atom-md flex flex-wrap items-center justify-end gap-pad-atom">
        <button
          type="button"
          onClick={expandAll}
          className="inline-flex items-center gap-1 rounded-full border border-white/50 bg-white/40 px-pad-mol py-pad-atom text-xs text-muted transition-colors hover:text-foreground"
        >
          <ChevronsUpDown className="size-3.5" />
          {t("tree.expandAll")}
        </button>
        <button
          type="button"
          onClick={collapseAll}
          className="inline-flex items-center gap-1 rounded-full border border-white/50 bg-white/40 px-pad-mol py-pad-atom text-xs text-muted transition-colors hover:text-foreground"
        >
          <ChevronsDownUp className="size-3.5" />
          {t("tree.collapseAll")}
        </button>
      </div>

      {error ? <p className="mb-pad-atom text-sm text-danger">{error}</p> : null}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={visibleFlat.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <ul className="flex flex-col gap-pad-atom">
            {visibleFlat.map((item) => (
              <SortableRow
                key={item.id}
                item={item}
                selectedId={selectedId}
                onSelect={onSelect}
                onEdit={onEdit}
                onView={onView}
                onDelete={onDelete}
                collapsed={collapsedIds.has(item.id)}
                onToggle={() =>
                  setCollapsedIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(item.id)) next.delete(item.id);
                    else next.add(item.id);
                    return next;
                  })
                }
              />
            ))}
          </ul>
        </SortableContext>
        <DragOverlay>
          {activeItem ? (
            <div className="rounded-xl border border-primary/40 bg-white px-pad-mol py-pad-atom shadow-lg">
              {activeItem.category.nameFa || activeItem.category.name}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      <span className="hidden">{forestFromFlat(flat).length}</span>
    </div>
  );
}
