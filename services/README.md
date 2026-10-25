# Services

Business microservices. One folder per service, following [microservice conventions](../docs/architecture/microservices.md).

## Service template

```
services/<service-name>/
├── README.md
├── docs/
├── src/
├── migrations/
├── tests/
└── deploy/
```

## Registry

| Service | Owner | Purpose | Status |
|---|---|---|---|
| `reference-service` | TBD | Minimal service that proves the platform template | Planned |
| [`file-service`](file-service/) | TBD | Product-image metadata, signed/proxy MinIO access, Keycloak JWT auth | In development |

Status values: `Planned`, `In development`, `Staging`, `Live`. A service is `Live` only after completing the [go-live checklist](../docs/go-live-checklist.md).

## Related platform components

| Component | Path | Notes |
|---|---|---|
| Object storage (MinIO) | [`platform/storage/`](../platform/storage/) | Buckets and Console; used by `file-service` |
| Identity (Keycloak) | [`platform/identity/`](../platform/identity/) | JWT for APIs; OIDC for MinIO Console |
