import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import type { AuthUserResponse, LoginSessionResponse } from "@/types/api";

export async function loginRequest(input: {
  username: string;
  password: string;
  rememberMe: boolean;
}) {
  return apiClient.post<AuthUserResponse>(ENDPOINTS.auth.login, input);
}

export async function registerRequest(input: {
  firstName: string;
  lastName: string;
  mobile: string;
}) {
  return apiClient.post<{ username: string; message: string }>(
    ENDPOINTS.auth.register,
    input,
  );
}

export async function logoutRequest() {
  return apiClient.post<{ ok: true }>(ENDPOINTS.auth.logout);
}

export async function meRequest() {
  return apiClient.get<AuthUserResponse>(ENDPOINTS.auth.me);
}

export async function sessionsRequest() {
  return apiClient.get<{ sessions: LoginSessionResponse[] }>(
    ENDPOINTS.auth.sessions,
  );
}

export async function updateProfileRequest(input: {
  firstName: string;
  lastName: string;
}) {
  return apiClient.patch<AuthUserResponse>(ENDPOINTS.auth.profile, input);
}
