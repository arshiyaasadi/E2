# Client `svc-store-backend`

Confidential machine client for store / catalog backends that call `file-service` over HTTP.

| Field | Value |
|---|---|
| Client id | `svc-store-backend` |
| Access type | confidential |
| Service accounts | enabled |
| Grant | `client_credentials` only |
| Standard / direct access | disabled |
| Secret | secret manager only — never commit |

## Realm roles on the service account

Assign realm role **`file-service-caller`** to the service account user (`service-account-svc-store-backend`).

Optional privileged role for break-glass tooling: `file-service-admin` (cross-user access).

## Audience (recommended)

Add a protocol mapper so access tokens include audience `file-service` (or configure `KEYCLOAK_AUDIENCE` / `*` on file-service until the mapper exists).

## file-service allowlist

Set `FILE_SERVICE_ALLOWED_CLIENTS=svc-store-backend` (comma-separated if multiple callers).

## Usage

1. Backend obtains a token:

```http
POST {KEYCLOAK_ISSUER}/protocol/openid-connect/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&client_id=svc-store-backend&client_secret=…
```

2. Call `file-service` with `Authorization: Bearer <access_token>` and pass `userId` (the owning person) on every request.

Do **not** expose this client secret to browsers or admin SPA builds.
