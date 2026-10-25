import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { config } from "../config.js";

export function createS3Client(): S3Client {
  return new S3Client({
    region: config.minio.region,
    endpoint: config.minio.endpoint,
    forcePathStyle: config.minio.forcePathStyle,
    credentials: {
      accessKeyId: config.minio.accessKey,
      secretAccessKey: config.minio.secretKey,
    },
  });
}

export async function presignPut(
  client: S3Client,
  key: string,
  contentType: string,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: config.minio.bucket,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(client, command, {
    expiresIn: config.productImage.uploadUrlTtlSeconds,
  });
}

export async function presignGet(client: S3Client, key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: config.minio.bucket,
    Key: key,
  });
  return getSignedUrl(client, command, {
    expiresIn: config.productImage.downloadUrlTtlSeconds,
  });
}

export async function headObject(
  client: S3Client,
  key: string,
): Promise<{ contentLength?: number; contentType?: string }> {
  const out = await client.send(
    new HeadObjectCommand({
      Bucket: config.minio.bucket,
      Key: key,
    }),
  );
  return {
    contentLength: out.ContentLength,
    contentType: out.ContentType,
  };
}

export async function putObject(
  client: S3Client,
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  await client.send(
    new PutObjectCommand({
      Bucket: config.minio.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function deleteObject(client: S3Client, key: string): Promise<void> {
  await client.send(
    new DeleteObjectCommand({
      Bucket: config.minio.bucket,
      Key: key,
    }),
  );
}
