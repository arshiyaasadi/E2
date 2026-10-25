# 0003. Yarn workspaces for shared JavaScript packages

- Status: accepted
- Date: 2026-10-21

## Context

The monorepo will host shared JavaScript and TypeScript libraries (lint config, tsconfig, future client SDKs and tooling). A single package manager and workspace layout avoids conflicting lockfiles and duplicate installs.

## Decision

- Use **Yarn Classic (v1) workspaces** for all shared and future JS/TS packages under `packages/*`, JS/TS services under `services/*`, and client apps under `apps/*`.
- Root `package.json` declares workspaces; installs happen from the repository root with Yarn.
- Use root `resolutions` to pin shared transitive types (for example `@types/node`) so Yarn can hoist one copy to the repo-root `node_modules/` and avoid duplicate trees under workspace folders.
- Java / Keycloak builds remain Maven/Gradle inside `platform/identity/upstream/` and are not managed by Yarn.
- New JS packages are added under `packages/<name>/` and registered via the workspace glob.

## Consequences

- One Yarn lockfile at the repo root for JS dependencies.
- Contributors must use Yarn (not npm or pnpm) for workspace packages.
- Workspace folders may still have a small `node_modules/` with `.bin` symlinks into the root install; that is normal for Yarn Classic and is not a second dependency tree.
- Keycloak and other JVM components stay on their native build tools.
