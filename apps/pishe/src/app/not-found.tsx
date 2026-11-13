import Link from "next/link";
import { Button } from "@/components/atoms/Button";
import { ROUTES } from "@/config/routes";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-mol bg-background p-pad-org text-center">
      <h1 className="text-xl font-semibold text-foreground">Page not found</h1>
      <Link href={ROUTES.home}>
        <Button type="button">Go home</Button>
      </Link>
    </div>
  );
}
