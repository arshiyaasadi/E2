"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Database,
  ImageIcon,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  MessageSquare,
  Newspaper,
  Package,
  Settings,
  Shield,
  ShoppingCart,
  Tags,
  TicketPercent,
  Truck,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Avatar, Button } from "@/components/atoms";
import { ADMIN_NAV, type AdminNavGroup, type AdminNavItem } from "@/config/routes";
import { hasPermission } from "@/config/roles";
import { useLogout } from "@/features/auth/queries";
import { useAuthUser } from "@/store/slices/auth.slice";
import { useUiStore } from "@/store/slices/ui.slice";
import { cn } from "@/lib/utils";

const NAV_ICONS: Record<string, typeof LayoutDashboard> = {
  "/admin/dashboard": LayoutDashboard,
  "/admin/products": Package,
  "/admin/categories": Tags,
  "/admin/brands": Tags,
  "/admin/tags": Tags,
  "/admin/homepage": LayoutGrid,
  "/admin/shop-pages": LayoutGrid,
  "/admin/blog": Newspaper,
  "/admin/blog/categories": Tags,
  "/admin/blog/tags": Tags,
  "/admin/media": ImageIcon,
  "/admin/orders": ShoppingCart,
  "/admin/customers": Users,
  "/admin/coupons": TicketPercent,
  "/admin/promotions": TicketPercent,
  "/admin/database": Database,
  "/admin/project/settings": Settings,
  "/admin/project/sms-providers": MessageSquare,
  "/admin/project/shipping-providers": Truck,
  "/admin/project/database": Database,
  "/admin/users": Users,
  "/admin/roles": Shield,
};

const GROUP_ICONS = {
  shield: Shield,
  settings: Settings,
  package: Package,
  commerce: TicketPercent,
  blog: Newspaper,
  storePages: LayoutGrid,
  image: ImageIcon,
} as const;

function isGroup(item: AdminNavItem): item is AdminNavGroup {
  return item.kind === "group";
}

function getVisibleGroupChildren(group: AdminNavGroup, permissions: string[], role?: string | null) {
  return group.children.filter((child) => {
    if (!child.permission) return true;
    return hasPermission(permissions, child.permission, role);
  });
}

function isNavHrefActive(pathname: string, href: string, siblingHrefs: string[] = []) {
  if (pathname === href) return true;
  if (!pathname.startsWith(`${href}/`)) return false;
  const longerSiblingOwnsPath = siblingHrefs.some(
    (other) =>
      other !== href &&
      other.startsWith(`${href}/`) &&
      (pathname === other || pathname.startsWith(`${other}/`)),
  );
  return !longerSiblingOwnsPath;
}

function isGroupActive(pathname: string, group: AdminNavGroup) {
  const siblingHrefs = group.children.map((child) => child.href);
  return group.children.some((child) => isNavHrefActive(pathname, child.href, siblingHrefs));
}

export function AdminSidebar() {
  const pathname = usePathname();
  const t = useTranslations("admin");
  const user = useAuthUser();
  const logout = useLogout();
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const hydrated = useUiStore((state) => state.sidebarHydrated);
  const hydrateSidebar = useUiStore((state) => state.hydrateSidebar);
  const toggleSidebarCollapsed = useUiStore((state) => state.toggleSidebarCollapsed);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    hydrateSidebar();
  }, [hydrateSidebar]);

  const visibleNav = useMemo(() => {
    return ADMIN_NAV.map((item) => {
      if (item.kind === "link") {
        if (item.permission && !hasPermission(user.permissions, item.permission, user.role)) {
          return null;
        }
        return item;
      }

      const children = getVisibleGroupChildren(item, user.permissions ?? [], user.role);
      if (!children.length) return null;
      if (item.permission && !hasPermission(user.permissions, item.permission, user.role)) {
        return null;
      }

      return { ...item, children };
    }).filter(Boolean) as AdminNavItem[];
  }, [user.permissions, user.role]);

  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      for (const item of visibleNav) {
        if (isGroup(item) && isGroupActive(pathname, item)) {
          next[item.labelKey] = true;
        }
      }
      return next;
    });
  }, [pathname, visibleNav]);

  function toggleGroup(labelKey: string) {
    setOpenGroups((prev) => ({ ...prev, [labelKey]: !prev[labelKey] }));
  }

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-dvh shrink-0 flex-col glass-sidebar transition-[width] duration-300 ease-out",
        collapsed ? "w-[4.75rem]" : "w-72",
        !hydrated && "w-72",
      )}
    >
      <div className="flex items-center justify-between gap-pad-atom border-b border-white/40 px-pad-mol py-pad-mol">
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-foreground">Ecommerce Admin</p>
            <p className="mt-atom-md truncate text-xs text-muted">{t("sidebar.tagline")}</p>
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          className={cn("shrink-0", collapsed && "mx-auto")}
          aria-label={collapsed ? t("sidebar.expand") : t("sidebar.collapse")}
          onClick={toggleSidebarCollapsed}
          startIcon={collapsed ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
        />
      </div>

      <nav className="flex flex-1 flex-col gap-pad-atom overflow-y-auto p-pad-mol">
        {visibleNav.map((item) => {
          if (item.kind === "link") {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = NAV_ICONS[item.href] ?? LayoutDashboard;
            const label = t(item.labelKey);

            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? label : undefined}
                className={cn(
                  "flex items-center rounded-xl text-sm transition-all",
                  collapsed ? "justify-center px-pad-atom-md py-pad-mol" : "gap-pad-atom-md px-pad-mol py-pad-atom-md",
                  active
                    ? "bg-primary/10 font-medium text-primary shadow-sm ring-1 ring-primary/15"
                    : "text-muted hover:bg-white/50 hover:text-foreground",
                )}
              >
                <Icon className="size-[1.125rem] shrink-0" />
                {!collapsed && <span>{label}</span>}
              </Link>
            );
          }

          const groupActive = isGroupActive(pathname, item);
          const isOpen = openGroups[item.labelKey] ?? groupActive;
          const groupLabel = t(item.labelKey);
          const GroupIcon = GROUP_ICONS[item.iconKey ?? "shield"];

          if (collapsed) {
            const firstChild = item.children[0];
            return (
              <Link
                key={item.labelKey}
                href={firstChild.href}
                title={groupLabel}
                className={cn(
                  "flex items-center justify-center rounded-xl px-pad-atom-md py-pad-mol text-sm transition-all",
                  groupActive
                    ? "bg-primary/10 text-primary shadow-sm ring-1 ring-primary/15"
                    : "text-muted hover:bg-white/50 hover:text-foreground",
                )}
              >
                <GroupIcon className="size-[1.125rem] shrink-0" />
              </Link>
            );
          }

          return (
            <div key={item.labelKey} className="flex flex-col gap-pad-atom">
              <button
                type="button"
                onClick={() => toggleGroup(item.labelKey)}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl px-pad-mol py-pad-atom-md text-sm transition-all",
                  groupActive
                    ? "bg-primary/10 font-medium text-primary shadow-sm ring-1 ring-primary/15"
                    : "text-muted hover:bg-white/50 hover:text-foreground",
                )}
              >
                <span className="flex items-center gap-pad-atom-md">
                  <GroupIcon className="size-[1.125rem] shrink-0" />
                  {groupLabel}
                </span>
                <ChevronDown className={cn("size-4 transition-transform", isOpen && "rotate-180")} />
              </button>

              {isOpen && (
                <div className="flex flex-col gap-pad-atom pe-pad-atom">
                  {item.children.map((child) => {
                    const siblingHrefs = item.children.map((c) => c.href);
                    const active = isNavHrefActive(pathname, child.href, siblingHrefs);
                    const Icon = NAV_ICONS[child.href] ?? Users;

                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          "flex items-center gap-pad-atom-md rounded-xl py-pad-atom-md ps-pad-mol pe-pad-mol text-sm transition-all",
                          active
                            ? "bg-white/70 font-medium text-primary shadow-sm"
                            : "text-muted hover:bg-white/45 hover:text-foreground",
                        )}
                      >
                        <Icon className="size-4 shrink-0" />
                        {t(child.labelKey)}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-white/40 p-pad-mol">
        {!collapsed ? (
          <>
            <div className="flex items-center gap-pad-atom-md rounded-xl bg-white/45 p-pad-mol">
              <Avatar name={user.fullName ?? user.email ?? "Admin"} size="sm" status="online" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {user.fullName ?? user.email ?? t("header.guest")}
                </p>
                <p className="truncate text-xs text-muted">{user.role ?? "—"}</p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              fullWidth
              className="mt-pad-atom-md justify-start"
              loading={logout.isPending}
              startIcon={<LogOut className="size-4" />}
              onClick={() => logout.mutate()}
            >
              {t("header.logout")}
            </Button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-pad-atom-md">
            <Avatar name={user.fullName ?? user.email ?? "Admin"} size="sm" status="online" />
            <Button
              variant="ghost"
              size="sm"
              aria-label={t("header.logout")}
              loading={logout.isPending}
              startIcon={<LogOut className="size-4" />}
              onClick={() => logout.mutate()}
            />
          </div>
        )}
      </div>
    </aside>
  );
}
