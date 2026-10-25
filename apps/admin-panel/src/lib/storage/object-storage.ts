import { mkdir, unlink, writeFile } from "fs/promises";
import { dirname, join } from "path";
import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getStorageConfig } from "@/lib/storage/config";

let client: S3Client | null = null;

function isLocalDriver() {
  return getStorageConfig().driver === "local";
}

function localRoot() {
  const { localPublicPath } = getStorageConfig();
  return join(process.cwd(), "public", localPublicPath);
}

export function getObjectStorageClient() {
  if (client) return client;

  const config = getStorageConfig();
  const protocol = config.useSsl ? "https" : "http";

  client = new S3Client({
    region: "us-east-1",
    endpoint: `${protocol}://${config.endpoint}:${config.port}`,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKey,
      secretAccessKey: config.secretKey,
    },
  });

  return client;
}

function bucketName() {
  return getStorageConfig().bucket;
}

export async function putObject(params: {
  key: string;
  body: Buffer;
  contentType: string;
}) {
  if (isLocalDriver()) {
    const filePath = join(localRoot(), params.key);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, params.body);
    return;
  }

  const command = new PutObjectCommand({
    Bucket: bucketName(),
    Key: params.key,
    Body: params.body,
    ContentType: params.contentType,
  });

  await getObjectStorageClient().send(command);
}

export async function deleteObject(key: string) {
  if (isLocalDriver()) {
    try {
      await unlink(join(localRoot(), key));
    } catch {
      /* ignore missing */
    }
    return;
  }

  await getObjectStorageClient().send(
    new DeleteObjectCommand({
      Bucket: bucketName(),
      Key: key,
    }),
  );
}

/** Deletes every object under a prefix (e.g. `products/2026/08/{uuid}/`). */
export async function deleteObjectsByPrefix(prefix: string) {
  if (isLocalDriver()) {
    // Best-effort for UI lab; orphaned local files are acceptable.
    return;
  }

  const storage = getObjectStorageClient();
  const bucket = bucketName();
  let continuationToken: string | undefined;

  do {
    const listed = await storage.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );

    const keys = (listed.Contents ?? [])
      .map((obj) => obj.Key)
      .filter((key): key is string => Boolean(key));

    if (keys.length > 0) {
      await storage.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: { Objects: keys.map((Key) => ({ Key })) },
        }),
      );
    }

    continuationToken = listed.IsTruncated ? listed.NextContinuationToken : undefined;
  } while (continuationToken);
}
