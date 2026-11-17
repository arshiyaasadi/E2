import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import type {
  BusinessTelegramStateResponse,
  FileSpaceUsageResponse,
  TelegramBindingResponse,
  TelegramIngestConfigResponse,
} from "@/types/api";

export async function getMyUsageRequest() {
  return apiClient.get<{ usage: FileSpaceUsageResponse }>(ENDPOINTS.usage.me);
}

export async function getBusinessUsageRequest(businessId: string) {
  return apiClient.get<{ usage: FileSpaceUsageResponse }>(
    ENDPOINTS.businesses.usage(businessId),
  );
}

export async function getBusinessTelegramRequest(businessId: string) {
  return apiClient.get<{ telegram: BusinessTelegramStateResponse }>(
    ENDPOINTS.businesses.telegram(businessId),
  );
}

export async function prepareBusinessTelegramRequest(businessId: string) {
  return apiClient.post<{
    binding: TelegramBindingResponse;
    deepLink: string;
    businessCode: string;
    botUsername: string;
  }>(ENDPOINTS.businesses.telegramPrepare(businessId), {});
}

export async function patchTelegramConfigRequest(
  businessId: string,
  input: Partial<{
    storeText: boolean;
    downloadPhoto: boolean;
    downloadDocument: boolean;
    downloadVideo: boolean;
    downloadAudio: boolean;
    maxMediaBytes: string | number;
  }>,
) {
  return apiClient.patch<{ config: TelegramIngestConfigResponse }>(
    ENDPOINTS.businesses.telegramConfig(businessId),
    input,
  );
}

export async function unlinkBusinessTelegramRequest(businessId: string) {
  return apiClient.post<{ binding: TelegramBindingResponse | null }>(
    ENDPOINTS.businesses.telegramUnlink(businessId),
    {},
  );
}

export async function pauseBusinessTelegramRequest(businessId: string) {
  return apiClient.post<{ binding: TelegramBindingResponse }>(
    ENDPOINTS.businesses.telegramPause(businessId),
    {},
  );
}

export async function resumeBusinessTelegramRequest(businessId: string) {
  return apiClient.post<{ binding: TelegramBindingResponse }>(
    ENDPOINTS.businesses.telegramResume(businessId),
    {},
  );
}
