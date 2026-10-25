import { buildCategoryForest, type CategoryTreeNode } from "@/features/categories/tree";
import type { CategoryDto } from "@/types/domain";

export interface MegaMenuLinkJson {
  id: string;
  label: string;
  labelFa: string;
  slug: string;
  href: string;
  imageUrl?: string | null;
}

export interface MegaMenuColumnJson {
  id: string;
  title: string;
  titleFa: string;
  slug: string;
  href: string;
  links: MegaMenuLinkJson[];
}

export interface MegaMenuSectionJson {
  id: string;
  title: string;
  titleFa: string;
  slug: string;
  href: string;
  imageUrl?: string | null;
  columns: MegaMenuColumnJson[];
}

export interface MegaMenuDepartmentJson {
  id: string;
  title: string;
  titleFa: string;
  slug: string;
  href: string;
  imageUrl?: string | null;
  sections: MegaMenuSectionJson[];
}

/** JSON shape intended for storefront mega menu config in store settings. */
export interface MegaMenuJson {
  version: 1;
  departments: MegaMenuDepartmentJson[];
}

function categoryHref(slug: string) {
  return `/collection/${slug}`;
}

function isMenuVisible(node: CategoryTreeNode) {
  return node.menuVisible !== false;
}

function filterMenuForest(nodes: CategoryTreeNode[]): CategoryTreeNode[] {
  return nodes
    .filter(isMenuVisible)
    .map((node) => ({
      ...node,
      children: filterMenuForest(node.children),
    }));
}

function nodeToLink(node: CategoryTreeNode): MegaMenuLinkJson {
  return {
    id: node.id,
    label: node.name,
    labelFa: node.nameFa || node.name,
    slug: node.slug,
    href: categoryHref(node.slug),
    imageUrl: node.image?.url ?? null,
  };
}

function nodeToSection(node: CategoryTreeNode): MegaMenuSectionJson {
  const columns: MegaMenuColumnJson[] = node.children.map((child) => ({
    id: child.id,
    title: child.name,
    titleFa: child.nameFa || child.name,
    slug: child.slug,
    href: categoryHref(child.slug),
    links: child.children.length
      ? child.children.map(nodeToLink)
      : [nodeToLink(child)],
  }));

  return {
    id: node.id,
    title: node.name,
    titleFa: node.nameFa || node.name,
    slug: node.slug,
    href: categoryHref(node.slug),
    imageUrl: node.image?.url ?? null,
    columns,
  };
}

function nodeToDepartment(node: CategoryTreeNode): MegaMenuDepartmentJson {
  const sections = node.children.length
    ? node.children.map(nodeToSection)
    : [
        {
          id: `${node.id}-all`,
          title: node.name,
          titleFa: node.nameFa || node.name,
          slug: node.slug,
          href: categoryHref(node.slug),
          imageUrl: node.image?.url ?? null,
          columns: [
            {
              id: `${node.id}-shop-all`,
              title: node.name,
              titleFa: node.nameFa || node.name,
              slug: node.slug,
              href: categoryHref(node.slug),
              links: [nodeToLink(node)],
            },
          ],
        },
      ];

  return {
    id: node.id,
    title: node.name,
    titleFa: node.nameFa || node.name,
    slug: node.slug,
    href: categoryHref(node.slug),
    imageUrl: node.image?.url ?? null,
    sections,
  };
}

/** Build storefront mega menu JSON from the category tree stored in DB. */
export function buildMegaMenuJsonFromCategories(categories: CategoryDto[]): MegaMenuJson {
  const forest = filterMenuForest(buildCategoryForest(categories));
  return {
    version: 1,
    departments: forest.map(nodeToDepartment),
  };
}
