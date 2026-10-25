import { handleBffRequest } from "@/lib/api/server/bff-route-handler";

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

export async function GET(request: Request, context: RouteContext) {
  const { path } = await context.params;
  const searchParams = new URL(request.url).searchParams;
  return handleBffRequest("GET", path, undefined, searchParams);
}

export async function POST(request: Request, context: RouteContext) {
  const { path } = await context.params;
  const body = await request.json().catch(() => undefined);
  return handleBffRequest("POST", path, body);
}

export async function PUT(request: Request, context: RouteContext) {
  const { path } = await context.params;
  const body = await request.json().catch(() => undefined);
  return handleBffRequest("PUT", path, body);
}

export async function PATCH(request: Request, context: RouteContext) {
  const { path } = await context.params;
  const body = await request.json().catch(() => undefined);
  return handleBffRequest("PATCH", path, body);
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { path } = await context.params;
  return handleBffRequest("DELETE", path);
}
