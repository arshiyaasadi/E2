# file-service Kubernetes manifests

Apply via environment overlays under `infrastructure/environments/<env>/` when the cluster is bound.

Namespace is labeled `platform.e2/access-storage=true` and `platform.e2/access-identity=true` for NetworkPolicies.

## Migrations

Run SQL migrations **before** serving traffic:

```bash
# local / CI
yarn workspace @e2/file-service migrate

# in the built image
node dist/db/migrate.js
# or: yarn workspace @e2/file-service migrate:prod
```

With `DATABASE_URL` pointing at the in-cluster Postgres (or a Job/init container that runs `node dist/db/migrate.js` from the same image). Do not expose the migrate process publicly.

## Config

ConfigMap keys include `KEYCLOAK_ISSUER`, `KEYCLOAK_AUDIENCE`, `FILE_SERVICE_ALLOWED_CLIENTS`, MinIO endpoint/bucket. Secrets hold `DATABASE_URL` and MinIO access keys only (never Keycloak client secrets for callers — those live with the calling service).

OTLP env on the Deployment targets the SigNoz collector. Application logs are JSON on stdout for the cluster log pipeline.
