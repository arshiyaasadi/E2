"use client";

import { useMemo, useState } from "react";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Alert,
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  ModalBody,
  Select,
  Spinner,
} from "@/components/atoms";
import { Table, TableBody, TableHead, Td, Th, Tr } from "@/components/atoms/Table";
import { AdminPageShell } from "@/components/organisms/admin/AdminPageShell";
import { BlogArticleView } from "@/features/blog/components/BlogArticleView";
import { BlogPostForm } from "@/features/blog/components/BlogPostForm";
import {
  useBlogCategories,
  useBlogPost,
  useBlogPosts,
  useDeleteBlogPost,
} from "@/features/blog/queries";
import { handleApiError } from "@/lib/api/client";
import { hasPermission } from "@/config/roles";
import { useAuthUser } from "@/store/slices/auth.slice";
import type { BlogPostDto, BlogPostListItemDto } from "@/types/domain";

export function AdminBlogPanel() {
  const t = useTranslations("admin.blog");
  const user = useAuthUser();
  const canManage = hasPermission(user?.permissions, "blog.manage", user?.role);
  const canView = hasPermission(user?.permissions, "blog.view", user?.role);

  const [statusFilter, setStatusFilter] = useState("");
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const categories = useBlogCategories();
  const posts = useBlogPosts({
    status: statusFilter || undefined,
    categoryId: categoryId || undefined,
    q: q || undefined,
  });
  const editingPost = useBlogPost(editingId);
  const previewPost = useBlogPost(previewId);
  const deletePost = useDeleteBlogPost();

  const rows = posts.data ?? [];

  async function onDelete(row: BlogPostListItemDto) {
    if (!window.confirm(t("confirmDelete", { title: row.titleFa }))) return;
    setError(null);
    try {
      await deletePost.mutateAsync(row.id);
    } catch (err) {
      setError(handleApiError(err));
    }
  }

  function openCreate() {
    setEditingId(null);
    setEditorOpen(true);
  }

  function openEdit(id: string) {
    setEditingId(id);
    setEditorOpen(true);
  }

  const editorPost: BlogPostDto | null | undefined = editingId
    ? editingPost.data
    : null;

  const categoryOptions = useMemo(
    () => [
      { value: "", label: t("filters.allCategories") },
      ...(categories.data ?? []).map((c) => ({ value: c.id, label: c.nameFa })),
    ],
    [categories.data, t],
  );

  if (!canView) {
    return (
      <AdminPageShell title={t("title")}>
        <Alert variant="danger">{t("noPermission")}</Alert>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      title={t("title")}
      description={t("description")}
      stats={
        canManage ? (
          <div className="flex justify-end">
            <Button startIcon={<Plus className="size-4" />} onClick={openCreate}>
              {t("actions.create")}
            </Button>
          </div>
        ) : undefined
      }
    >
      <Card className="mb-mol grid gap-mol p-mol sm:grid-cols-3">
        <Input
          label={t("filters.search")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Select
          label={t("filters.status")}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: "", label: t("filters.allStatuses") },
            { value: "draft", label: t("status.draft") },
            { value: "pending", label: t("status.pending") },
            { value: "published", label: t("status.published") },
          ]}
        />
        <Select
          label={t("filters.category")}
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          options={categoryOptions}
        />
      </Card>

      {error ? <Alert variant="danger" className="mb-mol">{error}</Alert> : null}

      {posts.isLoading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : (
        <Card className="overflow-x-auto">
          <Table>
            <TableHead>
              <Tr>
                <Th>{t("columns.title")}</Th>
                <Th>{t("columns.slug")}</Th>
                <Th>{t("columns.status")}</Th>
                <Th>{t("columns.updated")}</Th>
                <Th>{t("columns.actions")}</Th>
              </Tr>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <Tr key={row.id}>
                  <Td>{row.titleFa}</Td>
                  <Td dir="ltr" className="font-mono text-xs">
                    {row.slug}
                  </Td>
                  <Td>{t(`status.${row.effectiveStatus}`)}</Td>
                  <Td>{new Date(row.updatedAt).toLocaleString("fa-IR")}</Td>
                  <Td>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setPreviewId(row.id);
                          setPreviewOpen(true);
                        }}
                      >
                        <Eye className="size-4" />
                      </Button>
                      {canManage ? (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => openEdit(row.id)}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => void onDelete(row)}>
                            <Trash2 className="size-4" />
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </Td>
                </Tr>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Modal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editingId ? t("editTitle") : t("createTitle")}
        size="xl"
      >
        <ModalBody className="max-h-[80vh] overflow-y-auto">
          {editingId && editingPost.isLoading ? (
            <Spinner />
          ) : (
            <BlogPostForm
              post={editorPost}
              onSaved={() => {
                setEditorOpen(false);
              }}
              onPreview={
                editingId
                  ? () => {
                      setPreviewId(editingId);
                      setPreviewOpen(true);
                    }
                  : undefined
              }
            />
          )}
        </ModalBody>
      </Modal>

      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={t("actions.preview")}
        size="xl"
      >
        <ModalBody className="max-h-[80vh] overflow-y-auto bg-neutral-50">
          {previewPost.isLoading || !previewPost.data ? (
            <Spinner />
          ) : (
            <BlogArticleView
              post={previewPost.data}
              shareUrl={`/blog/${previewPost.data.slug}`}
              preview
            />
          )}
        </ModalBody>
      </Modal>
    </AdminPageShell>
  );
}
