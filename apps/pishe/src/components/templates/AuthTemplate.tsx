/**
 * @level template
 * @spacing internal: p-pad-org gap-mol-md | external: none
 */
import { ThemeToggle } from "@/components/molecules/ThemeToggle";

export function AuthTemplate({
  children,
  wide = false,
}: {
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--color-primary-100)_0%,_transparent_55%)] opacity-80 dark:opacity-25"
      />
      <div className="absolute end-4 top-4 z-10">
        <ThemeToggle />
      </div>
      <div className="relative mx-auto flex min-h-dvh w-full items-center justify-center p-pad-org">
        <div
          className={
            wide
              ? "flex w-full max-w-4xl flex-col gap-mol-md"
              : "flex w-full max-w-md flex-col gap-mol-md"
          }
        >
          {children}
        </div>
      </div>
    </div>
  );
}
