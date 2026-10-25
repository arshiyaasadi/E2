import { apiClient } from "@/lib/api/client";
import type {
  CategoryDto,
  CategoryReorderItem,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "@/types/domain";

export function fetchCategories() {
  return apiClient.get<CategoryDto[]>("/admin/categories");
}

export function createCategory(input: CreateCategoryInput) {
  return apiClient.post<CategoryDto>("/admin/categories", input);
}

export function updateCategory(categoryId: string, input: UpdateCategoryInput) {
  return apiClient.put<CategoryDto>(`/admin/categories/${categoryId}`, input);
}

export function reorderCategories(items: CategoryReorderItem[]) {
  return apiClient.put<CategoryDto[]>("/admin/categories/reorder", { items });
}

export function deleteCategory(categoryId: string) {
  return apiClient.delete<{ ok: true }>(`/admin/categories/${categoryId}`);
}
