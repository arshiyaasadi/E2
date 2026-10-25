import { BFF_API_BASE } from "@/lib/api/endpoints";
import type { ApiErrorBody, ApiResponse } from "@/types/api";

export class ApiClientError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function handleApiError(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof Error) return error.message;
  return "Unexpected error";
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as ApiResponse<T> | ApiErrorBody;

  if (!response.ok || !("success" in payload) || !payload.success) {
    const err = payload as ApiErrorBody;
    throw new ApiClientError(
      err.error?.message ?? "Request failed",
      err.error?.code ?? "REQUEST_FAILED",
      response.status,
    );
  }

  return payload.data;
}

export const apiClient = {
  async get<T>(path: string): Promise<T> {
    const response = await fetch(`${BFF_API_BASE}${path}`, {
      method: "GET",
      credentials: "include",
    });
    return parseResponse<T>(response);
  },

  async post<T>(path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${BFF_API_BASE}${path}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    return parseResponse<T>(response);
  },

  async put<T>(path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${BFF_API_BASE}${path}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    return parseResponse<T>(response);
  },

  async patch<T>(path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${BFF_API_BASE}${path}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    return parseResponse<T>(response);
  },

  async delete<T>(path: string): Promise<T> {
    const response = await fetch(`${BFF_API_BASE}${path}`, {
      method: "DELETE",
      credentials: "include",
    });
    return parseResponse<T>(response);
  },
};
