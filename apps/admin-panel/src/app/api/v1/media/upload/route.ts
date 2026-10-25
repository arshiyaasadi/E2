import { uploadMediaHandler } from "@/lib/api/server/handlers/media.handler";

export async function POST(request: Request) {
  return uploadMediaHandler(request);
}
