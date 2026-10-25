import Link from "next/link";
import type { Metadata } from "next";
import { listPublishedBlogPosts } from "@/lib/db/repositories/blog.repository";

export const metadata: Metadata = {
  title: "وبلاگ",
  description: "مقالات و راهنماهای فروشگاه",
};

export default async function BlogIndexPage() {
  const posts = await listPublishedBlogPosts();

  return (
    <main className="min-h-screen bg-gradient-to-b from-neutral-50 to-white" dir="rtl">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <header className="mb-10">
          <h1 className="text-3xl font-bold text-neutral-950">وبلاگ</h1>
          <p className="mt-2 text-neutral-600">مقالات و راهنماهای فروشگاه</p>
        </header>

        {posts.length === 0 ? (
          <p className="text-neutral-500">هنوز مقاله‌ای منتشر نشده است.</p>
        ) : (
          <ul className="space-y-6">
            {posts.map((post) => (
              <li key={post.id}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="block overflow-hidden rounded-3xl border border-neutral-200 bg-white transition hover:shadow-md"
                >
                  {post.coverImage?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.coverImage.url}
                      alt={post.coverImage.altText ?? post.titleFa}
                      className="aspect-[16/9] w-full object-cover"
                    />
                  ) : null}
                  <div className="p-5">
                    <h2 className="text-xl font-semibold text-neutral-900">{post.titleFa}</h2>
                    {post.excerptFa ? (
                      <p className="mt-2 line-clamp-2 text-sm text-neutral-600">{post.excerptFa}</p>
                    ) : null}
                    <span className="mt-3 inline-block text-sm text-primary">ادامه مطلب</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
