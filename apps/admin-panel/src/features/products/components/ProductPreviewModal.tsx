"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Badge, Button, Modal, ModalBody, ModalFooter, Spinner, Tabs } from "@/components/atoms";
import { Table, TableBody, TableHead, Td, Th, Tr } from "@/components/atoms/Table";
import { useProductDetail } from "@/features/products/queries";
import type { ProductDto } from "@/types/domain";

function formatPrice(value: number | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("fa-IR").format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ProductPreviewModal({
  open,
  product,
  onClose,
}: {
  open: boolean;
  product: ProductDto | null;
  onClose: () => void;
}) {
  const t = useTranslations("admin.products.preview");
  const [tab, setTab] = useState("overview");
  const { data, isLoading, isError } = useProductDetail(product?.id ?? null, open && !!product);

  useEffect(() => {
    if (open) setTab("overview");
  }, [open, product?.id]);

  const tabItems = [
    { key: "overview", label: t("tabs.overview") },
    { key: "variants", label: t("tabs.variants") },
    { key: "priceHistory", label: t("tabs.priceHistory") },
    { key: "productHistory", label: t("tabs.productHistory") },
  ];

  return (
    <Modal open={open} onClose={onClose} title={product ? product.title : t("title")} size="full">
      <ModalBody className="grid gap-mol">
        {isLoading ? (
          <div className="flex justify-center py-mol-md">
            <Spinner />
          </div>
        ) : isError || !data ? (
          <p className="text-sm text-danger">{t("error")}</p>
        ) : (
          <>
            <Tabs items={tabItems} active={tab} onChange={setTab} variant="pills" />

            {tab === "overview" ? (
              <div className="grid gap-mol lg:grid-cols-[280px_1fr]">
                <div className="rounded-2xl border border-white/45 bg-white/30 p-pad-mol">
                  {data.featuredImage?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={data.featuredImage.url}
                      alt={data.title}
                      className="aspect-square w-full rounded-xl object-cover ring-1 ring-white/60"
                    />
                  ) : (
                    <div className="flex aspect-square items-center justify-center rounded-xl bg-white/40 text-sm text-muted">
                      {t("noImage")}
                    </div>
                  )}
                  {data.media.length > 1 ? (
                    <div className="mt-mol grid grid-cols-4 gap-pad-atom">
                      {data.media.slice(0, 8).map((item) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={item.id}
                          src={item.url}
                          alt={item.altText ?? data.title}
                          className="aspect-square rounded-lg object-cover ring-1 ring-white/50"
                        />
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-mol">
                  <div className="rounded-2xl border border-white/45 bg-white/30 p-pad-mol">
                    <h4 className="text-sm font-semibold">{t("sections.general")}</h4>
                    <dl className="mt-mol grid gap-pad-atom text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-muted">{t("fields.slug")}</dt>
                        <dd className="font-mono">{data.slug}</dd>
                      </div>
                      <div>
                        <dt className="text-muted">{t("fields.status")}</dt>
                        <dd>
                          <Badge variant={data.status === "active" ? "success" : "neutral"}>
                            {data.status}
                          </Badge>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted">{t("fields.type")}</dt>
                        <dd>{data.productType}</dd>
                      </div>
                      <div>
                        <dt className="text-muted">{t("fields.basePrice")}</dt>
                        <dd>{formatPrice(data.basePrice)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted">{t("fields.comparePrice")}</dt>
                        <dd>{formatPrice(data.comparePrice)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted">{t("fields.brand")}</dt>
                        <dd>{data.brand?.name ?? "—"}</dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-muted">{t("fields.categories")}</dt>
                        <dd>
                          {data.categories.length
                            ? data.categories.map((item) => item.name).join("، ")
                            : "—"}
                        </dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-muted">{t("fields.tags")}</dt>
                        <dd className="flex flex-wrap gap-pad-atom">
                          {data.tags.length ? (
                            data.tags.map((tag) => (
                              <Badge key={tag.id} variant="secondary">
                                {tag.nameFa || tag.name}
                              </Badge>
                            ))
                          ) : (
                            "—"
                          )}
                        </dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-muted">{t("fields.description")}</dt>
                        <dd className="whitespace-pre-wrap">{data.description || "—"}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="rounded-2xl border border-white/45 bg-white/30 p-pad-mol">
                    <h4 className="text-sm font-semibold">{t("sections.seo")}</h4>
                    <dl className="mt-mol grid gap-pad-atom text-sm">
                      <div>
                        <dt className="text-muted">{t("fields.seoTitle")}</dt>
                        <dd>{data.seoTitle || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-muted">{t("fields.seoDescription")}</dt>
                        <dd>{data.seoDescription || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-muted">{t("fields.canonicalUrl")}</dt>
                        <dd className="break-all">{data.canonicalUrl || "—"}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>
            ) : null}

            {tab === "variants" ? (
              <div className="grid gap-mol">
                {data.options.length ? (
                  <div className="rounded-2xl border border-white/45 bg-white/30 p-pad-mol">
                    <h4 className="text-sm font-semibold">{t("sections.options")}</h4>
                    <div className="mt-mol flex flex-wrap gap-pad-atom">
                      {data.options.map((option) => (
                        <div key={option.id} className="rounded-xl border border-white/40 bg-white/20 px-pad-mol py-pad-atom">
                          <p className="text-xs font-semibold">{option.name}</p>
                          <p className="mt-atom-md text-xs text-muted">
                            {option.values.map((value) => value.value).join("، ")}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {data.variants.length === 0 ? (
                  <p className="text-sm text-muted">{t("noVariants")}</p>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-white/45">
                    <Table>
                      <TableHead>
                        <Tr hoverable={false}>
                          <Th>{t("columns.sku")}</Th>
                          <Th>{t("columns.options")}</Th>
                          <Th>{t("columns.price")}</Th>
                          <Th>{t("columns.comparePrice")}</Th>
                          <Th>{t("columns.default")}</Th>
                        </Tr>
                      </TableHead>
                      <TableBody>
                        {data.variants.map((variant) => (
                          <Tr key={variant.id}>
                            <Td className="font-mono text-xs">{variant.sku}</Td>
                            <Td>
                              {variant.optionValues.map((item) => `${item.optionName}: ${item.value}`).join(" · ")}
                            </Td>
                            <Td>{formatPrice(variant.price)}</Td>
                            <Td>{formatPrice(variant.comparePrice)}</Td>
                            <Td>{variant.isDefault ? t("defaultYes") : "—"}</Td>
                          </Tr>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            ) : null}

            {tab === "priceHistory" ? (
              data.priceHistory.length === 0 ? (
                <p className="text-sm text-muted">{t("noPriceHistory")}</p>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-white/45">
                  <Table>
                    <TableHead>
                      <Tr hoverable={false}>
                        <Th>{t("columns.time")}</Th>
                        <Th>{t("columns.target")}</Th>
                        <Th>{t("columns.oldPrice")}</Th>
                        <Th>{t("columns.newPrice")}</Th>
                        <Th>{t("columns.actor")}</Th>
                      </Tr>
                    </TableHead>
                    <TableBody>
                      {data.priceHistory.map((row) => (
                        <Tr key={row.id}>
                          <Td>{formatDate(row.createdAt)}</Td>
                          <Td>{row.variantSku ?? t("basePrice")}</Td>
                          <Td>{formatPrice(row.oldPrice)}</Td>
                          <Td>{formatPrice(row.newPrice)}</Td>
                          <Td>{row.actorType}</Td>
                        </Tr>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )
            ) : null}

            {tab === "productHistory" ? (
              data.productHistory.length === 0 ? (
                <p className="text-sm text-muted">{t("noProductHistory")}</p>
              ) : (
                <div className="grid gap-mol">
                  {data.productHistory.map((row) => (
                    <div key={row.id} className="rounded-2xl border border-white/45 bg-white/30 p-pad-mol">
                      <div className="flex flex-wrap items-center justify-between gap-pad-atom text-xs text-muted">
                        <span>{formatDate(row.createdAt)}</span>
                        <span>{row.actorType}</span>
                      </div>
                      <pre className="mt-mol max-h-48 overflow-auto rounded-xl bg-black/5 p-pad-mol text-xs">
                        {JSON.stringify(row.snapshot, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              )
            ) : null}
          </>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={onClose}>
          {t("close")}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
