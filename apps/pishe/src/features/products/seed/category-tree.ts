/**
 * Static hierarchical category seed for the product category picker (UI only).
 * Leaf ids are stable UUIDs so they can later map into form `categoryId`.
 */

export type SeedCategoryNode = {
  id: string;
  name: string;
  children?: SeedCategoryNode[];
};

export const SEED_CATEGORY_TREE: SeedCategoryNode[] = [
  {
    id: "11111111-1111-4111-8111-111111111101",
    name: "مد و پوشاک",
    children: [
      {
        id: "11111111-1111-4111-8111-111111111102",
        name: "زنانه",
        children: [
          {
            id: "11111111-1111-4111-8111-111111111103",
            name: "لباس زنانه",
            children: [
              {
                id: "11111111-1111-4111-8111-111111111104",
                name: "لباس خواب و راحتی زنانه",
                children: [
                  {
                    id: "11111111-1111-4111-8111-111111111111",
                    name: "لباس خواب زنانه",
                  },
                  {
                    id: "11111111-1111-4111-8111-111111111112",
                    name: "ست لباس راحتی زنانه",
                  },
                  {
                    id: "11111111-1111-4111-8111-111111111113",
                    name: "تاپ و تی‌شرت راحتی زنانه",
                  },
                  {
                    id: "11111111-1111-4111-8111-111111111114",
                    name: "شلوار راحتی زنانه",
                  },
                  {
                    id: "11111111-1111-4111-8111-111111111115",
                    name: "اکسسوری لباس راحتی زنانه",
                  },
                  {
                    id: "11111111-1111-4111-8111-111111111116",
                    name: "شلوارک راحتی زنانه",
                  },
                ],
              },
              {
                id: "11111111-1111-4111-8111-111111111105",
                name: "لباس زیر زنانه",
                children: [
                  {
                    id: "11111111-1111-4111-8111-111111111121",
                    name: "بادی راحتی زنانه",
                  },
                  {
                    id: "11111111-1111-4111-8111-111111111122",
                    name: "سوتین زنانه",
                  },
                  {
                    id: "11111111-1111-4111-8111-111111111123",
                    name: "ست لباس زیر زنانه",
                  },
                  {
                    id: "11111111-1111-4111-8111-111111111124",
                    name: "گن زنانه",
                  },
                  {
                    id: "11111111-1111-4111-8111-111111111125",
                    name: "اکسسوری لباس زیر زنانه",
                  },
                  {
                    id: "11111111-1111-4111-8111-111111111126",
                    name: "شورت زنانه",
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: "11111111-1111-4111-8111-111111111130",
        name: "مردانه",
        children: [
          {
            id: "11111111-1111-4111-8111-111111111131",
            name: "تیشرت مردانه",
          },
          {
            id: "11111111-1111-4111-8111-111111111132",
            name: "شلوار مردانه",
          },
        ],
      },
    ],
  },
];

export function findSeedCategoryPath(
  tree: SeedCategoryNode[],
  targetId: string,
  trail: SeedCategoryNode[] = [],
): SeedCategoryNode[] | null {
  for (const node of tree) {
    const next = [...trail, node];
    if (node.id === targetId) return next;
    if (node.children?.length) {
      const found = findSeedCategoryPath(node.children, targetId, next);
      if (found) return found;
    }
  }
  return null;
}

export function findSeedCategoryNode(
  tree: SeedCategoryNode[],
  id: string,
): SeedCategoryNode | null {
  const path = findSeedCategoryPath(tree, id);
  return path ? path[path.length - 1]! : null;
}

export function flattenSeedCategories(
  tree: SeedCategoryNode[],
): SeedCategoryNode[] {
  const out: SeedCategoryNode[] = [];
  function walk(nodes: SeedCategoryNode[]) {
    for (const n of nodes) {
      out.push(n);
      if (n.children?.length) walk(n.children);
    }
  }
  walk(tree);
  return out;
}
