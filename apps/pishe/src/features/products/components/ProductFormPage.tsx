"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Spinner } from "@/components/atoms/Spinner";
import { AppTemplate } from "@/components/templates/AppTemplate";
import { Stage1Form } from "@/features/products/components/Stage1Form";
import {
  useCreateProductMutation,
  usePatchProductMutation,
  useProductQuery,
} from "@/features/products/queries";
import { ROUTES } from "@/config/routes";

export function NewProductPage() {
  const t = useTranslations("products.form");
  const tNav = useTranslations("products.nav");
  const router = useRouter();
  const create = useCreateProductMutation();

  return (
    <AppTemplate
      crumbs={[
        { label: tNav("products"), href: ROUTES.products },
        { label: t("newTitle") },
      ]}
      denseMain
      dockPadding
    >
      <Stage1Form
        submitLabel={t("submit")}
        completeLabel={t("completeProduct")}
        onSubmit={async (values) => {
          await create.mutateAsync(values);
          router.push(ROUTES.productsList);
          router.refresh();
        }}
        onComplete={async (values) => {
          const product = await create.mutateAsync(values);
          router.push(ROUTES.productDetails(product.id));
        }}
      />
    </AppTemplate>
  );
}

export function EditProductPage({ productId }: { productId: string }) {
  const t = useTranslations("products.form");
  const tNav = useTranslations("products.nav");
  const router = useRouter();
  const query = useProductQuery(productId);
  const patch = usePatchProductMutation(productId);

  if (query.isLoading && !query.data) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!query.data) {
    return (
      <AppTemplate
        crumbs={[
          { label: tNav("products"), href: ROUTES.products },
          { label: t("editTitle") },
        ]}
      >
        <p className="text-muted">—</p>
      </AppTemplate>
    );
  }

  const product = query.data;

  return (
    <AppTemplate
      crumbs={[
        { label: tNav("products"), href: ROUTES.products },
        { label: product.title, href: ROUTES.product(productId) },
        { label: t("editTitle") },
      ]}
      denseMain
      dockPadding
    >
      <Stage1Form
        productStatus={product.status}
        initial={{
          title: product.title,
          priceRial: product.priceRial,
          description: product.description,
          mediaIds: product.mediaIds,
          brandId: product.brandId,
          categoryId: product.categoryId,
          groupCategoryIds: product.groupCategoryIds ?? [],
          photos: product.mediaIds.map((fileId) => ({
            localId: fileId,
            fileId,
            url: `/api/v1/media/${fileId}`,
            localPreview: `/api/v1/media/${fileId}`,
            status: "ready" as const,
          })),
        }}
        submitLabel={t("saveChanges")}
        completeLabel={t("completeProduct")}
        onSubmit={async (values) => {
          await patch.mutateAsync({
            title: values.title,
            description: values.description,
            mediaIds: values.mediaIds,
            brandId: values.brandId,
            categoryId: values.categoryId,
            groupCategoryIds: values.groupCategoryIds,
          });
          router.push(ROUTES.product(productId));
        }}
        onComplete={async (values) => {
          await patch.mutateAsync({
            title: values.title,
            description: values.description,
            mediaIds: values.mediaIds,
            brandId: values.brandId,
            categoryId: values.categoryId,
            groupCategoryIds: values.groupCategoryIds,
          });
          router.push(ROUTES.productDetails(productId));
        }}
      />
    </AppTemplate>
  );
}
