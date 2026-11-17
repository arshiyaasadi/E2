import { handleBffRequest } from "@/lib/api/server/bff-route-handler";

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

async function readJsonBody(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return undefined;
  }
  return request.json().catch(() => undefined);
}

export async function GET(request: Request, context: RouteContext) {
  const { path } = await context.params;
  const searchParams = new URL(request.url).searchParams;
  return handleBffRequest("GET", path, undefined, searchParams, request.headers);
}

export async function POST(request: Request, context: RouteContext) {
  const { path } = await context.params;
  const body = await readJsonBody(request);
  return handleBffRequest("POST", path, body, undefined, request.headers);
}

export async function PATCH(request: Request, context: RouteContext) {
  const { path } = await context.params;
  const body = await readJsonBody(request);
  return handleBffRequest("PATCH", path, body, undefined, request.headers);
}

export async function DELETE(request: Request, context: RouteContext) {
  const { path } = await context.params;
  const body = await readJsonBody(request);
  return handleBffRequest("DELETE", path, body, undefined, request.headers);
}
