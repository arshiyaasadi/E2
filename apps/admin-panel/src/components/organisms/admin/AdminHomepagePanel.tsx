"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  EmptyState,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  Select,
  Spinner,
} from "@/components/atoms";
import { Table, TableBody, TableHead, Td, Th, Tr } from "@/components/atoms/Table";
import { AdminPageShell } from "@/components/organisms/admin/AdminPageShell";
import {
  useCreateHomepageSection,
  useDeleteHomepageSection,
  useHomepageSections,
  useReorderHomepageSection,
  useUpdateHomepageSection,
} from "@/features/homepage/queries";
import { useShopPages } from "@/features/shop-pages/queries";
import { handleApiError } from "@/lib/api/client";
import { hasPermission } from "@/config/roles";
import { useAuthUser } from "@/store/slices/auth.slice";
import type {
  HomepageGridLayout,
  HomepageSectionDto,
  HomepageSectionType,
} from "@/types/domain";

type FilterMode = "none" | "audience" | "sale" | "featured";
type AudienceValue = "men" | "women" | "kids";

interface SectionFormState {
  title: string;
  subtitle: string;
  sectionType: HomepageSectionType;
  filterMode: FilterMode;
  audience: AudienceValue;
  shopPageId: string;
  productLimit: string;
  gridLayout: HomepageGridLayout;
  isEnabled: boolean;
}

const emptyForm: SectionFormState = {
  title: "",
  subtitle: "",
  sectionType: "product_grid",
  filterMode: "audience",
  audience: "men",
  shopPageId: "",
  productLimit: "8",
  gridLayout: "cols4",
  isEnabled: true,
};

function filtersFromForm(form: SectionFormState): Record<string, unknown> {
  if (form.filterMode === "sale") return { sale: true };
  if (form.filterMode === "featured") return { featured: true };
  if (form.filterMode === "audience") return { audience: [form.audience] };
  return {};
}

function formFromSection(section: HomepageSectionDto): SectionFormState {
  const filters = section.filters ?? {};
  let filterMode: FilterMode = "none";
  let audience: AudienceValue = "men";

  if (filters.sale === true) {
    filterMode = "sale";
  } else if (filters.featured === true) {
    filterMode = "featured";
  } else if (Array.isArray(filters.audience) && filters.audience.length > 0) {
    filterMode = "audience";
    const first = String(filters.audience[0]);
    if (first === "women" || first === "kids" || first === "men") audience = first;
  }

  return {
    title: section.title,
    subtitle: section.subtitle ?? "",
    sectionType: section.sectionType,
    filterMode,
    audience,
    shopPageId: section.shopPageId ?? "",
    productLimit: String(section.productLimit),
    gridLayout: section.gridLayout,
    isEnabled: section.isEnabled,
  };
}

function SectionFormModal({
  open,
  mode,
  section,
  onClose,
}: {
  open: boolean;
  mode: "create" | "edit";
  section: HomepageSectionDto | null;
  onClose: () => void;
}) {
  const t = useTranslations("admin.homepage");
  const createSection = useCreateHomepageSection();
  const updateSection = useUpdateHomepageSection();
  const { data: shopPages } = useShopPages();
  const [form, setForm] = useState<SectionFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && section) {
      setForm(formFromSection(section));
    } else {
      setForm(emptyForm);
    }
    setError(null);
  }, [open, mode, section]);

  const pending = createSection.isPending || updateSection.isPending;
  const canSave = form.title.trim().length > 0;

  const shopPageOptions = useMemo(
    () => [
      { value: "", label: t("fields.noShopPage") },
      ...(shopPages ?? []).map((page) => ({
        value: page.id,
        label: `${page.title} (${page.isMain ? "/main" : "/collection"}/${page.slug})`,
      })),
    ],
    [shopPages, t],
  );

  async function onSave() {
    if (!canSave) return;
    const limit = Number(form.productLimit);
    if (!Number.isFinite(limit) || limit < 1 || limit > 48) {
      setError(t("validation.productLimit"));
      return;
    }

    const payload = {
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || null,
      sectionType: form.sectionType,
      filters: filtersFromForm(form),
      shopPageId: form.shopPageId || null,
      productLimit: limit,
      gridLayout: form.gridLayout,
      isEnabled: form.isEnabled,
    };

    try {
      setError(null);
      if (mode === "create") {
        await createSection.mutateAsync(payload);
      } else if (section) {
        await updateSection.mutateAsync({ sectionId: section.id, input: payload });
      }
      onClose();
    } catch (err) {
      setError(handleApiError(err));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "create" ? t("createTitle") : t("editTitle")}
      size="lg"
    >
      <ModalBody className="flex flex-col gap-mol">
        <Input
          label={t("fields.title")}
          value={form.title}
          onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
        />
        <Input
          label={t("fields.subtitle")}
          value={form.subtitle}
          onChange={(event) => setForm((prev) => ({ ...prev, subtitle: event.target.value }))}
        />

        <div className="grid gap-mol sm:grid-cols-2">
          <Select
            label={t("fields.sectionType")}
            value={form.sectionType}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                sectionType: event.target.value as HomepageSectionType,
              }))
            }
            options={[
              { value: "product_grid", label: t("types.product_grid") },
              { value: "product_rail", label: t("types.product_rail") },
              { value: "sale_grid", label: t("types.sale_grid") },
            ]}
          />
          <Select
            label={t("fields.gridLayout")}
            value={form.gridLayout}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                gridLayout: event.target.value as HomepageGridLayout,
              }))
            }
            options={[
              { value: "cols4", label: t("layouts.cols4") },
              { value: "cols3", label: t("layouts.cols3") },
            ]}
          />
        </div>

        <div className="grid gap-mol sm:grid-cols-2">
          <Select
            label={t("fields.filterMode")}
            value={form.filterMode}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, filterMode: event.target.value as FilterMode }))
            }
            options={[
              { value: "audience", label: t("filterModes.audience") },
              { value: "sale", label: t("filterModes.sale") },
              { value: "featured", label: t("filterModes.featured") },
              { value: "none", label: t("filterModes.none") },
            ]}
          />
          {form.filterMode === "audience" ? (
            <Select
              label={t("fields.audience")}
              value={form.audience}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  audience: event.target.value as AudienceValue,
                }))
              }
              options={[
                { value: "men", label: t("audiences.men") },
                { value: "women", label: t("audiences.women") },
                { value: "kids", label: t("audiences.kids") },
              ]}
            />
          ) : (
            <Input
              label={t("fields.productLimit")}
              type="number"
              min={1}
              max={48}
              value={form.productLimit}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, productLimit: event.target.value }))
              }
              textDirection="ltr"
            />
          )}
        </div>

        {form.filterMode === "audience" ? (
          <Input
            label={t("fields.productLimit")}
            type="number"
            min={1}
            max={48}
            value={form.productLimit}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, productLimit: event.target.value }))
            }
            textDirection="ltr"
          />
        ) : null}

        <Select
          label={t("fields.shopPage")}
          hint={t("fields.shopPageHint")}
          value={form.shopPageId}
          onChange={(event) => setForm((prev) => ({ ...prev, shopPageId: event.target.value }))}
          options={shopPageOptions}
        />

        <Checkbox
          label={t("fields.isEnabled")}
          checked={form.isEnabled}
          onChange={(event) => setForm((prev) => ({ ...prev, isEnabled: event.target.checked }))}
        />

        {error ? <Alert variant="danger">{error}</Alert> : null}
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={onClose}>
          {t("actions.cancel")}
        </Button>
        <Button loading={pending} onClick={onSave} disabled={!canSave}>
          {t("actions.save")}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export function AdminHomepagePanel() {
  const t = useTranslations("admin.homepage");
  const user = useAuthUser();
  const canView = hasPermission(user.permissions, "shop_pages.view", user.role);
  const canManage = hasPermission(user.permissions, "shop_pages.manage", user.role);
  const { data, isLoading, isError } = useHomepageSections();
  const deleteSection = useDeleteHomepageSection();
  const reorderSection = useReorderHomepageSection();
  const updateSection = useUpdateHomepageSection();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selected, setSelected] = useState<HomepageSectionDto | null>(null);

  const sections = data ?? [];

  function openCreate() {
    setModalMode("create");
    setSelected(null);
    setModalOpen(true);
  }

  function openEdit(section: HomepageSectionDto) {
    setModalMode("edit");
    setSelected(section);
    setModalOpen(true);
  }

  async function onDelete(section: HomepageSectionDto) {
    if (!window.confirm(t("confirmDelete", { title: section.title }))) return;
    try {
      await deleteSection.mutateAsync(section.id);
    } catch (err) {
      window.alert(handleApiError(err));
    }
  }

  async function onToggleEnabled(section: HomepageSectionDto) {
    try {
      await updateSection.mutateAsync({
        sectionId: section.id,
        input: { isEnabled: !section.isEnabled },
      });
    } catch (err) {
      window.alert(handleApiError(err));
    }
  }

  async function onMove(section: HomepageSectionDto, direction: "up" | "down") {
    const index = sections.findIndex((item) => item.id === section.id);
    const other = direction === "up" ? sections[index - 1] : sections[index + 1];
    if (!other) return;
    try {
      await reorderSection.mutateAsync({ sectionId: section.id, otherId: other.id });
    } catch (err) {
      window.alert(handleApiError(err));
    }
  }

  if (!canView) {
    return (
      <AdminPageShell title={t("title")} description={t("subtitle")}>
        <Alert variant="warning">{t("noAccess")}</Alert>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      title={t("title")}
      description={t("subtitle")}
      stats={
        canManage ? (
          <div className="flex justify-end">
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              {t("actions.create")}
            </Button>
          </div>
        ) : null
      }
    >
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : isError ? (
        <Alert variant="danger">{t("error")}</Alert>
      ) : sections.length === 0 ? (
        <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHead>
              <Tr>
                <Th>{t("columns.order")}</Th>
                <Th>{t("columns.title")}</Th>
                <Th>{t("columns.type")}</Th>
                <Th>{t("columns.link")}</Th>
                <Th>{t("columns.status")}</Th>
                {canManage ? <Th className="text-left">{t("columns.actions")}</Th> : null}
              </Tr>
            </TableHead>
            <TableBody>
              {sections.map((section, index) => (
                <Tr key={section.id}>
                  <Td>
                    <div className="flex items-center gap-1">
                      <span className="tabular-nums text-sm text-muted">{section.sortOrder}</span>
                      {canManage ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={t("actions.moveUp")}
                            disabled={index === 0 || reorderSection.isPending}
                            onClick={() => onMove(section, "up")}
                          >
                            <ArrowUp className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={t("actions.moveDown")}
                            disabled={index === sections.length - 1 || reorderSection.isPending}
                            onClick={() => onMove(section, "down")}
                          >
                            <ArrowDown className="size-4" />
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </Td>
                  <Td>
                    <div className="font-medium text-foreground">{section.title}</div>
                    {section.subtitle ? (
                      <div className="text-xs text-muted">{section.subtitle}</div>
                    ) : null}
                  </Td>
                  <Td>
                    <Badge variant="neutral">{t(`types.${section.sectionType}`)}</Badge>
                  </Td>
                  <Td className="text-sm text-muted">{section.shopPageTitle ?? "—"}</Td>
                  <Td>
                    <Badge variant={section.isEnabled ? "success" : "warning"}>
                      {section.isEnabled ? t("status.enabled") : t("status.disabled")}
                    </Badge>
                  </Td>
                  {canManage ? (
                    <Td>
                      <div className="flex flex-wrap justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => onToggleEnabled(section)}>
                          {section.isEnabled ? t("actions.disable") : t("actions.enable")}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(section)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => onDelete(section)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </Td>
                  ) : null}
                </Tr>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <SectionFormModal
        open={modalOpen}
        mode={modalMode}
        section={selected}
        onClose={() => setModalOpen(false)}
      />
    </AdminPageShell>
  );
}
