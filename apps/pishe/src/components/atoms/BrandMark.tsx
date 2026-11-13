/**
 * @level atom
 * @spacing internal: none | external: none
 */
import { cn } from "@/lib/cn";

export function BrandMark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/pishe-mark.svg"
      alt=""
      className={cn("size-10 text-primary", className)}
    />
  );
}
