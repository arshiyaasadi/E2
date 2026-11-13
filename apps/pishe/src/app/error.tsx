"use client";

import { useEffect } from "react";
import { Button } from "@/components/atoms/Button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-mol bg-background p-pad-org text-center">
      <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
      <p className="text-sm text-muted">Please try again.</p>
      <Button type="button" onClick={reset}>
        Retry
      </Button>
    </div>
  );
}
