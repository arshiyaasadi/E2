# Production file-service overlay

- **API:** ClusterIP only — `http://file-service.services-file.svc` (M2M callers)
- **Public file UI:** MinIO Console on `https://file.abysso.ir` (see `../storage/`)
- Image: CD channel tag `main` → `ghcr.io/arshiyaasadi/file-service:main`
- Secrets: materialize `file-service-secrets` and `file-service-pg-secrets` on the node
- Before traffic: run migrations (`node dist/db/migrate.js` with `DATABASE_URL`)
- ConfigMap must set `FILE_SERVICE_ALLOWED_CLIENTS` (e.g. `svc-store-backend`) and Keycloak issuer
