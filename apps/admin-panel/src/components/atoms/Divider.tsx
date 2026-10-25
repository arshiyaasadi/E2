/**
 * @level atom
 * @spacing internal: gap-pad-atom-md (divider + label) | external: none
 */
import { cn } from "@/lib/utils";

export interface DividerProps {
  label?: string;
  orientation?: "horizontal" | "vertical";
  className?: string;
}

export function Divider({ label, orientation = "horizontal", className }: DividerProps) {
  if (orientation === "vertical") {
    return <div className={cn("inline-block h-full w-px bg-border", className)} />;
  }

  if (label) {
    return (
      <div className={cn("flex items-center gap-pad-atom-md", className)}>
        <span className="h-px flex-1 bg-border" />
        <span className="shrink-0 text-xs text-muted">{label}</span>
        <span className="h-px flex-1 bg-border" />
      </div>
    );
  }

  return <hr className={cn("border-border", className)} />;
}
