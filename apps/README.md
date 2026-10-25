# Apps

Client applications that consume the platform.

| App | Path | Audience | Status |
|---|---|---|---|
| `admin-panel` | `apps/admin-panel` | Internal staff | UI lab active (`APP_MODE=ui`, Prisma SQLite). Platform SSO later (`operators` realm) |
| `storefront` | — | Shoppers | Exists outside this repository, connected later |

## Admin UI lab

Feature flows are closed in the admin UI first. Run from repo root:

```bash
cp apps/admin-panel/.env.example apps/admin-panel/.env
yarn install
yarn dev:ui
```

See [admin-panel README](admin-panel/README.md) and [ADR 0006](../docs/architecture/decisions/0006-admin-ui-first-sqlite-lab.md).

Platform foundation (gateway, Keycloak, file-service) is not required for this mode.
