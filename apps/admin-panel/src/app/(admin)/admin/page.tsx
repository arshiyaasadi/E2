import { redirect } from "next/navigation";
import { ROUTES } from "@/config/routes";

export default function AdminRootPage() {
  redirect(ROUTES.adminDashboard);
}
