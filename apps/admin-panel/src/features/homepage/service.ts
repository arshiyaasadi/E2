import { ENDPOINTS } from "@/lib/api/endpoints";
import { apiClient } from "@/lib/api/client";
import type {
  CreateHomepageSectionInput,
  HomepageSectionDto,
  UpdateHomepageSectionInput,
} from "@/types/domain";

export function fetchHomepageSections() {
  return apiClient.get<HomepageSectionDto[]>(ENDPOINTS.ADMIN.HOMEPAGE_SECTIONS.ROOT);
}

export function createHomepageSection(input: CreateHomepageSectionInput) {
  return apiClient.post<HomepageSectionDto>(ENDPOINTS.ADMIN.HOMEPAGE_SECTIONS.ROOT, input);
}

export function updateHomepageSection(sectionId: string, input: UpdateHomepageSectionInput) {
  return apiClient.put<HomepageSectionDto>(
    ENDPOINTS.ADMIN.HOMEPAGE_SECTIONS.BY_ID(sectionId),
    input,
  );
}

export function deleteHomepageSection(sectionId: string) {
  return apiClient.delete<{ ok: true }>(ENDPOINTS.ADMIN.HOMEPAGE_SECTIONS.BY_ID(sectionId));
}

export function reorderHomepageSection(sectionId: string, otherId: string) {
  return apiClient.post<HomepageSectionDto[]>(
    ENDPOINTS.ADMIN.HOMEPAGE_SECTIONS.REORDER(sectionId),
    { otherId },
  );
}
