"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Tree, { type CustomNodeElementProps, type RawNodeDatum } from "react-d3-tree";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { buildCategoryD3Tree } from "@/features/categories/tree";
import type { CategoryDto } from "@/types/domain";
import { cn } from "@/lib/utils";

function CategoryD3Node({
  nodeDatum,
  toggleNode,
  onSelect,
  selectedId,
  categoriesById,
  onEdit,
  onView,
  onDelete,
}: CustomNodeElementProps & {
  onSelect: (id: string) => void;
  selectedId: string | null;
  categoriesById: Map<string, CategoryDto>;
  onEdit?: (category: CategoryDto) => void;
  onView?: (category: CategoryDto) => void;
  onDelete?: (category: CategoryDto) => void;
}) {
  const attrs = nodeDatum.attributes ?? {};
  const id = typeof attrs.id === "string" ? attrs.id : "";
  const nameEn = typeof attrs.nameEn === "string" ? attrs.nameEn : nodeDatum.name;
  const nameFa = typeof attrs.nameFa === "string" ? attrs.nameFa : "";
  const imageUrl = typeof attrs.imageUrl === "string" ? attrs.imageUrl : "";
  const slug = typeof attrs.slug === "string" ? attrs.slug : "";
  const hasChildren = Boolean(nodeDatum.children?.length);
  const collapsed = Boolean((nodeDatum as RawNodeDatum & { __rd3t?: { collapsed?: boolean } }).__rd3t?.collapsed);
  const active = id !== "" && selectedId === id;
  const category = id ? categoriesById.get(id) : undefined;

  if (!id && nodeDatum.name === "categories-root") {
    return (
      <g>
        <circle r={12} fill="var(--color-primary, #6366f1)" opacity={0.15} />
      </g>
    );
  }

  function handleNodeClick() {
    if (hasChildren) toggleNode();
    if (id) onSelect(id);
  }

  function handleAction(
    event: React.MouseEvent,
    action?: (category: CategoryDto) => void,
  ) {
    event.stopPropagation();
    if (category && action) action(category);
  }

  const nodeWidth = 196;
  const nodeHeight = 96;

  return (
    <g onClick={handleNodeClick} style={{ cursor: id ? "pointer" : "default" }}>
      <rect
        x={-nodeWidth / 2}
        y={-nodeHeight / 2}
        width={nodeWidth}
        height={nodeHeight}
        rx={14}
        fill={active ? "rgba(99,102,241,0.14)" : "rgba(255,255,255,0.92)"}
        stroke={active ? "rgba(99,102,241,0.55)" : "rgba(99,102,241,0.25)"}
        strokeWidth={active ? 1.5 : 1}
      />
      <foreignObject x={-nodeWidth / 2 + 8} y={-nodeHeight / 2 + 8} width={nodeWidth - 16} height={nodeHeight - 16}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            height: "100%",
            fontFamily: "inherit",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", minWidth: 0 }}>
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt=""
                style={{ width: 32, height: 32, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
              />
            ) : (
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "rgba(0,0,0,0.06)",
                  flexShrink: 0,
                }}
              />
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  textAlign: "right",
                  direction: "rtl",
                }}
              >
                {nameFa || nameEn}
              </div>
              {nameFa && nameEn && nameFa !== nameEn ? (
                <div
                  style={{
                    fontSize: 10,
                    opacity: 0.65,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    direction: "ltr",
                    textAlign: "left",
                  }}
                >
                  {nameEn}
                </div>
              ) : null}
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                {hasChildren ? (
                  <span
                    style={{
                      display: "inline-flex",
                      width: "16px",
                      height: "16px",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "999px",
                      background: "rgba(99,102,241,0.12)",
                      fontSize: "10px",
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {collapsed ? "+" : "−"}
                  </span>
                ) : null}
                {slug ? (
                  <div
                    style={{
                      fontSize: 10,
                      opacity: 0.65,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontFamily: "monospace",
                      direction: "ltr",
                      textAlign: "left",
                    }}
                  >
                    {slug}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {category && (onView || onEdit || onDelete) ? (
            <div
              style={{ display: "flex", justifyContent: "flex-end", gap: "4px" }}
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              {onView ? (
                <button
                  type="button"
                  onClick={(event) => handleAction(event, onView)}
                  aria-label={`View ${nameEn}`}
                  style={actionButtonStyle}
                >
                  <Eye size={12} />
                </button>
              ) : null}
              {onEdit ? (
                <button
                  type="button"
                  onClick={(event) => handleAction(event, onEdit)}
                  aria-label={`Edit ${nameEn}`}
                  style={actionButtonStyle}
                >
                  <Pencil size={12} />
                </button>
              ) : null}
              {onDelete ? (
                <button
                  type="button"
                  onClick={(event) => handleAction(event, onDelete)}
                  aria-label={`Delete ${nameEn}`}
                  style={{ ...actionButtonStyle, color: "#ef4444", background: "rgba(254,226,226,0.9)" }}
                >
                  <Trash2 size={12} />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </foreignObject>
    </g>
  );
}

const actionButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 24,
  height: 24,
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.7)",
  background: "rgba(255,255,255,0.85)",
  color: "#64748b",
  cursor: "pointer",
};

export function CategoryD3TreeView({
  categories,
  selectedId,
  onSelect,
  onEdit,
  onView,
  onDelete,
  className,
  heightClassName = "h-[min(52vh,560px)]",
}: {
  categories: CategoryDto[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onEdit?: (category: CategoryDto) => void;
  onView?: (category: CategoryDto) => void;
  onDelete?: (category: CategoryDto) => void;
  className?: string;
  heightClassName?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [translate, setTranslate] = useState({ x: 320, y: 80 });
  const treeData = useMemo(() => buildCategoryD3Tree(categories), [categories]);
  const categoriesById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const update = () => {
      const { width } = element.getBoundingClientRect();
      setTranslate({ x: width / 2, y: 80 });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [categories.length]);

  return (
    <div
      ref={containerRef}
      className={cn("w-full rounded-xl bg-white/25", heightClassName, className)}
    >
      <Tree
        data={treeData as RawNodeDatum}
        orientation="vertical"
        pathFunc="step"
        translate={translate}
        initialDepth={3}
        zoomable
        draggable
        collapsible
        separation={{ siblings: 1.5, nonSiblings: 1.9 }}
        nodeSize={{ x: 220, y: 120 }}
        renderCustomNodeElement={(props) => (
          <CategoryD3Node
            {...props}
            onSelect={onSelect}
            selectedId={selectedId}
            categoriesById={categoriesById}
            onEdit={onEdit}
            onView={onView}
            onDelete={onDelete}
          />
        )}
      />
    </div>
  );
}
