# file-service

Owns product-image **metadata** and issues signed MinIO URLs (plus optional proxy upload/replace). Content bytes live in [`platform/storage`](../../platform/storage/) (MinIO).

- **Owner:** TBD
- **Status:** In development (API ready for M2M callers)
- **Auth:** Keycloak machine clients (`client_credentials`); permissions mapped locally ([ADR 0004](../../docs/architecture/decisions/0004-keycloak-roles-app-permissions.md), [ADR 0010](../../docs/architecture/decisions/0010-file-service-m2m-user-ownership.md))
- **Storage:** MinIO ([ADR 0005](../../docs/architecture/decisions/0005-minio-object-storage.md))
- **Observability:** JSON logs + audit table; OTLP to SigNoz when `OTEL_EXPORTER_OTLP_ENDPOINT` is set

## Layout

```
services/file-service/
├── README.md
├── docs/           API + integration contract for store backends
├── src/            HTTP API
├── migrations/     PostgreSQL
├── tests/
└── deploy/         Kubernetes placeholders
```

## Object key pattern

```
users/{user_id}/products/{owner_ref}/{file_id}.{ext}
```

## Run locally (dev)

```bash
# from repo root
yarn install
yarn workspace @e2/file-service migrate
yarn workspace @e2/file-service test
yarn workspace @e2/file-service build
yarn workspace @e2/file-service dev
```

Configure env from [`.env.example`](.env.example) (copy locally; never commit secrets). Requires reachable Postgres, MinIO, and Keycloak issuer/JWKS.

## Go-live checklist (service)

- [ ] Migrations applied (`yarn workspace @e2/file-service migrate`)
- [ ] Secrets materialized (`DATABASE_URL`, MinIO keys, caller client secret in Keycloak)
- [ ] `FILE_SERVICE_ALLOWED_CLIENTS` lists production callers
- [ ] Realm role `file-service-caller` on service accounts
- [ ] `/health/ready` green; smoke upload → confirm → download-url → soft-delete
- [ ] Logs/audit visible in SigNoz (`noz.abysso.ir`)

## Docs

- [API](docs/api.md)
- [Integration (store backend)](docs/integration.md)
- Platform [file storage](../../docs/operations/file-storage.md)
