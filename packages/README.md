# Shared packages

JavaScript and TypeScript libraries shared across the monorepo.

## Package manager

**Yarn Classic (v1) workspaces** ([ADR 0003](../docs/architecture/decisions/0003-yarn-workspaces-for-js.md)).

From the repository root:

```bash
yarn install
```

Do not use npm or pnpm for these workspaces. Do not install inside an individual package or service folder — that splits `node_modules` and breaks the single-root layout.

## Layout

```
packages/
├── README.md
└── tsconfig/     # shared TypeScript base config (stub)
```

Add new packages as `packages/<name>/` with their own `package.json`. They are included via the root workspace glob `packages/*`.

JS/TS microservices under `services/*` (for example `@e2/file-service`) are also Yarn workspaces.

## Out of scope here

- Keycloak / Java dependencies (Maven inside `platform/identity/upstream/`)
- MinIO (Go binary / official image under `platform/storage/`)
