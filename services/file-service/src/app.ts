import express from "express";
import type { S3Client } from "@aws-sdk/client-s3";
import { filesRouter } from "./routes/files.js";
import { healthRouter } from "./routes/health.js";

export function createApp(s3: S3Client) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));

  app.use(healthRouter(s3));
  app.use(filesRouter(s3));

  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      const message = err instanceof Error ? err.message : "internal error";
      res.status(500).json({ error: "internal", message });
    },
  );

  return app;
}
