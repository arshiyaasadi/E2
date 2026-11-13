"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  FolderTree,
  Images,
  LayoutList,
  Plus,
  Tag,
} from "lucide-react";
import { AppTemplate } from "@/components/templates/AppTemplate";
import { ROUTES } from "@/config/routes";
import { cn } from "@/lib/cn";

export function ProductsHubContent() {
  const t = useTranslations("products.hub");
  const tNav = useTranslations("products.nav");

  const items = [
    {
      href: ROUTES.productsList,
      title: t("listTitle"),
      body: t("listBody"),
      icon: LayoutList,
    },
    {
      href: ROUTES.productNew,
      title: t("addTitle"),
      body: t("addBody"),
      icon: Plus,
    },
    {
      href: ROUTES.productsPhotos,
      title: t("photosTitle"),
      body: t("photosBody"),
      icon: Images,
    },
    {
      href: ROUTES.brands,
      title: t("brandsTitle"),
      body: t("brandsBody"),
      icon: Tag,
    },
    {
      href: ROUTES.categories,
      title: t("categoriesTitle"),
      body: t("categoriesBody"),
      icon: FolderTree,
    },
  ];

  return (
    <AppTemplate
      crumbs={[{ label: tNav("products") }]}
      denseMain
    >
      <ul className="flex flex-col gap-atom-md">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-start gap-mol rounded-2xl border border-border bg-surface p-pad-mol shadow-sm",
                  "transition-colors hover:border-primary/40 hover:bg-surface-2/60",
                )}
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-foreground">
                    {item.title}
                  </span>
                  <span className="mt-atom block text-sm text-muted">
                    {item.body}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </AppTemplate>
  );
}
