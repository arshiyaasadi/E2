# file-service API (v1)

Base URL (in-cluster): `http://file-service.services-file.svc`

All `/v1/files/*` routes require `Authorization: Bearer <Keycloak access token>` from the `operators` realm.

## Health

| Method | Path | Auth |
|---|---|---|
| GET | `/health/live` | none |
| GET | `/health/ready` | none (checks DB + MinIO) |
| GET | `/metrics` | none (stub) |

## Product images

### Create presigned upload URL

`POST /v1/files/product-images/upload-url`

```json
{
  "contentType": "image/png",
  "ownerRef": "sku-1",
  "storeId": "store-demo"
}
```

`storeId` is taken from the token claim when present; `platform-super-admin` may pass it in the body.

Response `201`: `{ file, uploadUrl, expiresInSeconds, method, headers }`

Client `PUT`s bytes to `uploadUrl`, then calls confirm.

### Confirm upload

`POST /v1/files/{id}/confirm` → marks `available` after `HeadObject`.

### Proxy upload

`POST /v1/files/product-images` multipart: fields `file`, optional `ownerRef`, `storeId`.

### Metadata

`GET /v1/files/{id}`

### Download URL

`GET /v1/files/{id}/download-url` → short-lived GET URL

### Delete

`DELETE /v1/files/{id}` → soft-delete metadata + delete object

## Errors

JSON `{ "error": "...", "message": "..." }` with 400 / 401 / 403 / 404 / 409 / 502.
