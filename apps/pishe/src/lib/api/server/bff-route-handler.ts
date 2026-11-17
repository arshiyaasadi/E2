import { NextResponse } from "next/server";
import { resolveRoute } from "@/lib/api/server/route-registry";
import type { ApiErrorBody, ApiResponse } from "@/types/api";

function errorResponse(code: string, message: string, status = 400) {
  const body: ApiErrorBody = {
    success: false,
    error: { code, message },
  };
  return NextResponse.json(body, { status });
}

function statusForError(code: string) {
  switch (code) {
    case "UNAUTHORIZED":
      return 401;
    case "FORBIDDEN":
    case "PRE_REGISTRATION_PENDING":
      return 403;
    case "NOT_FOUND":
      return 404;
    case "CONFLICT":
      return 409;
    case "QUOTA_EXCEEDED":
      return 413;
    case "SERVICE_UNAVAILABLE":
    case "KEYCLOAK_ERROR":
    case "FILE_SERVICE_ERROR":
      return 503;
    default:
      return 400;
  }
}

export async function handleBffRequest(
  method: string,
  pathSegments: string[],
  body?: unknown,
  searchParams?: URLSearchParams,
  headers?: Headers,
) {
  const path = pathSegments.join("/");
  const resolved = resolveRoute(method, path);

  if (!resolved) {
    return errorResponse("NOT_FOUND", `Route not found: ${method} /${path}`, 404);
  }

  try {
    const result = (await resolved.handler({
      body,
      searchParams,
      params: resolved.params,
      headers,
    })) as ApiResponse<unknown>;
    if (!result.success) {
      return NextResponse.json(result, { status: statusForError(result.error.code) });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("[bff]", error);
    return errorResponse("INTERNAL_ERROR", "Unexpected server error", 500);
  }
}
