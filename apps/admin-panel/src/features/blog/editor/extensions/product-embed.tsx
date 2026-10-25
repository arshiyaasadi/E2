"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import {
  ReactNodeViewRenderer,
  NodeViewWrapper,
  type ReactNodeViewProps,
} from "@tiptap/react";
import { useQuery } from "@tanstack/react-query";
import { Package, Search, X } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Input, Modal, ModalBody, ModalFooter, Spinner } from "@/components/atoms";
import { apiClient } from "@/lib/api/client";
import type { ProductDto } from "@/types/domain";

async function searchProducts(q: string) {
  const sp = new URLSearchParams({ q, limit: "20" });
  return apiClient.get<ProductDto[]>(`/admin/products?${sp.toString()}`);
}

function ProductEmbedNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
}: ReactNodeViewProps) {
  const t = useTranslations("admin.blog.editor");
  const productId = (node.attrs.productId as string | null) ?? null;
  const [pickerOpen, setPickerOpen] = useState(!productId);
  const [q, setQ] = useState("");

  const productQuery = useQuery({
    queryKey: ["admin", "products", "embed", productId],
    queryFn: () => apiClient.get<ProductDto>(`/admin/products/${productId}`),
    enabled: !!productId,
  });

  const searchQuery = useQuery({
    queryKey: ["admin", "products", "search-embed", q],
    queryFn: () => searchProducts(q),
    enabled: pickerOpen && q.trim().length >= 1,
  });

  const product = productQuery.data;

  return (
    <NodeViewWrapper
      className={`my-4 rounded-2xl border bg-white/50 p-4 ${selected ? "ring-2 ring-primary/40" : "border-white/60"}`}
      data-drag-handle
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-xs font-medium text-muted">
          <Package className="size-3.5" />
          {t("productEmbed")}
        </span>
        <div className="flex gap-1">
          <Button type="button" size="sm" variant="ghost" onClick={() => setPickerOpen(true)}>
            {t("changeProduct")}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={deleteNode}>
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {!productId ? (
        <p className="text-sm text-muted">{t("selectProductHint")}</p>
      ) : productQuery.isLoading ? (
        <Spinner />
      ) : product ? (
        <div className="flex gap-3">
          {product.featuredImage?.url || product.media?.[0]?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.featuredImage?.url ?? product.media?.[0]?.url ?? ""}
              alt={product.featuredImage?.altText ?? product.media?.[0]?.altText ?? product.title}
              className="size-20 rounded-xl object-cover"
            />
          ) : (
            <div className="flex size-20 items-center justify-center rounded-xl bg-white/60">
              <Package className="size-6 text-muted" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-foreground">{product.title}</p>
            <p className="text-sm text-muted">
              {product.basePrice != null
                ? new Intl.NumberFormat("fa-IR").format(product.basePrice)
                : "—"}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-danger">{t("productNotFound")}</p>
      )}

      <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} title={t("pickProduct")} size="md">
        <ModalBody className="grid gap-mol">
          <Input
            label={t("searchProducts")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            startAddon={<Search className="size-4" />}
          />
          {searchQuery.isFetching ? <Spinner /> : null}
          <ul className="max-h-64 space-y-1 overflow-auto">
            {(searchQuery.data ?? []).map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-start hover:bg-white/60"
                  onClick={() => {
                    updateAttributes({ productId: p.id });
                    setPickerOpen(false);
                  }}
                >
                  <span className="truncate text-sm font-medium">{p.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="outline" onClick={() => setPickerOpen(false)}>
            {t("cancel")}
          </Button>
        </ModalFooter>
      </Modal>
    </NodeViewWrapper>
  );
}

export const ProductEmbed = Node.create({
  name: "productEmbed",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      productId: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="product-embed"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "product-embed" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ProductEmbedNodeView);
  },
});
