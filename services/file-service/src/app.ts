import express from "express";
import type { S3Client } from "@aws-sdk/client-s3";
import { filesRouter } from "./routes/files.js";
import { healthRouter } from "./routes/health.js";
import { requestContextMiddleware } from "./obs/request-context.js";
import { log } from "./obs/log.js";

export function createApp(s3: S3Client) {
  const app = express();
  app.disable("x-powered-by");
  app.use(requestContextMiddleware);
  app.use(express.json({ limit: "1mb" }));

  app.use(healthRouter(s3));
  app.use(filesRouter(s3));

  app.use(
    (
      err: unknown,
      req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      const message = err instanceof Error ? err.message : "internal error";
      log.error("unhandled_error", {
        message,
        request_id: req.requestId,
        trace_id: req.traceId,
      });
      res.status(500).json({ error: "internal", message });
    },
  );

  return app;
}
