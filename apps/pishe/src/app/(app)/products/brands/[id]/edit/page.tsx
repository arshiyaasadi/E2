import { EditBrandPage } from "@/features/products/components/BrandsContent";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EditBrandPage brandId={id} />;
}
