# Clients for `file-service`

## Audience / API resource

| Field | Value |
|---|---|
| Client id | `file-service` |
| Access type | bearer-only **or** confidential with audience mapper |
| Standard flow | disabled if bearer-only |
| Purpose | Token audience for M2M callers |

End users and browsers do **not** call `file-service` directly. Store backends obtain tokens via **client_credentials** (see [`svc-store-backend.md`](svc-store-backend.md)).

## Machine callers

| Client id | Purpose |
|---|---|
| `svc-store-backend` | Primary store/catalog backend M2M caller |
| `file-service-api` | Optional extra job / batch caller (same pattern) |

Both must:

1. Be confidential with service accounts enabled
2. Hold realm role `file-service-caller` (or `file-service-admin`)
3. Appear in `FILE_SERVICE_ALLOWED_CLIENTS` on the file-service deployment
4. Keep secrets only in the secret manager

## Application permissions (enforced in file-service)

| Permission | Used for |
|---|---|
| `file.product_image.upload` | upload-url, confirm, proxy upload |
| `file.product_image.read` | metadata, download-url |
| `file.product_image.replace` | replace-url, PUT content, PATCH metadata |
| `file.product_image.delete` | soft-delete |

Role map (ADR 0004): `file-service-caller` → all four; `file-service-admin` / `platform-super-admin` → `*`.

## Ownership claim

Callers pass **`userId`** (the person whose file space is targeted). Store isolation remains in the calling backend. See [ADR 0010](../../../../docs/architecture/decisions/0010-file-service-m2m-user-ownership.md).

## No duplicate users

Operators who open MinIO Console use Keycloak (`minio-console`). MinIO S3 credentials exist only as a machine secret for `file-service`.
