import { Suspense } from "react";
import { Spinner } from "@/components/atoms/Spinner";
import { NewCategoryPage } from "@/features/products/components/CategoriesContent";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <NewCategoryPage />
    </Suspense>
  );
}
