/**
 * @level atom
 * @spacing internal: gap-atom (outer), p-pad-mol (header/footer), px-pad-atom-md py-pad-atom-md (nav), gap-pad-atom-xs (ul), gap-pad-atom-md px-pad-atom-md py-atom-md (link) | external: none
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface SidebarNavItem {
  key: string;
  label: string;
  href: string;
  icon?: React.ReactNode;
  badge?: string | number;
  children?: SidebarNavItem[];
}

export interface SidebarProps {
  items: SidebarNavItem[];
  header?: React.ReactNode;
  footer?: React.ReactNode;
  collapsed?: boolean;
  className?: string;
}

export function Sidebar({ items, header, footer, collapsed = false, className }: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex flex-col gap-atom bg-surface border-l border-border h-full transition-all duration-300",
        collapsed ? "w-16" : "w-64",
        className,
      )}
    >
      {header && (
        <div className="border-b border-border p-pad-mol">{header}</div>
      )}

      <nav className="flex-1 overflow-y-auto px-pad-atom-md py-pad-atom-md">
        <ul className="flex flex-col gap-pad-atom-xs">
          {items.map((item) => (
            <SidebarItem key={item.key} item={item} collapsed={collapsed} />
          ))}
        </ul>
      </nav>

      {footer && (
        <div className="border-t border-border p-pad-mol">{footer}</div>
      )}
    </aside>
  );
}

function SidebarItem({
  item,
  collapsed,
}: {
  item: SidebarNavItem;
  collapsed: boolean;
}) {
  const pathname = usePathname();
  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

  return (
    <li>
      <Link
        href={item.href}
        title={collapsed ? item.label : undefined}
        className={cn(
          "flex items-center gap-pad-atom-md rounded-lg px-pad-atom-md py-atom-md text-sm font-medium transition-colors",
          isActive
            ? "bg-primary-50 text-primary"
            : "text-muted hover:bg-surface-2 hover:text-foreground",
          collapsed && "justify-center px-atom-md",
        )}
      >
        {item.icon && (
          <span className={cn("shrink-0", isActive ? "text-primary" : "text-current")}>
            {item.icon}
          </span>
        )}
        {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
        {!collapsed && item.badge !== undefined && (
          <span className="rounded-full bg-primary text-white px-pad-atom py-pad-atom-xs text-xs font-bold leading-none">
            {item.badge}
          </span>
        )}
      </Link>
    </li>
  );
}
