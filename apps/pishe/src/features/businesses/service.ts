import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import type {
  BusinessMemberResponse,
  BusinessResponse,
} from "@/types/api";

export type BusinessWriteInput = {
  name: string;
  description?: string | null;
  logoUrl?: string | null;
  color?: string | null;
  assignedAt?: string | null;
  links?: Array<{ title: string; url: string }>;
};

export async function listMyBusinessesRequest() {
  return apiClient.get<{
    businesses: Array<{ role: "MANAGER" | "ASSISTANT"; business: BusinessResponse }>;
  }>(ENDPOINTS.businesses.list);
}

export async function listAdminBusinessesRequest() {
  return apiClient.get<{ businesses: BusinessResponse[] }>(
    ENDPOINTS.businesses.adminList,
  );
}

export async function createBusinessRequest(input: BusinessWriteInput) {
  return apiClient.post<{ business: BusinessResponse }>(
    ENDPOINTS.businesses.adminList,
    input,
  );
}

export async function patchBusinessRequest(
  id: string,
  input: Partial<BusinessWriteInput>,
) {
  return apiClient.patch<{ business: BusinessResponse }>(
    `/admin/businesses/${id}`,
    input,
  );
}

export async function deleteBusinessRequest(id: string) {
  return apiClient.delete<{ ok: true }>(`/admin/businesses/${id}`);
}

export async function getBusinessRequest(id: string) {
  return apiClient.get<{ business: BusinessResponse }>(
    ENDPOINTS.businesses.byId(id),
  );
}

export async function listMembersRequest(businessId: string) {
  return apiClient.get<{ members: BusinessMemberResponse[] }>(
    ENDPOINTS.businesses.members(businessId),
  );
}

export async function addMemberRequest(
  businessId: string,
  input: { inviteCode: string; role: "MANAGER" | "ASSISTANT" },
) {
  return apiClient.post<{ member: BusinessMemberResponse }>(
    ENDPOINTS.businesses.members(businessId),
    input,
  );
}

export async function removeMemberRequest(
  businessId: string,
  membershipId: string,
) {
  return apiClient.delete<{ ok: true }>(
    ENDPOINTS.businesses.member(businessId, membershipId),
  );
}

export async function searchProfileByInviteRequest(code: string) {
  return apiClient.get<{
    profile: { id: string; inviteCode: string; displayName: string | null };
  }>(`${ENDPOINTS.profiles.searchByInvite}?code=${encodeURIComponent(code)}`);
}
