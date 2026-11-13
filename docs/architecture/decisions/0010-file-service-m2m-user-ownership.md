# 0010. file-service M2M auth and user_id ownership

- Status: accepted
- Date: 2026-10-25

## Context

`file-service` stores product-image metadata and issues MinIO signed URLs. Staff UIs and storefronts must not talk to object storage or hold long-lived S3 keys. The first production consumers are **trusted backends** (store/catalog BFF), not browsers. Platform staff APIs elsewhere still isolate by Keycloak `store_id` groups; product image bytes need a stable owner key for object paths and audit.

## Decision

1. **Authentication:** Only Keycloak **machine clients** (`client_credentials`) may call `file-service`. Validate JWT (issuer, JWKS, optional audience) and require `azp` / client id in `FILE_SERVICE_ALLOWED_CLIENTS`.
2. **Authorization:** Realm roles map to application permissions inside the service (`file-service-caller`, `file-service-admin`). Fine-grained permissions stay in the app (ADR 0004).
3. **Ownership:** Files are scoped by **`user_id`** (the person whose space the object belongs to). Object keys use `users/{user_id}/products/{owner_ref}/{file_id}.{ext}`.
4. **Trust boundary:** Store / tenant isolation is enforced by the **calling backend**. `file-service` enforces client allowlist, permissions, and `user_id` match on existing resources (privileged roles may cross users).
5. **Mutations:** Soft-delete only; replace + metadata patch are supported; image transform is out of scope.
6. **Observability:** Structured JSON logs and append-only `file_audit_events`; OTLP to SigNoz when configured.

## Consequences

- Integration docs and identity seeds describe `svc-store-backend` (and peers), not end-user tokens on this API.
- Callers must pass `userId` on requests and must not expose client secrets to browsers.
- Changing ownership model later (for example adding `store_id` as a secondary dimension) needs a migration and ADR update.
- Admin-panel direct upload to `file-service` remains out of scope until a backend proxy exists.
