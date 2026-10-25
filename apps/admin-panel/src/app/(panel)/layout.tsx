import { PanelLayoutShell } from "./PanelLayoutShell";

export default function PanelGroupLayout({ children }: { children: React.ReactNode }) {
  return <PanelLayoutShell>{children}</PanelLayoutShell>;
}
