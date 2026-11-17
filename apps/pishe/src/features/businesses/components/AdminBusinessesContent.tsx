"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Alert } from "@/components/atoms/Alert";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Textarea } from "@/components/atoms/Textarea";
import { Spinner } from "@/components/atoms/Spinner";
import { FormField } from "@/components/molecules/FormField";
import { AppTemplate } from "@/components/templates/AppTemplate";
import {
  useAdminBusinessesQuery,
  useCreateBusinessMutation,
  useDeleteBusinessMutation,
  usePatchBusinessMutation,
} from "@/features/businesses/queries";
import { handleApiError } from "@/lib/api/client";
import { formatJalaliDateTime } from "@/lib/datetime/jalali";
import { ROUTES } from "@/config/routes";
import { useAuthStore } from "@/store/slices/auth.slice";
import type { BusinessResponse } from "@/types/api";

type LinkDraft = { title: string; url: string };

const emptyForm = {
  name: "",
  description: "",
  logoUrl: "",
  color: "#2563eb",
  links: [] as LinkDraft[],
};

export function AdminBusinessesContent() {
  const t = useTranslations("businesses");
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const query = useAdminBusinessesQuery(Boolean(user?.isSuperAdmin));
  const createMut = useCreateBusinessMutation();
  const patchMut = usePatchBusinessMutation();
  const deleteMut = useDeleteBusinessMutation();

  const [editing, setEditing] = useState<BusinessResponse | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const title = useMemo(() => t("adminTitle"), [t]);

  if (user && !user.isSuperAdmin) {
    return (
      <AppTemplate title={title}>
        <Alert variant="error">{t("adminTitle")}</Alert>
        <Button className="mt-mol" onClick={() => router.replace(ROUTES.businesses)}>
          {t("back")}
        </Button>
      </AppTemplate>
    );
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setShowForm(true);
  }

  function openEdit(b: BusinessResponse) {
    setEditing(b);
    setForm({
      name: b.name,
      description: b.description ?? "",
      logoUrl: b.logoUrl ?? "",
      color: b.color ?? "#2563eb",
      links: b.links.map((l) => ({ title: l.title, url: l.url })),
    });
    setError(null);
    setShowForm(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      logoUrl: form.logoUrl.trim() || null,
      color: form.color.trim() || null,
      links: form.links.filter((l) => l.title.trim() && l.url.trim()),
    };
    try {
      if (editing) {
        await patchMut.mutateAsync({ id: editing.id, data: payload });
      } else {
        await createMut.mutateAsync(payload);
      }
      setShowForm(false);
      setEditing(null);
      setForm(emptyForm);
    } catch (err) {
      setError(handleApiError(err));
    }
  }

  return (
    <AppTemplate
      title={title}
      crumbs={[
        { label: t("nav"), href: ROUTES.businesses },
        { label: t("adminTitle") },
      ]}
    >
      <div className="mb-mol flex justify-end">
        <Button size="sm" onClick={openCreate}>
          {t("create")}
        </Button>
      </div>

      {showForm ? (
        <form
          onSubmit={onSubmit}
          className="mb-mol flex flex-col gap-mol rounded-2xl border border-border bg-surface p-pad-mol"
        >
          <FormField label={t("name")}>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              minLength={2}
            />
          </FormField>
          <FormField label={t("description")}>
            <Textarea
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              rows={3}
            />
          </FormField>
          <FormField label={t("logoUrl")}>
            <Input
              value={form.logoUrl}
              onChange={(e) =>
                setForm((f) => ({ ...f, logoUrl: e.target.value }))
              }
              dir="ltr"
            />
          </FormField>
          <FormField label={t("color")}>
            <Input
              type="color"
              value={form.color}
              onChange={(e) =>
                setForm((f) => ({ ...f, color: e.target.value }))
              }
            />
          </FormField>

          <div className="flex flex-col gap-atom-md">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{t("links")}</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    links: [...f.links, { title: "", url: "" }],
                  }))
                }
              >
                {t("addLink")}
              </Button>
            </div>
            {form.links.map((link, idx) => (
              <div key={idx} className="flex flex-col gap-atom rounded-xl border border-border p-pad-atom-md">
                <Input
                  placeholder={t("linkTitle")}
                  value={link.title}
                  onChange={(e) =>
                    setForm((f) => {
                      const links = [...f.links];
                      links[idx] = { ...links[idx], title: e.target.value };
                      return { ...f, links };
                    })
                  }
                />
                <Input
                  placeholder={t("linkUrl")}
                  value={link.url}
                  dir="ltr"
                  onChange={(e) =>
                    setForm((f) => {
                      const links = [...f.links];
                      links[idx] = { ...links[idx], url: e.target.value };
                      return { ...f, links };
                    })
                  }
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      links: f.links.filter((_, i) => i !== idx),
                    }))
                  }
                >
                  {t("removeLink")}
                </Button>
              </div>
            ))}
          </div>

          {error ? <Alert variant="error">{error}</Alert> : null}
          <div className="flex gap-atom-md">
            <Button
              type="submit"
              fullWidth
              loading={createMut.isPending || patchMut.isPending}
            >
              {t("save")}
            </Button>
            <Button
              type="button"
              variant="outline"
              fullWidth
              onClick={() => setShowForm(false)}
            >
              {t("cancel")}
            </Button>
          </div>
        </form>
      ) : null}

      {query.isLoading ? (
        <div className="flex justify-center py-pad-org">
          <Spinner />
        </div>
      ) : (query.data?.length ?? 0) === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-pad-mol py-pad-org text-center text-sm text-muted">
          {t("adminEmpty")}
        </p>
      ) : (
        <ul className="flex flex-col gap-mol">
          {query.data!.map((b) => (
            <li
              key={b.id}
              className="rounded-2xl border border-border bg-surface p-pad-mol"
            >
              <div className="flex flex-col gap-atom-md">
                <div className="flex items-start justify-between gap-mol">
                  <div>
                    <p className="font-semibold text-foreground">{b.name}</p>
                    <p className="text-xs text-muted" dir="ltr">
                      {t("code")}: {b.code}
                    </p>
                    <p className="text-xs text-muted">
                      {t("assignedAt")}: {formatJalaliDateTime(b.assignedAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-atom">
                    <Link href={ROUTES.businessMembers(b.id)}>
                      <Button size="sm" variant="outline">
                        {t("members")}
                      </Button>
                    </Link>
                    <Button size="sm" variant="outline" onClick={() => openEdit(b)}>
                      {t("edit")}
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      loading={deleteMut.isPending}
                      onClick={async () => {
                        if (!window.confirm(t("deleteConfirmBody"))) return;
                        await deleteMut.mutateAsync(b.id);
                      }}
                    >
                      {t("delete")}
                    </Button>
                  </div>
                </div>
                {b.description ? (
                  <p className="text-sm text-muted">{b.description}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppTemplate>
  );
}
