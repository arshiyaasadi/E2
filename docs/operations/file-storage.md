# File Storage

## Goal

All files (product images, documents, user uploads, exports) are stored in S3-compatible object storage. Container disks are temporary and must never hold files that need to persist.

## Components

| Piece | Location | Role |
|---|---|---|
| Object storage (MinIO) | [`platform/storage/`](../../platform/storage/) | Buckets, versioning, replication, Console |
| File API and metadata | [`services/file-service/`](../../services/file-service/) | AuthZ, signed URLs, proxy upload, file records |
| Identity | [`platform/identity/`](../../platform/identity/) | JWT / OIDC; Console login for operators |

Decision: [ADR 0005](../architecture/decisions/0005-minio-object-storage.md).

## Ownership

- **Canonical file metadata** (owner, type, size, object key, status) lives in the `file-service` database.
- File **content** lives in MinIO.
- Owning business services (for example a future product service) store only `file_id` references (and optional denormalized display URLs), never raw object keys as the source of truth.
- Object key pattern: `stores/{store_id}/products/{owner_ref}/{file_id}.{ext}`.

## Upload flows

Both are supported. Presigned upload is preferred for product images.

### Presigned upload (primary)

1. Client (or store backend) requests an upload URL from `file-service` with a Keycloak bearer token.
2. `file-service` validates JWT, role → permission map, and `store_id`, inserts a `pending` row, and returns a short-lived signed PUT URL.
3. Client uploads directly to MinIO.
4. Client calls confirm; `file-service` verifies the object and marks it `available`.

### Proxy upload

1. Client posts multipart bytes to `file-service`.
2. After the same auth checks, `file-service` streams the object to MinIO and marks the row `available`.

## Download flow

- Private files are served through short-lived signed GET URLs from `file-service`.
- Public CDN in front of a public prefix is deferred; buckets stay private by default.

## Current use case

| Kind | Allowed types | Max size |
|---|---|---|
| `product_image` | `image/jpeg`, `image/png`, `image/webp` | 5 MiB |

## Rules

- Maximum size and allowed types are enforced per use case in `file-service`.
- File names in storage are generated (`file_id` + extension), not user-provided.
- Buckets are private by default.
- Staff open MinIO Console with the same Keycloak accounts (OIDC); no duplicate operator directory.

## Protection

- Versioning is enabled on buckets holding business data.
- Buckets are replicated or mirrored to a separate location. See [database and backup](database-and-backup.md) and [restore object storage](../runbooks/restore-object-storage.md).
- Lifecycle rules remove temporary and orphaned `pending` objects.
