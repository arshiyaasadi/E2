"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { buildCategoryForest, type CategoryTreeNode } from "@/features/categories/tree";
import type { CategoryDto } from "@/types/domain";
import { cn } from "@/lib/utils";

function filterTree(nodes: CategoryTreeNode[], q: string): CategoryTreeNode[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return nodes;
  const walk = (node: CategoryTreeNode): CategoryTreeNode | null => {
    const kids = node.children.map(walk).filter(Boolean) as CategoryTreeNode[];
    const hit =
      node.name.toLowerCase().includes(needle) ||
      node.nameFa.toLowerCase().includes(needle) ||
      node.slug.toLowerCase().includes(needle);
    if (hit || kids.length) return { ...node, children: kids };
    return null;
  };
  return nodes.map(walk).filter(Boolean) as CategoryTreeNode[];
}

function TreeRows({
  nodes,
  depth,
  expanded,
  onToggle,
  selectedId,
  onSelect,
  excludeId,
}: {
  nodes: CategoryTreeNode[];
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  selectedId: string;
  onSelect: (id: string) => void;
  excludeId?: string;
}) {
  return (
    <>
      {nodes.map((node) => {
        if (node.id === excludeId) return null;
        const hasKids = node.children.length > 0;
        const open = expanded.has(node.id);
        const active = selectedId === node.id;
        return (
          <div key={node.id}>
            <div
              className={cn(
                "flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm transition",
                active ? "bg-primary/15 text-primary" : "hover:bg-white/70",
              )}
              style={{ paddingInlineStart: `${0.5 + depth * 0.85}rem` }}
            >
              {hasKids ? (
                <button
                  type="button"
                  className="rounded p-0.5 text-muted hover:text-foreground"
                  onClick={() => onToggle(node.id)}
                  aria-expanded={open}
                >
                  <ChevronDown className={cn("size-3.5 transition", !open && "-rotate-90")} />
                </button>
              ) : (
                <span className="inline-block size-3.5" />
              )}
              <button
                type="button"
                className="min-w-0 flex-1 truncate text-start"
                onClick={() => onSelect(node.id)}
              >
                <span className="font-medium">{node.nameFa || node.name}</span>
                <span className="ms-1 text-[11px] text-muted" dir="ltr">
                  {node.slug}
                </span>
              </button>
            </div>
            {hasKids && open ? (
              <TreeRows
                nodes={node.children}
                depth={depth + 1}
                expanded={expanded}
                onToggle={onToggle}
                selectedId={selectedId}
                onSelect={onSelect}
                excludeId={excludeId}
              />
            ) : null}
          </div>
        );
      })}
    </>
  );
}

export function ParentCategorySearchSelect({
  categories,
  value,
  onChange,
  excludeId,
  label,
  hint,
  emptyLabel,
}: {
  categories: CategoryDto[];
  value: string;
  onChange: (parentId: string) => void;
  excludeId?: string;
  label?: string;
  hint?: string;
  emptyLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const forest = useMemo(() => buildCategoryForest(categories), [categories]);
  const filtered = useMemo(() => filterTree(forest, q), [forest, q]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(forest.map((n) => n.id)));

  const selected = categories.find((c) => c.id === value);

  useEffect(() => {
    if (q.trim()) {
      const ids = new Set<string>();
      const walk = (nodes: CategoryTreeNode[]) => {
        for (const n of nodes) {
          ids.add(n.id);
          walk(n.children);
        }
      };
      walk(filtered);
      setExpanded(ids);
    }
  }, [filtered, q]);

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="flex flex-col gap-pad-atom" ref={rootRef}>
      {label ? <span className="text-sm font-medium text-foreground">{label}</span> : null}
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border bg-white px-pad-atom-md py-atom-md text-sm shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
      >
        <span className={cn("truncate", !selected && "text-muted")}>
          {selected ? `${selected.nameFa || selected.name}` : emptyLabel || "بدون والد"}
        </span>
        <ChevronDown className={cn("size-4 shrink-0 text-muted transition", open && "rotate-180")} />
      </button>

      {open ? (
        <div className="rounded-xl border border-white/60 bg-white/95 p-2 shadow-lg">
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="جستجوی نام یا اسلاگ…"
              className="w-full rounded-lg border bg-white py-2 pe-8 ps-8 text-sm"
              autoFocus
            />
            {q ? (
              <button
                type="button"
                className="absolute end-2 top-1/2 -translate-y-1/2 text-muted"
                onClick={() => setQ("")}
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>

          <button
            type="button"
            className={cn(
              "mb-1 w-full rounded-lg px-2 py-1.5 text-start text-sm",
              !value ? "bg-primary/15 text-primary" : "hover:bg-white/70",
            )}
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
          >
            {emptyLabel || "بدون والد (دستهٔ اصلی)"}
          </button>

          <div className="max-h-56 overflow-y-auto">
            <TreeRows
              nodes={filtered}
              depth={0}
              expanded={expanded}
              onToggle={(id) =>
                setExpanded((prev) => {
                  const next = new Set(prev);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                })
              }
              selectedId={value}
              onSelect={(id) => {
                onChange(id);
                setOpen(false);
                setQ("");
              }}
              excludeId={excludeId}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
