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
      return 403;
    case "NOT_FOUND":
      return 404;
    case "CONFLICT":
      return 409;
    default:
      return 400;
  }
}

export async function handleBffRequest(
  method: string,
  pathSegments: string[],
  body?: unknown,
  searchParams?: URLSearchParams,
) {
  const path = pathSegments.join("/");
  const handler = resolveRoute(method, path);

  if (!handler) {
    return errorResponse("NOT_FOUND", `Route not found: ${method} /${path}`, 404);
  }

  try {
    const result = (await handler({ body, params: {}, searchParams })) as ApiResponse<unknown>;
    if (!result.success) {
      return NextResponse.json(result, { status: statusForError(result.error.code) });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("[bff]", error);
    return errorResponse("INTERNAL_ERROR", "Unexpected server error", 500);
  }
}
