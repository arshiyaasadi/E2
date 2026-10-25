import { Router } from "express";
import type { S3Client } from "@aws-sdk/client-s3";
import { ListBucketsCommand } from "@aws-sdk/client-s3";
import { checkDb } from "../db/pool.js";

export function healthRouter(s3: S3Client): Router {
  const router = Router();

  router.get("/health/live", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  router.get("/health/ready", async (_req, res) => {
    try {
      const dbOk = await checkDb();
      await s3.send(new ListBucketsCommand({}));
      if (!dbOk) {
        res.status(503).json({ status: "not_ready", database: false });
        return;
      }
      res.status(200).json({ status: "ready", database: true, objectStorage: true });
    } catch {
      res.status(503).json({ status: "not_ready" });
    }
  });

  router.get("/metrics", (_req, res) => {
    res
      .type("text/plain")
      .send(
        [
          "# HELP file_service_up 1 if process is up",
          "# TYPE file_service_up gauge",
          "file_service_up 1",
          "",
        ].join("\n"),
      );
  });

  return router;
}
