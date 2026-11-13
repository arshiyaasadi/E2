import { Suspense } from "react";
import { Spinner } from "@/components/atoms/Spinner";
import { CategoriesListContent } from "@/features/products/components/CategoriesContent";

export default function CategoriesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <CategoriesListContent />
    </Suspense>
  );
}
