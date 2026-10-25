# 0005. MinIO as S3-compatible object storage

- Status: accepted
- Date: 2026-10-21

## Context

The platform needs durable object storage for product images and later other file types. Files must not live on container disks. Staff should not maintain a second user directory for the storage console. Business APIs for metadata and authorization belong in a dedicated microservice, while the storage engine itself is a platform component (similar to Keycloak for identity).

## Decision

- Use **MinIO** as the S3-compatible object storage engine.
- Pin the official MinIO container image release in `platform/storage/VERSION` (no unpinned `latest` in deploy manifests).
- Place MinIO under `platform/storage/` with deploy manifests, bucket definitions, OIDC notes, and backup docs.
- Place business file APIs and metadata ownership in `services/file-service/` (PostgreSQL per service).
- MinIO Console authenticates staff via **Keycloak OIDC** (`operators` realm). Do not create a parallel MinIO user store for operators.
- Application permissions for upload/read/delete live in `file-service` ([ADR 0004](0004-keycloak-roles-app-permissions.md)); Keycloak supplies roles and store group membership only.
- Object keys follow `stores/{store_id}/products/{owner_ref}/{file_id}.{ext}`. Buckets are private by default; access uses short-lived signed URLs.
- Initial use case: **product images** only (jpeg, png, webp).

## Consequences

- Storage operations mirror identity: version pin, Kubernetes placeholders, backup/restore runbooks, secrets never in Git.
- Clients and store backends call `file-service` with a Keycloak access token; they do not hold long-lived MinIO credentials.
- Upgrades of MinIO are explicit (bump `VERSION`, roll staging, then production).
- CDN and malware scanning remain future work; document hooks without implementing them now.
