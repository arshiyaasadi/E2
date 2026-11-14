import { MembersContent } from "@/features/businesses/components/MembersContent";

export default async function BusinessMembersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MembersContent businessId={id} />;
}
