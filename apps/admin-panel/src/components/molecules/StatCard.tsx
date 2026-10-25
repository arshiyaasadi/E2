import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: number | string;
  className?: string;
}

export function StatCard({ label, value, className }: StatCardProps) {
  return (
    <div className={cn("glass-panel rounded-2xl border border-white/50 p-mol-md", className)}>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-atom-md text-2xl font-bold tracking-tight text-foreground">{value}</p>
    </div>
  );
}
