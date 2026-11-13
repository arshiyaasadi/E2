import { requireFileServiceSecret, serverEnv } from "@/config/env.server";

type TokenCache = {
  accessToken: string;
  expiresAt: number;
};

let tokenCache: TokenCache | null = null;

export class FileServiceError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 502, code = "FILE_SERVICE_ERROR") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type PublicFile = {
  id: string;
  userId?: string;
  storeId?: string;
  contentType: string;
  sizeBytes: number | null;
  status: string;
};

/** Live cluster still scopes by storeId; use the Keycloak user sub as the store key. */
function storeIdForUser(userId: string) {
  return userId;
}

async function getMachineToken(): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now + 30_000) {
    return tokenCache.accessToken;
  }

  const issuer = serverEnv.FILE_SERVICE_KEYCLOAK_ISSUER.replace(/\/$/, "");
  const secret = requireFileServiceSecret();
  const response = await fetch(`${issuer}/protocol/openid-connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: serverEnv.FILE_SERVICE_CLIENT_ID,
      client_secret: secret,
    }),
  });

  if (!response.ok) {
    throw new FileServiceError("Could not obtain file-service token", 503, "SERVICE_UNAVAILABLE");
  }

  const json = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };

  tokenCache = {
    accessToken: json.access_token,
    expiresAt: now + json.expires_in * 1000,
  };
  return tokenCache.accessToken;
}

function baseUrl() {
  return serverEnv.FILE_SERVICE_BASE_URL.replace(/\/$/, "");
}

async function parseFileResponse(response: Response): Promise<PublicFile> {
  const payload = (await response.json().catch(() => null)) as
    | { file?: PublicFile; error?: string; message?: string }
    | null;

  if (!response.ok || !payload?.file) {
    throw new FileServiceError(
      payload?.message ?? payload?.error ?? "file-service request failed",
      response.status >= 400 ? response.status : 502,
    );
  }
  return payload.file;
}

export async function uploadProductImage(opts: {
  userId: string;
  actorUserId?: string;
  ownerRef?: string;
  bytes: Buffer;
  contentType: string;
  filename: string;
}): Promise<PublicFile> {
  const token = await getMachineToken();
  const form = new FormData();
  // Compatibility: deployed image expects storeId; newer builds also accept userId.
  form.append("storeId", storeIdForUser(opts.userId));
  form.append("userId", opts.userId);
  if (opts.actorUserId) form.append("actorUserId", opts.actorUserId);
  form.append("ownerRef", opts.ownerRef ?? "pishe-draft");
  form.append(
    "file",
    new Blob([new Uint8Array(opts.bytes)], { type: opts.contentType }),
    opts.filename,
  );

  const response = await fetch(`${baseUrl()}/v1/files/product-images`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  return parseFileResponse(response);
}

/**
 * Replace bytes for a logical photo. Prefer PUT /content when available;
 * otherwise upload a new object and return the new file id (caller remaps).
 */
export async function replaceProductImage(opts: {
  fileId: string;
  userId: string;
  actorUserId?: string;
  bytes: Buffer;
  contentType: string;
  filename: string;
}): Promise<PublicFile & { replacedInPlace: boolean }> {
  const token = await getMachineToken();
  const form = new FormData();
  form.append("storeId", storeIdForUser(opts.userId));
  form.append("userId", opts.userId);
  if (opts.actorUserId) form.append("actorUserId", opts.actorUserId);
  form.append(
    "file",
    new Blob([new Uint8Array(opts.bytes)], { type: opts.contentType }),
    opts.filename,
  );

  const inPlace = await fetch(`${baseUrl()}/v1/files/${opts.fileId}/content`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  if (inPlace.status !== 404 && inPlace.status !== 405) {
    const file = await parseFileResponse(inPlace);
    return { ...file, replacedInPlace: true };
  }

  // Fallback for older file-service builds without replace content.
  const uploaded = await uploadProductImage(opts);
  return { ...uploaded, replacedInPlace: false };
}

export async function softDeleteProductImage(opts: {
  fileId: string;
  userId: string;
  actorUserId?: string;
}): Promise<void> {
  const token = await getMachineToken();
  const response = await fetch(`${baseUrl()}/v1/files/${opts.fileId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      storeId: storeIdForUser(opts.userId),
      userId: opts.userId,
      actorUserId: opts.actorUserId,
    }),
  });

  if (!response.ok && response.status !== 404) {
    const payload = (await response.json().catch(() => null)) as {
      message?: string;
      error?: string;
    } | null;
    throw new FileServiceError(
      payload?.message ?? payload?.error ?? "Delete failed",
      response.status,
    );
  }
}

export async function getDownloadUrl(opts: {
  fileId: string;
  userId: string;
}): Promise<{ downloadUrl: string; expiresInSeconds: number }> {
  const token = await getMachineToken();
  const url = new URL(`${baseUrl()}/v1/files/${opts.fileId}/download-url`);
  url.searchParams.set("storeId", storeIdForUser(opts.userId));
  url.searchParams.set("userId", opts.userId);

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const payload = (await response.json().catch(() => null)) as {
    downloadUrl?: string;
    expiresInSeconds?: number;
    message?: string;
    error?: string;
  } | null;

  if (!response.ok || !payload?.downloadUrl) {
    throw new FileServiceError(
      payload?.message ?? payload?.error ?? "Could not get download URL",
      response.status >= 400 ? response.status : 502,
    );
  }

  return {
    downloadUrl: payload.downloadUrl,
    expiresInSeconds: payload.expiresInSeconds ?? 60,
  };
}

/**
 * Fetch a MinIO presigned GET URL from this machine.
 * Connects to FILE_SERVICE_PRESIGN_CONNECT while keeping the original Host
 * so SigV4 signatures remain valid.
 */
export async function fetchPresignedBytes(downloadUrl: string): Promise<{
  body: ArrayBuffer;
  contentType: string;
}> {
  const http = await import("node:http");
  const parsed = new URL(downloadUrl);
  const connect = serverEnv.FILE_SERVICE_PRESIGN_CONNECT;
  const [connectHost, portRaw] = connect.split(":");
  const port = portRaw ? Number(portRaw) : 9000;

  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: connectHost,
        port,
        path: `${parsed.pathname}${parsed.search}`,
        method: "GET",
        headers: {
          Host: parsed.host,
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          if (!res.statusCode || res.statusCode >= 400) {
            reject(
              new FileServiceError(
                `Presigned download failed (${res.statusCode ?? 0})`,
                502,
              ),
            );
            return;
          }
          const buffer = Buffer.concat(chunks);
          resolve({
            body: buffer.buffer.slice(
              buffer.byteOffset,
              buffer.byteOffset + buffer.byteLength,
            ),
            contentType:
              res.headers["content-type"] ?? "application/octet-stream",
          });
        });
      },
    );
    req.on("error", (err) => {
      reject(
        new FileServiceError(
          err instanceof Error ? err.message : "Presigned download failed",
          502,
        ),
      );
    });
    req.end();
  });
}
