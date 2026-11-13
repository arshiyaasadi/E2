/**
 * Single-step badge for the basic product form.
 */
"use client";

import { useTranslations } from "next-intl";

export function ProductStepper() {
  const t = useTranslations("products.steps");

  return (
    <div
      aria-label={t("aria")}
      className="mb-mol-md flex animate-fade-rise justify-center"
    >
      <span className="inline-flex items-center gap-atom-md rounded-full border border-primary/25 bg-primary/10 px-pad-mol py-pad-atom text-sm font-semibold text-primary shadow-sm">
        <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs text-white">
          1
        </span>
        {t("basic")}
      </span>
    </div>
  );
}
