export function PanelLayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background p-pad-mol">
      <main>{children}</main>
    </div>
  );
}
