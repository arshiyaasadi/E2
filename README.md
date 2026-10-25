# E-commerce Platform

A microservice-based e-commerce platform. This repository holds the platform foundation, the business services, infrastructure definitions, and the documentation that governs them.

## Current phase

Platform foundation: Keycloak identity (source in-repo), Kubernetes scaffolding, Yarn workspaces, and operational docs. Live server bind comes next.

## Clone

```bash
git clone <this-repo-url>
cd E2
git submodule update --init --recursive
yarn install
```

Admin UI lab (no platform stack):

```bash
cp apps/admin-panel/.env.example apps/admin-panel/.env
yarn dev:ui
```

Keycloak source lives at `platform/identity/upstream/` (git submodule). Pin: see `platform/identity/VERSION`.

## Where to start

- `AGENTS.md`: rules for AI agents working in this repository
- `docs/README.md`: documentation index
- `docs/vision-and-scope.md`: what we are building and what is out of scope
- `docs/roadmap.md`: order in which the platform is brought up
- `docs/go-live-checklist.md`: definition of "live" for any service
- `platform/identity/README.md`: Keycloak ownership, deploy, seeds, backup

## Layout

| Folder | Purpose |
|---|---|
| `docs/` | Architecture, operations, deployment, runbooks |
| `services/` | Business microservices |
| `platform/` | Shared platform components (identity = Keycloak) |
| `infrastructure/` | Kubernetes and environment definitions |
| `pipelines/` | CI/CD conventions and definitions |
| `packages/` | Shared JS/TS packages (Yarn workspaces) |
| `apps/` | Client apps (`admin-panel` UI lab; storefront later) |
