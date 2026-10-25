"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, ImageIcon, Trash2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  Pagination,
  Select,
  Spinner,
} from "@/components/atoms";
import { AdminPageShell } from "@/components/organisms/admin/AdminPageShell";
import {
  useDeleteMediaItem,
  useMediaItem,
  useMediaList,
  useUpdateMediaItem,
  useUploadMedia,
} from "@/features/media/queries";
import { handleApiError } from "@/lib/api/client";
import { MEDIA_FOLDERS, MEDIA_FOLDER_VALUES, MEDIA_UPLOAD_LIMITS } from "@/lib/media/constants";
import type { MediaFolder } from "@/lib/media/folders";
import { hasPermission } from "@/config/roles";
import { useAuthUser } from "@/store/slices/auth.slice";
import type { MediaDto } from "@/types/domain";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 24;

function mediaLabel(item: MediaDto) {
  return item.title || item.altText || item.storageKey.split("/").pop() || item.id.slice(0, 8);
}

function isImageMime(mimeType: string | null) {
  return !!mimeType?.startsWith("image/");
}

function MediaDetailModal({
  mediaId,
  open,
  onClose,
}: {
  mediaId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("admin.media.library");
  const user = useAuthUser();
  const canManage = hasPermission(user.permissions, "products.manage", user.role);
  const { data: media, isLoading, isError } = useMediaItem(mediaId);
  const updateMedia = useUpdateMediaItem();
  const deleteMedia = useDeleteMediaItem();
  const [title, setTitle] = useState("");
  const [altText, setAltText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!media) return;
    setTitle(media.title ?? "");
    setAltText(media.altText ?? "");
    setError(null);
    setCopied(false);
  }, [media]);

  async function onSave() {
    if (!mediaId) return;
    setError(null);
    try {
      await updateMedia.mutateAsync({
        mediaId,
        input: {
          title: title.trim() || null,
          altText: altText.trim() || null,
        },
      });
      onClose();
    } catch (err) {
      setError(handleApiError(err));
    }
  }

  async function onDelete() {
    if (!mediaId || !media) return;
    if (!window.confirm(t("confirmDelete"))) return;
    setError(null);
    try {
      await deleteMedia.mutateAsync(mediaId);
      onClose();
    } catch (err) {
      setError(handleApiError(err));
    }
  }

  async function copyUrl() {
    if (!media?.url) return;
    await navigator.clipboard.writeText(media.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Modal open={open} onClose={onClose} title={t("detailTitle")} size="lg">
      <ModalBody className="grid gap-mol">
        {isLoading ? (
          <div className="flex justify-center py-org">
            <Spinner />
          </div>
        ) : isError || !media ? (
          <Alert variant="danger">{t("detailError")}</Alert>
        ) : (
          <>
            <div className="overflow-hidden rounded-2xl border bg-muted/20">
              {isImageMime(media.mimeType) ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={media.url}
                  alt={media.altText ?? ""}
                  className="mx-auto max-h-[360px] w-full object-contain"
                />
              ) : (
                <div className="flex aspect-video items-center justify-center text-muted">
                  <ImageIcon className="size-12" />
                </div>
              )}
            </div>

            <dl className="grid gap-atom text-sm md:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">{t("fields.folder")}</dt>
                <dd>{t(`folders.${media.folder}` as "folders.general")}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("fields.mimeType")}</dt>
                <dd>{media.mimeType ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("fields.size")}</dt>
                <dd>
                  {media.width && media.height
                    ? `${media.width} × ${media.height}`
                    : t("sizeUnknown")}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("fields.createdAt")}</dt>
                <dd>{new Date(media.createdAt).toLocaleString("fa-IR")}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("fields.usage")}</dt>
                <dd>
                  {media.usageCount > 0 ? (
                    <Badge variant="warning">{t("usageCount", { count: media.usageCount })}</Badge>
                  ) : (
                    <Badge variant="neutral">{t("usageNone")}</Badge>
                  )}
                </dd>
              </div>
            </dl>

            <Input
              label={t("fields.url")}
              value={media.url}
              readOnly
              hint={copied ? t("copied") : undefined}
            />

            {canManage ? (
              <>
                <Input
                  label={t("fields.title")}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
                <Input
                  label={t("fields.altText")}
                  value={altText}
                  onChange={(event) => setAltText(event.target.value)}
                />
              </>
            ) : null}

            {error ? <Alert variant="danger">{error}</Alert> : null}
          </>
        )}
      </ModalBody>
      <ModalFooter>
        {media ? (
          <Button variant="outline" startIcon={<Copy className="size-4" />} onClick={() => void copyUrl()}>
            {t("actions.copyUrl")}
          </Button>
        ) : null}
        <Button variant="outline" onClick={onClose}>
          {t("actions.close")}
        </Button>
        {canManage && media ? (
          <>
            <Button
              variant="danger"
              startIcon={<Trash2 className="size-4" />}
              onClick={() => void onDelete()}
              disabled={deleteMedia.isPending || media.usageCount > 0}
            >
              {t("actions.delete")}
            </Button>
            <Button onClick={() => void onSave()} disabled={updateMedia.isPending}>
              {t("actions.save")}
            </Button>
          </>
        ) : null}
      </ModalFooter>
    </Modal>
  );
}

export function AdminMediaLibraryPanel() {
  const t = useTranslations("admin.media.library");
  const uploadT = useTranslations("admin.media");
  const user = useAuthUser();
  const canView = hasPermission(user.permissions, "products.view", user.role);
  const canManage = hasPermission(user.permissions, "products.manage", user.role);
  const inputRef = useRef<HTMLInputElement>(null);

  const [q, setQ] = useState("");
  const [mimeFilter, setMimeFilter] = useState("");
  const [folderFilter, setFolderFilter] = useState("");
  const [uploadFolder, setUploadFolder] = useState<MediaFolder>(MEDIA_FOLDERS.GENERAL);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const params = useMemo(
    () => ({
      q: q.trim() || undefined,
      mimeType: mimeFilter || undefined,
      folder: folderFilter || undefined,
      limit: String(PAGE_SIZE),
      offset: String((page - 1) * PAGE_SIZE),
    }),
    [q, mimeFilter, folderFilter, page],
  );

  const { data, isLoading, isError } = useMediaList(params);
  const upload = useUploadMedia();

  useEffect(() => {
    setPage(1);
  }, [q, mimeFilter, folderFilter]);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploadError(null);
    try {
      for (const file of Array.from(files)) {
        await upload.mutateAsync({
          file,
          options: { folder: uploadFolder, altText: file.name, title: file.name },
        });
      }
    } catch (err) {
      setUploadError(handleApiError(err));
    }
  }

  const maxMb = Math.round(MEDIA_UPLOAD_LIMITS.maxBytes / (1024 * 1024));

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
          <div className="flex flex-wrap items-center justify-between gap-mol">
            <p className="text-sm text-muted-foreground">
              {uploadT("limits", { maxMb })}
            </p>
            <div className="flex flex-wrap items-end gap-mol">
              <Select
                label={t("fields.uploadFolder")}
                value={uploadFolder}
                onChange={(event) => setUploadFolder(event.target.value as MediaFolder)}
                options={MEDIA_FOLDER_VALUES.map((folder) => ({
                  value: folder,
                  label: t(`folders.${folder}`),
                }))}
                className="min-w-[180px]"
              />
              <Button
                startIcon={upload.isPending ? undefined : <Upload className="size-4" />}
                disabled={upload.isPending}
                onClick={() => inputRef.current?.click()}
              >
                {upload.isPending ? t("uploading") : t("actions.upload")}
              </Button>
            </div>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={MEDIA_UPLOAD_LIMITS.allowedMimeTypes.join(",")}
              className="hidden"
              onChange={(event) => {
                void handleFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </div>
        ) : null
      }
    >
      <div className="mb-mol grid gap-mol md:grid-cols-[1fr_180px_200px]">
        <Input
          label={t("fields.search")}
          value={q}
          onChange={(event) => setQ(event.target.value)}
        />
        <Select
          label={t("fields.folderFilter")}
          value={folderFilter}
          onChange={(event) => setFolderFilter(event.target.value)}
          options={[
            { value: "", label: t("filters.allFolders") },
            ...MEDIA_FOLDER_VALUES.map((folder) => ({
              value: folder,
              label: t(`folders.${folder}`),
            })),
          ]}
        />
        <Select
          label={t("fields.typeFilter")}
          value={mimeFilter}
          onChange={(event) => setMimeFilter(event.target.value)}
          options={[
            { value: "", label: t("filters.all") },
            { value: "image/", label: t("filters.images") },
          ]}
        />
      </div>

      {uploadError ? <Alert variant="danger" className="mb-mol">{uploadError}</Alert> : null}

      <Card className="p-mol">
        {isLoading ? (
          <div className="flex justify-center py-org">
            <Spinner />
          </div>
        ) : isError ? (
          <Alert variant="danger">{t("error")}</Alert>
        ) : !data?.items.length ? (
          <EmptyState
            title={t("emptyTitle")}
            description={t("emptyDescription")}
            action={
              canManage ? (
                <Button onClick={() => inputRef.current?.click()}>{t("actions.upload")}</Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <p className="mb-mol text-sm text-muted-foreground">
              {t("resultCount", { count: data.total })}
            </p>
            <div className="grid grid-cols-2 gap-mol sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {data.items.map((item: MediaDto) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={cn(
                    "group overflow-hidden rounded-xl border bg-white/40 text-start transition",
                    "hover:border-primary hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  )}
                >
                  <div className="aspect-square w-full overflow-hidden bg-muted/30">
                    {isImageMime(item.mimeType) ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={item.thumbUrl || item.url}
                        alt={item.altText ?? ""}
                        className="size-full object-cover transition group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-muted">
                        <ImageIcon className="size-8" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-atom p-pad-atom">
                    <p className="truncate text-xs font-medium">{mediaLabel(item)}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {t(`folders.${item.folder}` as "folders.general")}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {new Date(item.createdAt).toLocaleDateString("fa-IR")}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {data.total > PAGE_SIZE ? (
              <Pagination
                className="mt-mol"
                page={page}
                total={data.total}
                limit={PAGE_SIZE}
                onChange={setPage}
              />
            ) : null}
          </>
        )}
      </Card>

      <MediaDetailModal
        mediaId={selectedId}
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
      />
    </AdminPageShell>
  );
}
