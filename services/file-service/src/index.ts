import { createApp } from "./app.js";
import { config } from "./config.js";
import { createS3Client } from "./storage/minio.js";

const s3 = createS3Client();
const app = createApp(s3);

const server = app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ msg: "file-service listening", port: config.port }));
});

function shutdown(signal: string) {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ msg: "shutdown", signal }));
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
