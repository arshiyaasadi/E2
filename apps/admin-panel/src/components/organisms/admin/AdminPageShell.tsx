import { SectionHeader } from "@/components/molecules/SectionHeader";

interface AdminPageShellProps {
  title: string;
  description?: string;
  stats?: React.ReactNode;
  children: React.ReactNode;
}

export function AdminPageShell({ title, description, stats, children }: AdminPageShellProps) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-mol-md">
      <div className="flex flex-col gap-mol">
        <SectionHeader title={title} description={description} />
        {stats}
      </div>
      {children}
    </div>
  );
}
