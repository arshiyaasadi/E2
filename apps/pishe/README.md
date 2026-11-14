# Pishe

Next.js frontend for Pishe. Runs **on your machine without Docker**. Login uses **Keycloak on the platform server** (`https://sso.abysso.ir`, realm `pishe`).

## Run (frontend only)

```bash
# from repo root
yarn install

cd apps/pishe
cp .env.example .env.local
# put real KEYCLOAK_APP_CLIENT_SECRET and KEYCLOAK_BFF_CLIENT_SECRET from the secret manager
# or run yarn kc:create-realm (writes secrets into .env.local)

yarn dev
# → http://localhost:3010
```

Or from repo root: `yarn dev:pishe`

No local Keycloak or Docker is required. App Postgres runs on the Abysso Server (`pg.abysso.ir`); set `DATABASE_URL` in `.env.local` (see `.env.example`).

## Bootstrap realm `pishe`

In `.env.local` set master admin, then:

```bash
cd apps/pishe
yarn kc:create-realm
```

Creates realm `pishe`, clients, **service-account roles + client scope-mappings** for `pishe-bff`, seeds `flamingo-manager`, and writes secrets to `.env.local`. Restart `yarn dev`.

**Where is `flamingo-manager`?** Keycloak Admin → realm dropdown → **`pishe`** (not `master` / `operators`) → Users.

## Auth

| Route | Behavior |
|-------|----------|
| `/login` | Username/password → BFF → Keycloak. Blocked while `pre_registration=true`. |
| `/register` | Name + mobile → user in Keycloak with `pre_registration=true`, **no password** (cannot login until approved). Duplicate mobile → conflict. |
| `/` | Dashboard after login (products mock) |
| `/products` | Product gallery |
| `/products/new` | Create product (stage 1) |
| `/products/[id]` | Product detail |
| `/products/[id]/edit` | Edit stage 1 |
| `/products/[id]/details` | Stage 2 variants |

API: `/api/v1/auth/*`, `/api/v1/businesses/*`, `/api/v1/admin/businesses/*`, `/api/v1/profiles/search`, `/api/v1/products/*`, `/api/v1/media/*`, `/api/v1/health`

## Business / Prisma

```bash
yarn db:migrate
yarn seed:bewear
```

Thin `Profile` (invite code + super-admin) + `Business` (6-digit `code`, logo, description, links, color, `assignedAt`) + memberships. UI: `/businesses`, `/admin/businesses`, profile invite copy.

## Products mock + file-service

Product records are stored in gitignored `data/products.json` (no product database). Photos upload through the BFF to the real `file-service` using the `svc-store-backend` machine client (`operators` realm). The browser never sees that secret.

`file-service` and the MinIO S3 API are ClusterIP only. From this machine:

```bash
# if you have kubeconfig locally
kubectl -n services-file port-forward svc/file-service 8088:80
kubectl -n platform-storage port-forward svc/minio 9000:9000

# or via SSH to a node that can run kubectl (example)
ssh -N -L 8088:127.0.0.1:8088 -L 9000:127.0.0.1:9000 USER@NODE
# with port-forwards already running on that node
```

Set `FILE_SERVICE_*` in `.env.local` (see `.env.example`). The BFF calls file-service at `127.0.0.1:8088` and fetches signed download URLs via `127.0.0.1:9000` while preserving the MinIO Host header for SigV4.

The currently deployed file-service image still scopes objects by `storeId`. The Pishe BFF sends the logged-in user's Keycloak `sub` as `storeId` (and also `userId` for newer builds). Ensure the `svc-store-backend` service account has realm roles that the live image recognizes (`store-owner` / `platform-super-admin`) and that the `files` table exists (migration `001_create_files.sql`).

### Approve a pre-registered user

1. Keycloak Admin → realm **`pishe`** → Users → mobile username.
2. Set a permanent password; set attribute `pre_registration` to `false`.
3. User logs in with mobile + that password.

Details: [platform/identity/seeds/clients/pishe-app.md](../../platform/identity/seeds/clients/pishe-app.md).

## Monitoring (SigNoz)

Each successful pre-registration emits one structured JSON log:

```json
{"event":"pishe.pre_registration","service":"pishe","username":"09…","userId":"…","firstName":"…","lastName":"…"}
```

- Always printed on the Next.js process stdout (local terminal).
- When `OTEL_EXPORTER_OTLP_ENDPOINT` is set (WireGuard OTLP, e.g. `http://10.66.0.2:4318`), the event is shipped to SigNoz (`https://noz.abysso.ir`).
- Logs filter: `body CONTAINS 'pishe.pre_registration'`.
- Log-based **alert rule** (Triggered Alerts): see [platform/observability/docs/alerts-pishe-pre-registration.md](../../platform/observability/docs/alerts-pishe-pre-registration.md).

## Env

See [`.env.example`](.env.example). `KEYCLOAK_BASE_URL` defaults to `https://sso.abysso.ir`.
