# Admin panel (`apps/admin-panel`)

E2 admin UI. Feature work starts here in **UI lab** mode (`APP_MODE=ui`): Prisma + SQLite file, password login, local media under `public/uploads`. Platform services (Keycloak, MinIO, gateway, microservices) are out of scope until a later phase.

## Quick start (UI lab)

From the repository root:

```bash
cp apps/admin-panel/.env.example apps/admin-panel/.env
yarn install
yarn dev:ui
```

Open http://localhost:3000/login

| Field | Value |
|---|---|
| Email | `admin@local.dev` |
| Password | `admin123` |

## Scripts

| Script | Purpose |
|---|---|
| `yarn dev:ui` (root) | Push SQLite schema, seed, start Next.js |
| `yarn workspace ecommerce-admin db:push:ui` | Apply Prisma schema to SQLite |
| `yarn workspace ecommerce-admin db:seed:ui` | Seed super_admin + permissions |
| `yarn workspace ecommerce-admin db:studio` | Prisma Studio |

## Modes

| `APP_MODE` | Database | Auth | Media |
|---|---|---|---|
| `ui` (default) | `file:./prisma/dev-ui.db` | Email/password | Local files |
| `platform` | PostgreSQL | Keycloak OIDC | MinIO (later) |

PostgreSQL schema reference is kept at `prisma/schema.postgresql.prisma` for a future platform bind.

## Package manager

Yarn Classic workspaces from the **repository root** only. Do not install inside this folder.
