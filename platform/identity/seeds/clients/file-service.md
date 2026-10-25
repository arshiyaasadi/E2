# Clients for `file-service`

## Audience / API resource

Staff tokens from the admin panel (client `admin-panel` when created) call `file-service` with the same access token. Configure `file-service` to accept the `operators` issuer and validate JWKS.

Optional dedicated client for clearer audience:

| Field | Value |
|---|---|
| Client id | `file-service` |
| Access type | bearer-only **or** confidential with audience mapper |
| Standard flow | disabled if bearer-only |
| Full scope | false; include realm roles |

## Machine client (optional)

| Field | Value |
|---|---|
| Client id | `file-service-api` |
| Access type | confidential |
| Service accounts | enabled |
| Grant | client_credentials |
| Secret | secret manager only |

Use for batch jobs or a future product service calling file-service without a user session.

## Protocol mappers (required for store isolation)

On the **calling** client (admin panel / store backend):

- Group membership → token
- Group attribute `store_id` → claim `store_id` (string) or `store_ids` (list)

`file-service` reads roles + `store_id` and applies the local permission map (`file.product_image.*`).

## No duplicate users

Operators who open MinIO Console use Keycloak (`minio-console`). Operators and editors who upload product images use the same Keycloak users via JWT to `file-service`. MinIO S3 credentials exist only as a machine secret for `file-service`.
