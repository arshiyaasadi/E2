# file-service API (v1)

Base URL (in-cluster): `http://file-service.services-file.svc`  

Public `https://file.abysso.ir` is **MinIO Console** (operators + Keycloak), not this API.

All `/v1/files/*` routes require `Authorization: Bearer <access_token>` from a Keycloak **machine client** (`client_credentials`) in the `operators` realm. End users do not call this API directly.

Required caller setup: allowlisted `azp` (`FILE_SERVICE_ALLOWED_CLIENTS`) and realm role `file-service-caller` (or privileged `file-service-admin` / `platform-super-admin`).

Pass **`userId`** (owning person) on every business request: JSON body for POST/PUT/PATCH/DELETE, or query `?userId=` for GET. Optional `actorUserId` records the human behind the BFF in audit logs.

## Health

| Method | Path | Auth |
|---|---|---|
| GET | `/health/live` | none |
| GET | `/health/ready` | none (checks DB + MinIO) |
| GET | `/metrics` | none (Prometheus text) |

## Product images

### Create presigned upload URL

`POST /v1/files/product-images/upload-url`

```json
{
  "contentType": "image/png",
  "ownerRef": "sku-1",
  "userId": "user-demo",
  "actorUserId": "optional-staff-sub"
}
```

Response `201`: `{ file, uploadUrl, expiresInSeconds, method, headers }`

Caller `PUT`s bytes to `uploadUrl`, then calls confirm.

### Confirm upload

`POST /v1/files/{id}/confirm`  
Body/query must include matching `userId`. Marks `available` after `HeadObject`.

### Proxy upload

`POST /v1/files/product-images` multipart: fields `file`, `userId`, optional `ownerRef`, `actorUserId`.

### Metadata

`GET /v1/files/{id}?userId=…`

### Download URL

`GET /v1/files/{id}/download-url?userId=…` → short-lived signed GET

### Replace (presigned)

`POST /v1/files/{id}/replace-url`

```json
{
  "userId": "user-demo",
  "contentType": "image/webp"
}
```

Points metadata at a new object key (`pending`); client uploads then confirms.

### Replace (proxy)

`PUT /v1/files/{id}/content` multipart: `file`, `userId`. Replaces object and marks `available`.

### Patch metadata

`PATCH /v1/files/{id}`

```json
{
  "userId": "user-demo",
  "ownerRef": "sku-2"
}
```

Does not change status or bypass soft-delete. Object key path `owner_ref` segment is not rewritten on disk in this version (metadata only).

### Soft-delete

`DELETE /v1/files/{id}` with `userId` in body or query. Sets status `deleted`, deletes the object, **retains** the DB row. No hard delete.

## Errors

JSON `{ "error": "...", "message": "..." }` with 400 / 401 / 403 / 404 / 409 / 502.

## Audit

Mutating routes write `file_audit_events` and emit structured JSON logs (`event_type=audit`) for SigNoz.
