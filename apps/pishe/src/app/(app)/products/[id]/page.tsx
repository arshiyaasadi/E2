import { ProductDetailContent } from "@/features/products/components/ProductDetailContent";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProductDetailContent productId={id} />;
}
