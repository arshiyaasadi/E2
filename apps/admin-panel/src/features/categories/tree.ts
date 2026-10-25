import type { RawNodeDatum } from "react-d3-tree";
import type { CategoryDto } from "@/types/domain";

export interface CategoryTreeNode extends CategoryDto {
  children: CategoryTreeNode[];
}

export function getCategoryDisplayName(category: Pick<CategoryDto, "name" | "nameFa">) {
  return `${category.name} | ${category.nameFa}`;
}

export type CategoryTreeFilterMode = "all" | "roots" | "parents" | "leaves";

export function buildCategoryForest(categories: CategoryDto[]): CategoryTreeNode[] {
  const byId = new Map<string, CategoryTreeNode>();

  for (const category of categories) {
    byId.set(category.id, { ...category, children: [] });
  }

  const roots: CategoryTreeNode[] = [];

  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (nodes: CategoryTreeNode[]) => {
    nodes.sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
    for (const node of nodes) sortNodes(node.children);
  };

  sortNodes(roots);
  return roots;
}

export function flattenCategoryTree(nodes: CategoryTreeNode[], depth = 0): Array<CategoryTreeNode & { depth: number }> {
  const result: Array<CategoryTreeNode & { depth: number }> = [];
  for (const node of nodes) {
    result.push({ ...node, depth });
    result.push(...flattenCategoryTree(node.children, depth + 1));
  }
  return result;
}

export function filterCategoryForest(
  nodes: CategoryTreeNode[],
  query: string,
  mode: CategoryTreeFilterMode,
): CategoryTreeNode[] {
  const normalizedQuery = query.trim().toLowerCase();

  const matchesMode = (node: CategoryTreeNode) => {
    switch (mode) {
      case "roots":
        return node.parentId === null;
      case "parents":
        return node.children.length > 0;
      case "leaves":
        return node.children.length === 0;
      default:
        return true;
    }
  };

  const matchesQuery = (node: CategoryTreeNode) => {
    if (!normalizedQuery) return true;
    return [node.name, node.nameFa, node.slug]
      .filter((value): value is string => typeof value === "string" && value.length > 0)
      .some((value) => value.toLowerCase().includes(normalizedQuery));
  };

  const visit = (node: CategoryTreeNode): CategoryTreeNode | null => {
    const filteredChildren = node.children
      .map(visit)
      .filter((child): child is CategoryTreeNode => child !== null);

    if ((matchesQuery(node) && matchesMode(node)) || filteredChildren.length > 0) {
      return { ...node, children: filteredChildren };
    }

    return null;
  };

  return nodes.map(visit).filter((node): node is CategoryTreeNode => node !== null);
}

export function categoryToD3Datum(category: CategoryTreeNode): RawNodeDatum {
  return {
    name: getCategoryDisplayName(category),
    attributes: {
      id: category.id,
      nameEn: category.name,
      nameFa: category.nameFa,
      slug: category.slug,
      imageUrl: category.image?.url ?? "",
    },
    children: category.children.length
      ? category.children.map(categoryToD3Datum)
      : undefined,
  };
}

export function buildCategoryD3Tree(categories: CategoryDto[]): RawNodeDatum {
  const forest = buildCategoryForest(categories);

  if (forest.length === 1) {
    return categoryToD3Datum(forest[0]);
  }

  return {
    name: "categories-root",
    attributes: { slug: "", imageUrl: "" },
    children: forest.map(categoryToD3Datum),
  };
}
