import { createApp } from "./app.js";
import { config } from "./config.js";
import { log } from "./obs/log.js";
import { startOtel } from "./obs/otel.js";
import { createS3Client } from "./storage/minio.js";

async function main() {
  const shutdownOtel = await startOtel();
  const s3 = createS3Client();
  const app = createApp(s3);

  const server = app.listen(config.port, () => {
    log.info("listening", { port: config.port });
  });

  function shutdown(signal: string) {
    log.info("shutdown", { signal });
    server.close(async () => {
      try {
        await shutdownOtel();
      } finally {
        process.exit(0);
      }
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  log.error("startup_failed", {
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
