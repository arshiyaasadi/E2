"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-mol p-pad-mol">
      <h2 className="text-lg font-semibold">خطایی رخ داد</h2>
      <p className="text-sm text-muted">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-primary px-pad-mol py-atom-md text-sm text-white"
      >
        تلاش مجدد
      </button>
    </div>
  );
}
