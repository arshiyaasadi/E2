"use client";

import Link from "next/link";
import { Package } from "lucide-react";
import type { BlogEmbeddedProductDto, BlogFaqItem, BlogPostDto, MediaDto } from "@/types/domain";
import { BlogShareButton } from "@/features/blog/components/BlogShareButton";

type TipTapNode = {
  type?: string;
  text?: string;
  marks?: Array<{ type: string; attrs?: Record<string, string> }>;
  attrs?: Record<string, unknown>;
  content?: TipTapNode[];
};

function renderMarks(text: string, marks?: TipTapNode["marks"]) {
  let node: React.ReactNode = text;
  for (const mark of marks ?? []) {
    if (mark.type === "bold") node = <strong>{node}</strong>;
    else if (mark.type === "italic") node = <em>{node}</em>;
    else if (mark.type === "link" && mark.attrs?.href) {
      node = (
        <a href={mark.attrs.href} className="text-primary underline underline-offset-2">
          {node}
        </a>
      );
    }
  }
  return node;
}

function ProductCard({ product }: { product: BlogEmbeddedProductDto }) {
  return (
    <div className="my-6 flex gap-4 rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
      {product.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={product.imageUrl}
          alt={product.imageAlt ?? product.title}
          className="size-24 rounded-xl object-cover"
        />
      ) : (
        <div className="flex size-24 items-center justify-center rounded-xl bg-neutral-100">
          <Package className="size-7 text-neutral-400" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-neutral-900">{product.title}</p>
        <p className="mt-1 text-sm text-neutral-600">
          {product.basePrice != null
            ? `${new Intl.NumberFormat("fa-IR").format(product.basePrice)} تومان`
            : "—"}
        </p>
      </div>
    </div>
  );
}

function renderNode(
  node: TipTapNode,
  key: string,
  products: Map<string, BlogEmbeddedProductDto>,
): React.ReactNode {
  const children = node.content?.map((child, i) => renderNode(child, `${key}-${i}`, products));

  switch (node.type) {
    case "doc":
      return <>{children}</>;
    case "paragraph":
      return (
        <p key={key} className="mb-4 leading-8 text-neutral-800">
          {children}
        </p>
      );
    case "heading": {
      const level = Number(node.attrs?.level ?? 2);
      const className = "mb-3 mt-8 font-bold text-neutral-900";
      if (level === 3) return <h3 key={key} className={`text-lg ${className}`}>{children}</h3>;
      return <h2 key={key} className={`text-xl ${className}`}>{children}</h2>;
    }
    case "bulletList":
      return <ul key={key} className="mb-4 list-disc space-y-1 ps-6">{children}</ul>;
    case "orderedList":
      return <ol key={key} className="mb-4 list-decimal space-y-1 ps-6">{children}</ol>;
    case "listItem":
      return <li key={key}>{children}</li>;
    case "blockquote":
      return (
        <blockquote key={key} className="mb-4 border-s-4 border-neutral-300 ps-4 italic text-neutral-600">
          {children}
        </blockquote>
      );
    case "table":
      return (
        <div key={key} className="mb-4 overflow-x-auto">
          <table className="w-full border-collapse text-sm">{children}</table>
        </div>
      );
    case "tableRow":
      return <tr key={key}>{children}</tr>;
    case "tableHeader":
      return (
        <th key={key} className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-start">
          {children}
        </th>
      );
    case "tableCell":
      return (
        <td key={key} className="border border-neutral-200 px-3 py-2">
          {children}
        </td>
      );
    case "image":
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={key}
          src={String(node.attrs?.src ?? "")}
          alt={String(node.attrs?.alt ?? "")}
          className="my-6 w-full rounded-2xl"
        />
      );
    case "productEmbed": {
      const id = String(node.attrs?.productId ?? "");
      const product = products.get(id);
      if (!product) return null;
      return <ProductCard key={key} product={product} />;
    }
    case "hardBreak":
      return <br key={key} />;
    case "text":
      return <span key={key}>{renderMarks(node.text ?? "", node.marks)}</span>;
    default:
      return <div key={key}>{children}</div>;
  }
}

function FaqSection({ items }: { items: BlogFaqItem[] }) {
  if (!items.length) return null;
  return (
    <section className="mt-10 space-y-3">
      <h2 className="text-xl font-bold text-neutral-900">سوالات متداول</h2>
      {items.map((item, i) => (
        <details key={i} className="rounded-2xl border border-neutral-200 bg-white p-4">
          <summary className="cursor-pointer font-medium text-neutral-900">{item.question}</summary>
          <p className="mt-2 text-sm leading-7 text-neutral-700">{item.answer}</p>
        </details>
      ))}
    </section>
  );
}

export function BlogArticleView({
  post,
  shareUrl,
  preview = false,
}: {
  post: Pick<
    BlogPostDto,
    | "titleFa"
    | "title"
    | "slug"
    | "excerptFa"
    | "content"
    | "coverImage"
    | "faqItems"
    | "embeddedProducts"
    | "publishedAt"
    | "categories"
    | "tags"
  > & { coverImage?: MediaDto | null };
  shareUrl: string;
  preview?: boolean;
}) {
  const products = new Map(post.embeddedProducts.map((p) => [p.id, p]));
  const doc = post.content as TipTapNode;

  return (
    <article className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-8">
        <div className="mb-3 flex flex-wrap gap-2">
          {post.categories.map((c) => (
            <span key={c.id} className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-600">
              {c.nameFa}
            </span>
          ))}
        </div>
        <h1 className="text-3xl font-bold leading-tight text-neutral-950">{post.titleFa}</h1>
        {post.excerptFa ? (
          <p className="mt-3 text-base leading-7 text-neutral-600">{post.excerptFa}</p>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-neutral-500">
          {post.publishedAt
            ? new Date(post.publishedAt).toLocaleDateString("fa-IR")
            : null}
          {!preview ? <BlogShareButton title={post.titleFa} url={shareUrl} /> : null}
          {preview ? (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-800">پیش‌نمایش</span>
          ) : null}
        </div>
      </header>

      {post.coverImage?.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.coverImage.url}
          alt={post.coverImage.altText ?? post.titleFa}
          className="mb-8 aspect-[16/9] w-full rounded-3xl object-cover"
        />
      ) : null}

      <div>{renderNode(doc, "root", products)}</div>

      <FaqSection items={post.faqItems} />

      {post.tags.length > 0 ? (
        <div className="mt-8 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span key={tag.id} className="rounded-full bg-neutral-100 px-3 py-1 text-xs">
              #{tag.nameFa}
            </span>
          ))}
        </div>
      ) : null}

      {!preview ? (
        <p className="mt-10">
          <Link href="/blog" className="text-sm text-primary underline underline-offset-2">
            بازگشت به وبلاگ
          </Link>
        </p>
      ) : null}
    </article>
  );
}
