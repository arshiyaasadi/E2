# Pishe — agent guidance

## Architecture

- Feature-based folders under `src/features/<name>/`
- Atomic Design layers: `atoms` → `molecules` → `organisms` → `templates`
- Client talks only to `/api/v1/*` (Next BFF). Never call Keycloak Admin API from the browser.
- Auth is Keycloak realm `pishe` on the platform server (`KEYCLOAK_BASE_URL`, typically `https://sso.abysso.ir`).
- Do not run Keycloak or Docker locally for this app — frontend only (`yarn dev`).
- No Prisma/Postgres. Product mock data lives in gitignored `data/products.json`.
- Product photos go through the BFF to `file-service` (machine client `svc-store-backend`). Local access needs kubectl/SSH port-forwards; see README.

## Atomic dependency rules

| From / To | atoms | molecules | organisms | templates | features | store |
|-----------|:-----:|:---------:|:---------:|:---------:|:--------:|:-----:|
| atoms | yes | no | no | no | no | no |
| molecules | yes | yes | no | no | no | yes* |
| organisms | yes | yes | yes | no | yes | yes |
| templates | yes | yes | yes | no | no | yes* |
| pages / features | yes | yes | yes | yes | yes | yes |

\* Prefer presentational molecules; ThemeToggle is an allowed exception that reads UI store.

## State

- Server data: TanStack Query (`features/*/queries.ts`)
- Theme: Zustand `ui.slice` (persist key `pishe-ui`)
- Session facade: Zustand `auth.slice` hydrated from `/auth/me` (cookie is source of truth)

## Language

- Code, comments, commits, README: English
- UI copy: Persian **only** via `src/resources/messages/fa/` (never hardcode in JSX)
- Product voice / what must not leak to users: [docs/product-copy.md](docs/product-copy.md)
