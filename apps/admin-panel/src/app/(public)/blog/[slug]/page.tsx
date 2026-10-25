import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { BlogPosting, FAQPage, WithContext } from "schema-dts";
import { BlogArticleView } from "@/features/blog/components/BlogArticleView";
import { findPublishedBlogPostBySlug } from "@/lib/db/repositories/blog.repository";
import { clientEnv } from "@/config/env.client";

type PageProps = { params: Promise<{ slug: string }> };

function siteOrigin() {
  return clientEnv.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await findPublishedBlogPostBySlug(slug);
  if (!post) return { title: "مقاله یافت نشد" };

  const title = post.seoTitle || post.titleFa;
  const description = post.seoDescription || post.excerptFa || undefined;
  const ogImage = post.ogImage?.url || post.coverImage?.url || undefined;

  return {
    title,
    description,
    robots: post.metaRobots,
    alternates: {
      canonical: post.canonicalUrl || `${siteOrigin()}/blog/${post.slug}`,
    },
    openGraph: {
      title: post.ogTitle || title,
      description: post.ogDescription || description,
      images: ogImage ? [ogImage] : undefined,
      type: "article",
      url: `${siteOrigin()}/blog/${post.slug}`,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await findPublishedBlogPostBySlug(slug);
  if (!post) notFound();

  const shareUrl = `${siteOrigin()}/blog/${post.slug}`;

  const article: WithContext<BlogPosting> = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.seoTitle || post.titleFa,
    description: post.seoDescription || post.excerptFa || undefined,
    datePublished: post.publishedAt ?? undefined,
    dateModified: post.updatedAt,
    mainEntityOfPage: shareUrl,
    image: post.coverImage?.url || post.ogImage?.url || undefined,
    inLanguage: "fa",
  };

  const schemas: object[] = [article];

  if (post.faqItems.length > 0) {
    const faq: WithContext<FAQPage> = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: post.faqItems.map((item) => ({
        "@type": "Question" as const,
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer" as const,
          text: item.answer,
        },
      })),
    };
    schemas.push(faq);
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-neutral-50 to-white" dir="rtl">
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <BlogArticleView post={post} shareUrl={shareUrl} />
    </main>
  );
}
