"use client";

import { useMemo, useState } from "react";
import { Store } from "lucide-react";
import { useTranslations } from "next-intl";
import { buildMegaMenuJsonFromCategories, type MegaMenuDepartmentJson } from "@/features/categories/mega-menu";
import type { CategoryDto } from "@/types/domain";
import { cn } from "@/lib/utils";

function MegaMenuPanel({
  department,
  activeSectionId,
  onSectionChange,
}: {
  department: MegaMenuDepartmentJson;
  activeSectionId: string | null;
  onSectionChange: (sectionId: string) => void;
}) {
  const t = useTranslations("admin.categories.megaMenu");
  const activeSection =
    department.sections.find((item) => item.id === activeSectionId) ?? department.sections[0] ?? null;

  if (!activeSection) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
      {department.sections.length > 1 ? (
        <div className="flex gap-1 overflow-x-auto border-b border-slate-100 bg-slate-50 px-pad-mol py-2">
          {department.sections.map((section) => {
            const active = section.id === activeSection.id;
            return (
              <button
                key={section.id}
                type="button"
                onMouseEnter={() => onSectionChange(section.id)}
                onFocus={() => onSectionChange(section.id)}
                className={cn(
                  "shrink-0 rounded-md px-3 py-1.5 text-xs transition-colors",
                  active
                    ? "bg-white font-semibold text-slate-900 shadow-sm"
                    : "text-slate-600 hover:bg-white/80 hover:text-slate-900",
                )}
              >
                {section.titleFa}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="flex items-start gap-pad-mol overflow-x-auto p-pad-mol">
        <div className="flex min-w-max items-start gap-pad-mol">
          {activeSection.columns.map((column) => (
            <div key={column.id} className="w-36 shrink-0">
              <a
                href={column.href}
                className="mb-2 block text-sm font-semibold text-slate-900 hover:text-primary"
                onClick={(event) => event.preventDefault()}
              >
                {column.titleFa}
              </a>
              <ul className="space-y-1.5">
                {column.links.map((link) => (
                  <li key={link.id}>
                    <a
                      href={link.href}
                      className="block truncate text-xs text-slate-600 transition-colors hover:text-primary"
                      onClick={(event) => event.preventDefault()}
                      title={link.labelFa}
                    >
                      {link.labelFa}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="ms-auto shrink-0 self-start border-s border-slate-100 ps-pad-mol">
          <a
            href={activeSection.href}
            className="text-xs font-medium text-primary hover:underline"
            onClick={(event) => event.preventDefault()}
          >
            {t("shopAll")} {activeSection.titleFa}
          </a>
        </div>
      </div>
    </div>
  );
}

export function CategoryMegaMenuPreview({
  categories,
  embedded = false,
}: {
  categories: CategoryDto[];
  embedded?: boolean;
}) {
  const t = useTranslations("admin.categories.megaMenu");
  const menu = useMemo(() => buildMegaMenuJsonFromCategories(categories), [categories]);
  const [activeDepartmentId, setActiveDepartmentId] = useState<string | null>(
    menu.departments[0]?.id ?? null,
  );
  const [activeSectionId, setActiveSectionId] = useState<string | null>(
    menu.departments[0]?.sections[0]?.id ?? null,
  );

  const activeDepartment =
    menu.departments.find((item) => item.id === activeDepartmentId) ?? menu.departments[0] ?? null;

  function selectDepartment(departmentId: string) {
    setActiveDepartmentId(departmentId);
    const department = menu.departments.find((item) => item.id === departmentId);
    setActiveSectionId(department?.sections[0]?.id ?? null);
  }

  if (!menu.departments.length) {
    return (
      <div className="px-mol-md py-mol-lg text-center text-sm text-muted">{t("empty")}</div>
    );
  }

  return (
    <div className={cn(!embedded && "border-t border-white/40")}>
      <div className="border-b border-white/40 px-mol-md py-pad-mol">
        <div className="flex items-start justify-between gap-pad-atom">
          <div>
            <h3 className="text-base font-semibold text-foreground">{t("title")}</h3>
            <p className="mt-atom-md text-xs text-muted">{t("subtitle")}</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full border border-white/50 bg-white/40 px-pad-mol py-pad-atom text-[11px] text-muted">
            <Store className="size-3.5" />
            {t("previewBadge")}
          </span>
        </div>
      </div>

      <div className="bg-[#131921] px-mol-md py-2 text-white">
        <div className="flex items-center gap-2 overflow-x-auto">
          {menu.departments.map((department) => {
            const active = department.id === activeDepartment?.id;
            return (
              <button
                key={department.id}
                type="button"
                onMouseEnter={() => selectDepartment(department.id)}
                onFocus={() => selectDepartment(department.id)}
                className={cn(
                  "shrink-0 rounded-md px-3 py-1.5 text-xs transition-colors",
                  active ? "bg-white text-slate-900" : "text-white/90 hover:bg-white/10",
                )}
              >
                {department.titleFa}
              </button>
            );
          })}
        </div>
      </div>

      {activeDepartment ? (
        <div className="p-pad-mol">
          <MegaMenuPanel
            department={activeDepartment}
            activeSectionId={activeSectionId}
            onSectionChange={setActiveSectionId}
          />
        </div>
      ) : null}
    </div>
  );
}
