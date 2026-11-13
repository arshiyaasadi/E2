import { Stage2Form } from "@/features/products/components/Stage2Form";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <Stage2Form productId={id} />;
}
