# file-service

Owns product-image **metadata** and issues signed MinIO URLs (plus optional proxy upload). Content bytes live in [`platform/storage`](../../platform/storage/) (MinIO).

- **Owner:** TBD
- **Status:** In development
- **Auth:** Keycloak JWT (`operators` realm); permissions mapped locally ([ADR 0004](../../docs/architecture/decisions/0004-keycloak-roles-app-permissions.md))
- **Storage:** MinIO ([ADR 0005](../../docs/architecture/decisions/0005-minio-object-storage.md))

## Layout

```
services/file-service/
├── README.md
├── docs/           API + integration contract for future store backends
├── src/            HTTP API
├── migrations/     PostgreSQL
├── tests/
└── deploy/         Kubernetes placeholders
```

## Object key pattern

```
stores/{store_id}/products/{owner_ref}/{file_id}.{ext}
```

## Run locally (dev)

```bash
# from repo root
yarn install
yarn workspace @e2/file-service test
yarn workspace @e2/file-service build
```

Configure `DATABASE_URL`, `KEYCLOAK_ISSUER`, `MINIO_*` from the secret manager / local compose (not committed).

## Docs

- [API](docs/api.md)
- [Integration (store backend)](docs/integration.md)
- Platform [file storage](../../docs/operations/file-storage.md)
