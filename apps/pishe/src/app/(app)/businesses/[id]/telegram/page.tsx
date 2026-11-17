import { TelegramSettingsContent } from "@/features/spaces/components/TelegramSettingsContent";

export default async function BusinessTelegramPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TelegramSettingsContent businessId={id} />;
}
