"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Pencil, Plus, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/atoms/Button";
import { Spinner } from "@/components/atoms/Spinner";
import { BottomActionButton } from "@/components/molecules/BottomActionButton";
import { EmptyState } from "@/components/molecules/EmptyState";
import { AppTemplate } from "@/components/templates/AppTemplate";
import { PhotoEditor } from "@/features/media/components/PhotoEditor";
import {
  MEDIA_LIBRARY_KEY,
  PRODUCTS_KEY,
  useMediaLibraryQuery,
  useReplaceMediaMutation,
} from "@/features/products/queries";
import { BottomActions } from "@/providers/BottomActionsProvider";
import { ROUTES } from "@/config/routes";
import { handleApiError } from "@/lib/api/client";

export function PhotosGalleryContent() {
  const t = useTranslations("products");
  const tNav = useTranslations("products.nav");
  const tHub = useTranslations("products.hub");
  const router = useRouter();
  const query = useMediaLibraryQuery();
  const replace = useReplaceMediaMutation();
  const queryClient = useQueryClient();
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const items = query.data ?? [];
  const hasItems = items.length > 0;
  const viewer = items.find((i) => i.fileId === viewerId) ?? null;

  return (
    <AppTemplate
      crumbs={[
        { label: tNav("products"), href: ROUTES.products },
        { label: tHub("photosTitle") },
      ]}
      denseMain
    >
      {hasItems ? (
        <BottomActions>
          <BottomActionButton
            icon={Plus}
            label={t("photos.addViaProduct")}
            onClick={() => router.push(ROUTES.productNew)}
          />
        </BottomActions>
      ) : null}

      {query.isLoading ? (
        <div className="flex justify-center py-pad-org">
          <Spinner />
        </div>
      ) : !hasItems ? (
        <EmptyState
          title={t("photos.empty")}
          body={t("photos.emptyBody")}
          action={
            <Button
              variant="outline"
              onClick={() => router.push(ROUTES.productNew)}
            >
              <Plus className="size-4" aria-hidden />
              {t("photos.addViaProduct")}
            </Button>
          }
        />
      ) : (
        <ul className="grid grid-cols-3 gap-atom-md sm:grid-cols-4">
          {items.map((item) => (
            <li key={item.fileId}>
              <button
                type="button"
                className="aspect-square w-full overflow-hidden rounded-2xl border border-border bg-surface-2 shadow-sm"
                onClick={() => {
                  setViewerId(item.fileId);
                  setError(null);
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${item.url}?v=${item.updatedAt}`}
                  alt=""
                  className="size-full object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      {viewer ? (
        <div className="fixed inset-0 z-[75] flex flex-col bg-black/95">
          <header className="flex items-center justify-between gap-mol px-pad-mol pb-pad-atom pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10"
              onClick={() => setViewerId(null)}
              aria-label={t("form.helpClose")}
            >
              <X className="size-5" />
            </Button>
            <p className="text-sm">
              {t("photos.usedIn", { count: viewer.productCount })}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10"
              onClick={() => setEditing(true)}
              aria-label={t("form.editPhoto")}
            >
              <Pencil className="size-5" />
            </Button>
          </header>
          <div className="flex min-h-0 flex-1 items-center justify-center p-pad-mol">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${viewer.url}?v=${viewer.updatedAt}`}
              alt=""
              className="max-h-full max-w-full object-contain"
            />
          </div>
          {error ? (
            <p className="px-pad-mol pb-pad-mol text-center text-sm text-danger">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}

      <PhotoEditor
        open={editing && Boolean(viewer)}
        imageSrc={viewer ? `${viewer.url}?v=${viewer.updatedAt}` : ""}
        onClose={() => setEditing(false)}
        onSave={async (file) => {
          if (!viewer) return;
          setError(null);
          try {
            await replace.mutateAsync({ fileId: viewer.fileId, file });
            void queryClient.invalidateQueries({ queryKey: MEDIA_LIBRARY_KEY });
            void queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY });
            setEditing(false);
          } catch (err) {
            setError(handleApiError(err));
            throw err;
          }
        }}
      />
    </AppTemplate>
  );
}
