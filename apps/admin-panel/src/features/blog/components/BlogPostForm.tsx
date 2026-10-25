"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Alert, Button, Input, Select, Spinner } from "@/components/atoms";
import { BlogTipTapEditor } from "@/features/blog/editor/BlogTipTapEditor";
import { BlogCoverUpload } from "@/features/blog/components/BlogCoverUpload";
import {
  blogPostFormSchema,
  emptyTipTapDoc,
  type BlogPostFormValues,
} from "@/features/blog/schema";
import {
  useBlogCategories,
  useBlogTags,
  useCreateBlogPost,
  usePatchBlogPost,
  useUpdateBlogPost,
} from "@/features/blog/queries";
import { handleApiError } from "@/lib/api/client";
import type { BlogPostDto } from "@/types/domain";
import { cn } from "@/lib/utils";

function seoTone(length: number, idealMin: number, idealMax: number, hardMax: number) {
  if (length === 0) return "text-muted";
  if (length > hardMax) return "text-danger";
  if (length >= idealMin && length <= idealMax) return "text-emerald-600";
  return "text-amber-600";
}

function toFormValues(post?: BlogPostDto | null): BlogPostFormValues {
  if (!post) {
    return {
      titleFa: "",
      title: "",
      slug: "",
      excerpt: "",
      excerptFa: "",
      content: { ...emptyTipTapDoc },
      coverImageId: null,
      status: "draft",
      scheduledAt: null,
      categoryIds: [],
      tagIds: [],
      faqItems: [],
      seoTitle: "",
      seoDescription: "",
      ogTitle: "",
      ogDescription: "",
      ogImageId: null,
      canonicalUrl: "",
      metaRobots: "index,follow",
    };
  }
  return {
    titleFa: post.titleFa,
    title: post.title ?? "",
    slug: post.slug,
    excerpt: post.excerpt ?? "",
    excerptFa: post.excerptFa ?? "",
    content: post.content ?? { ...emptyTipTapDoc },
    coverImageId: post.coverImageId,
    status: post.status,
    scheduledAt: post.scheduledAt,
    categoryIds: post.categoryIds,
    tagIds: post.tagIds,
    faqItems: post.faqItems ?? [],
    seoTitle: post.seoTitle ?? "",
    seoDescription: post.seoDescription ?? "",
    ogTitle: post.ogTitle ?? "",
    ogDescription: post.ogDescription ?? "",
    ogImageId: post.ogImageId,
    canonicalUrl: post.canonicalUrl ?? "",
    metaRobots: post.metaRobots,
  };
}

export function BlogPostForm({
  post,
  onSaved,
  onPreview,
}: {
  post?: BlogPostDto | null;
  onSaved: (post: BlogPostDto) => void;
  onPreview?: () => void;
}) {
  const t = useTranslations("admin.blog");
  const categories = useBlogCategories();
  const tags = useBlogTags();
  const createPost = useCreateBlogPost();
  const updatePost = useUpdateBlogPost();
  const patchPost = usePatchBlogPost();
  const [error, setError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(post?.coverImage?.url ?? null);
  const [postId, setPostId] = useState<string | null>(post?.id ?? null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const form = useForm<BlogPostFormValues>({
    resolver: zodResolver(blogPostFormSchema),
    defaultValues: toFormValues(post),
    mode: "onChange",
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "faqItems",
  });

  useEffect(() => {
    form.reset(toFormValues(post));
    setPostId(post?.id ?? null);
    setCoverUrl(post?.coverImage?.url ?? null);
  }, [post, form]);

  const seoTitle = form.watch("seoTitle") ?? "";
  const seoDescription = form.watch("seoDescription") ?? "";
  const slug = form.watch("slug");
  const status = form.watch("status");

  const categoryOptions = useMemo(
    () =>
      (categories.data ?? []).map((c) => ({
        value: c.id,
        label: `${c.nameFa}${c.parentId ? "" : ""}`,
      })),
    [categories.data],
  );

  const tagOptions = useMemo(
    () => (tags.data ?? []).map((tag) => ({ value: tag.id, label: tag.nameFa })),
    [tags.data],
  );

  function buildPayload(values: BlogPostFormValues) {
    return {
      titleFa: values.titleFa.trim(),
      title: values.title?.trim() || null,
      slug: values.slug.trim(),
      excerpt: values.excerpt?.trim() || null,
      excerptFa: values.excerptFa?.trim() || null,
      content: values.content,
      coverImageId: values.coverImageId,
      status: values.status,
      scheduledAt: values.scheduledAt || null,
      categoryIds: values.categoryIds,
      tagIds: values.tagIds,
      faqItems: values.faqItems,
      seoTitle: values.seoTitle?.trim() || null,
      seoDescription: values.seoDescription?.trim() || null,
      ogTitle: values.ogTitle?.trim() || null,
      ogDescription: values.ogDescription?.trim() || null,
      ogImageId: values.ogImageId,
      canonicalUrl: values.canonicalUrl?.trim() || null,
      metaRobots: values.metaRobots || "index,follow",
    };
  }

  async function onSubmit(values: BlogPostFormValues) {
    setError(null);
    try {
      const payload = buildPayload(values);
      const saved = postId
        ? await updatePost.mutateAsync({ id: postId, input: payload })
        : await createPost.mutateAsync(payload);
      setPostId(saved.id);
      setLastSavedAt(new Date().toISOString());
      onSaved(saved);
    } catch (err) {
      setError(handleApiError(err));
    }
  }

  // Autosave every 30s when dirty and post exists
  useEffect(() => {
    if (!postId) return;
    const subscription = form.watch(() => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      autosaveTimer.current = setTimeout(async () => {
        if (!form.formState.isDirty) return;
        const values = form.getValues();
        const slugOk = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(values.slug.trim());
        if (!values.titleFa.trim() || !slugOk) return;
        try {
          const saved = await patchPost.mutateAsync({
            id: postId,
            input: buildPayload(values),
          });
          setLastSavedAt(new Date().toISOString());
          form.reset(toFormValues(saved), { keepValues: true });
        } catch {
          // silent autosave failure
        }
      }, 30_000);
    });
    return () => {
      subscription.unsubscribe();
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [postId, form, patchPost]);

  const pending = createPost.isPending || updatePost.isPending;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-mol-lg">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-muted">
          {lastSavedAt
            ? t("autosave.savedAt", {
                time: new Date(lastSavedAt).toLocaleTimeString("fa-IR"),
              })
            : t("autosave.hint")}
          {patchPost.isPending ? ` · ${t("autosave.saving")}` : null}
        </div>
        <div className="flex gap-2">
          {postId && onPreview ? (
            <Button type="button" variant="outline" startIcon={<Eye className="size-4" />} onClick={onPreview}>
              {t("actions.preview")}
            </Button>
          ) : null}
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner /> : t("actions.save")}
          </Button>
        </div>
      </div>

      {error ? <Alert variant="danger">{error}</Alert> : null}

      <div className="grid gap-mol lg:grid-cols-[1fr_320px]">
        <div className="grid gap-mol">
          <Input
            label={t("fields.titleFa")}
            {...form.register("titleFa")}
            error={form.formState.errors.titleFa?.message}
          />
          <Input label={t("fields.titleEn")} {...form.register("title")} dir="ltr" />
          <div>
            <Input
              label={t("fields.slug")}
              {...form.register("slug")}
              dir="ltr"
              error={form.formState.errors.slug?.message}
              hint={t("fields.slugHint")}
            />
            <p
              className={cn(
                "mt-1 text-xs",
                /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? "text-emerald-600" : "text-danger",
              )}
            >
              /blog/{slug || "…"}
            </p>
          </div>
          <Input label={t("fields.excerptFa")} {...form.register("excerptFa")} />

          <Controller
            control={form.control}
            name="content"
            render={({ field }) => (
              <div>
                <span className="mb-2 block text-sm font-medium">{t("fields.content")}</span>
                <BlogTipTapEditor value={field.value} onChange={field.onChange} />
              </div>
            )}
          />

          <div className="grid gap-2 rounded-2xl border border-white/60 bg-white/35 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{t("fields.faq")}</h3>
              <Button
                type="button"
                size="sm"
                variant="outline"
                startIcon={<Plus className="size-4" />}
                onClick={() => append({ question: "", answer: "" })}
              >
                {t("actions.addFaq")}
              </Button>
            </div>
            {fields.map((field, index) => (
              <div key={field.id} className="grid gap-2 rounded-xl bg-white/40 p-3">
                <Input
                  label={t("fields.faqQuestion")}
                  {...form.register(`faqItems.${index}.question`)}
                />
                <Input
                  label={t("fields.faqAnswer")}
                  {...form.register(`faqItems.${index}.answer`)}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  startIcon={<Trash2 className="size-4" />}
                  onClick={() => remove(index)}
                >
                  {t("actions.removeFaq")}
                </Button>
              </div>
            ))}
          </div>
        </div>

        <aside className="grid gap-mol self-start">
          <Select
            label={t("fields.status")}
            value={status}
            onChange={(e) => form.setValue("status", e.target.value as BlogPostFormValues["status"], { shouldDirty: true })}
            options={[
              { value: "draft", label: t("status.draft") },
              { value: "pending", label: t("status.pending") },
              { value: "published", label: t("status.published") },
            ]}
          />
          <Input
            label={t("fields.scheduledAt")}
            type="datetime-local"
            dir="ltr"
            value={
              form.watch("scheduledAt")
                ? new Date(form.watch("scheduledAt")!).toISOString().slice(0, 16)
                : ""
            }
            onChange={(e) =>
              form.setValue(
                "scheduledAt",
                e.target.value ? new Date(e.target.value).toISOString() : null,
                { shouldDirty: true },
              )
            }
          />

          <Controller
            control={form.control}
            name="coverImageId"
            render={({ field }) => (
              <BlogCoverUpload
                value={{ mediaId: field.value, url: coverUrl, media: post?.coverImage }}
                onChange={(v) => {
                  field.onChange(v.mediaId);
                  setCoverUrl(v.url);
                }}
              />
            )}
          />

          <div>
            <span className="mb-2 block text-sm font-medium">{t("fields.categories")}</span>
            <div className="max-h-40 space-y-1 overflow-auto rounded-xl border border-white/50 bg-white/30 p-2">
              {categoryOptions.map((opt) => {
                const checked = form.watch("categoryIds").includes(opt.value);
                return (
                  <label key={opt.value} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        const current = form.getValues("categoryIds");
                        form.setValue(
                          "categoryIds",
                          checked ? current.filter((id) => id !== opt.value) : [...current, opt.value],
                          { shouldDirty: true },
                        );
                      }}
                    />
                    {opt.label}
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <span className="mb-2 block text-sm font-medium">{t("fields.tags")}</span>
            <div className="max-h-40 space-y-1 overflow-auto rounded-xl border border-white/50 bg-white/30 p-2">
              {tagOptions.map((opt) => {
                const checked = form.watch("tagIds").includes(opt.value);
                return (
                  <label key={opt.value} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        const current = form.getValues("tagIds");
                        form.setValue(
                          "tagIds",
                          checked ? current.filter((id) => id !== opt.value) : [...current, opt.value],
                          { shouldDirty: true },
                        );
                      }}
                    />
                    {opt.label}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="grid gap-2 rounded-2xl border border-white/60 bg-white/35 p-3">
            <h3 className="text-sm font-semibold">{t("fields.seo")}</h3>
            <div>
              <Input label={t("fields.seoTitle")} {...form.register("seoTitle")} />
              <p className={cn("mt-1 text-xs", seoTone(seoTitle.length, 50, 60, 180))}>
                {seoTitle.length}/60
              </p>
            </div>
            <div>
              <Input label={t("fields.seoDescription")} {...form.register("seoDescription")} />
              <p className={cn("mt-1 text-xs", seoTone(seoDescription.length, 120, 160, 320))}>
                {seoDescription.length}/160
              </p>
            </div>
            <Input
              label={t("fields.canonicalUrl")}
              {...form.register("canonicalUrl")}
              dir="ltr"
            />
          </div>
        </aside>
      </div>
    </form>
  );
}
