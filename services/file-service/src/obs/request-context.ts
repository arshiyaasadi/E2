import { randomUUID } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { recordHttpRequest } from "./metrics.js";
import { log } from "./log.js";

function parseTraceId(traceparent: string | undefined): string | undefined {
  if (!traceparent) return undefined;
  // version-traceid-spanid-flags
  const parts = traceparent.split("-");
  if (parts.length >= 3 && parts[1] && /^[0-9a-f]{32}$/i.test(parts[1])) {
    return parts[1];
  }
  return undefined;
}

export function requestContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const requestId = req.header("x-request-id") || randomUUID();
  const traceId =
    parseTraceId(req.header("traceparent")) ||
    req.header("x-trace-id") ||
    requestId.replace(/-/g, "").slice(0, 32);

  req.requestId = requestId;
  req.traceId = traceId;
  res.setHeader("x-request-id", requestId);
  res.setHeader("x-trace-id", traceId);

  const started = Date.now();

  res.on("finish", () => {
    const durationMs = Date.now() - started;
    const pathLabel = req.route?.path
      ? `${req.baseUrl}${String(req.route.path)}`
      : req.path;
    recordHttpRequest(req.method, pathLabel, res.statusCode, durationMs);
    log.info("http_request", {
      trace_id: traceId,
      request_id: requestId,
      method: req.method,
      path: pathLabel,
      status: res.statusCode,
      duration_ms: durationMs,
      client_id: req.auth?.clientId,
    });
  });

  next();
}
