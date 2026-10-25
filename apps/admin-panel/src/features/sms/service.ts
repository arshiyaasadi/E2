import { apiClient } from "@/lib/api/client";
import type {
  InvokeSmsProviderInput,
  SmsProviderDto,
  UpdateSmsProviderInput,
} from "@/types/domain";

export function fetchSmsProviders() {
  return apiClient.get<SmsProviderDto[]>("/admin/project/sms-providers");
}

export function updateSmsProvider(id: string, input: UpdateSmsProviderInput) {
  return apiClient.put<SmsProviderDto>(`/admin/project/sms-providers/${id}`, input);
}

export function invokeSmsProvider(id: string, input: InvokeSmsProviderInput) {
  return apiClient.post<unknown>(`/admin/project/sms-providers/${id}/invoke`, input);
}
