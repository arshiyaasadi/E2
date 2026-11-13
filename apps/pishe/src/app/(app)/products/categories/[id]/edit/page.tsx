import { Suspense } from "react";
import { Spinner } from "@/components/atoms/Spinner";
import { EditCategoryPage } from "@/features/products/components/CategoriesContent";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <EditCategoryPage categoryId={id} />
    </Suspense>
  );
}
