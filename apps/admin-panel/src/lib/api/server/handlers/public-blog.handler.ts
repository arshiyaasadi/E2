import {
  findPublishedBlogPostBySlug,
  listPublishedBlogPosts,
} from "@/lib/db/repositories/blog.repository";
import type { BffContext } from "@/lib/api/server/route-registry";
import type { ApiResponse } from "@/types/api";
import type { BlogPostDto, BlogPostListItemDto } from "@/types/domain";

export async function publicListBlogPostsHandler(): Promise<ApiResponse<BlogPostListItemDto[]>> {
  const data = await listPublishedBlogPosts();
  return { success: true, data };
}

export async function publicGetBlogPostHandler(
  ctx: BffContext,
): Promise<ApiResponse<BlogPostDto>> {
  const slug = ctx.params.slug;
  if (!slug || slug.length > 220) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid slug" } };
  }
  const data = await findPublishedBlogPostBySlug(slug);
  if (!data) {
    return { success: false, error: { code: "NOT_FOUND", message: "Post not found" } };
  }
  return { success: true, data };
}
