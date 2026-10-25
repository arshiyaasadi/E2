# Integrating a store backend with file-service

This service is ready for a future product / catalog backend. **Do not** wire the admin panel in this phase; use this contract when connecting later.

## Rules

1. Call `file-service` with the **same Keycloak access token** the staff user already has (one token, no duplicate login).
2. Persist only `file_id` (and optional denormalized URL) on the product record in the product database.
3. Never embed MinIO root or long-lived S3 keys in the admin app or product service.
4. Enforce store isolation via Keycloak group `store_id` + file-service permission checks.
5. Object keys are owned by file-service; do not invent parallel key schemes.

## Suggested product create flow

1. Staff authenticates to Keycloak (`operators`).
2. UI or BFF requests `POST /v1/files/product-images/upload-url` with bearer token.
3. Browser uploads to the signed URL.
4. Confirm via `POST /v1/files/{id}/confirm`.
5. Create/update product with `{ "imageFileId": "<uuid>" }`.
6. For display, call `GET /v1/files/{id}/download-url` or cache a CDN URL later.

## Permissions expected on the token

Realm roles `store-owner` | `store-admin` | `store-editor` (or `platform-super-admin`) plus claim `store_id`.

Application permissions inside file-service: `file.product_image.upload|read|delete`.

## Identity clients

See `platform/identity/seeds/clients/file-service.md` and MinIO Console OIDC for operators (`minio-console`).
