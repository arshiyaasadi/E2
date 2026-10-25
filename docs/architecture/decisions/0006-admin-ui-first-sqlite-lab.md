# 0006. Admin UI-first feature lab with Prisma SQLite

- Status: accepted
- Date: 2026-10-21

## Context

Business features need a place to close UX and domain flows before platform microservices are wired. The existing admin Next.js app was brought into `apps/admin-panel`. Requiring Keycloak, MinIO, Postgres, and the API gateway for every UI change would block feature work.

## Decision

- Treat `apps/admin-panel` as the admin base for feature development.
- Default local mode is `APP_MODE=ui`:
  - Prisma with a **SQLite file** (`DATABASE_URL=file:./prisma/dev-ui.db`)
  - Password login (seeded super_admin); Keycloak optional and not required
  - Media stored under `public/uploads` (`MEDIA_DRIVER=local`)
- Platform mode (`APP_MODE=platform`) remains for a later bind to Postgres, Keycloak, and MinIO.
- Keep `prisma/schema.postgresql.prisma` as a reference for the future platform database shape.
- Do not involve gateway, microservices, or cluster deploy while developing features in UI mode.

## Consequences

- Contributors can run `yarn dev:ui` from the repo root with no platform stack.
- SQLite schema is a simplified lab model; some Postgres-specific repository paths may fail until adapted.
- Feature work lands in the admin app first; extraction into platform services happens later.
- Yarn workspaces include `apps/*`; install only from the repository root.
