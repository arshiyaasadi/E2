# Integrating a store backend with file-service

`file-service` is an **M2M** API. Browsers and admin SPAs must not hold MinIO credentials or the machine client secret. A store / catalog backend (or BFF) obtains a Keycloak client-credentials token and proxies or orchestrates uploads.

## Rules

1. Authenticate to Keycloak with a confidential client (seed: `svc-store-backend`) using `client_credentials`.
2. Call `file-service` with `Authorization: Bearer <access_token>`.
3. Pass **`userId`** for the person whose file space is targeted on every request.
4. Persist only `file_id` (and optional denormalized URL) on product records in the product database.
5. Never embed MinIO root or long-lived S3 keys in apps.
6. Enforce **store** isolation in the calling backend (Keycloak groups / `store_id`). `file-service` scopes objects by `user_id` only ([ADR 0010](../../../docs/architecture/decisions/0010-file-service-m2m-user-ownership.md)).
7. Object keys are owned by file-service (`users/{user_id}/products/...`); do not invent parallel schemes.

## Suggested product image flow

1. Staff authenticates to the store backend (Keycloak user session on the BFF).
2. Backend fetches a machine token (`client_credentials`).
3. Backend requests `POST /v1/files/product-images/upload-url` with `userId` (+ optional `actorUserId`).
4. Browser or backend uploads to the signed URL.
5. Backend calls `POST /v1/files/{id}/confirm`.
6. Backend stores `{ "imageFileId": "<uuid>" }` on the product.
7. For display, backend calls `GET /v1/files/{id}/download-url?userId=…` (or caches a CDN URL later).

## Permissions on the machine token

Realm role `file-service-caller` (or `file-service-admin`). Application permissions: `file.product_image.upload|read|replace|delete`.

## Identity clients

See [`platform/identity/seeds/clients/file-service.md`](../../../platform/identity/seeds/clients/file-service.md) and [`svc-store-backend.md`](../../../platform/identity/seeds/clients/svc-store-backend.md).

## Smoke (cluster)

```bash
TOKEN=$(curl -s -X POST "$KEYCLOAK_ISSUER/protocol/openid-connect/token" \
  -d grant_type=client_credentials -d client_id=svc-store-backend -d client_secret="$SECRET" \
  | jq -r .access_token)

curl -s -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"contentType":"image/png","ownerRef":"sku-1","userId":"user-demo"}' \
  http://file-service.services-file.svc/v1/files/product-images/upload-url
```
