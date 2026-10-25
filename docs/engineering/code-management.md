# Code Management

## Repository model

A single monorepo containing services, platform components, infrastructure definitions, pipelines, and documentation. Each service is built and deployed independently.

## Branching

| Branch | Purpose | Deploys to |
|---|---|---|
| `main` | Always releasable | Edge CD channel `main` (cluster reconciler) |
| `feature/<topic>` | Short-lived work | Nothing (CI only) |
| `fix/<topic>` | Bug fixes | Nothing (CI only) |
| `hotfix/<topic>` | Urgent production fix | Same as `main` after merge |

- Changes reach `main` only through a reviewed pull request.
- `main` is protected: no direct pushes, CI must pass.
- Developers do not cut release tags for routine deploys; optional `v*` tags are only for deliberate freezes later.

## Commits

- English, imperative mood, short subject line.
- Conventional prefixes: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`.
- Scope is the service or component, for example `feat(order-service): ...`.

## Pull requests

- One logical change per pull request.
- Description includes: what changed, why, how it was tested, and the rollback plan if it touches production.
- At least one approving review.
- Changes to `platform/`, `infrastructure/`, or `pipelines/` require a platform owner review.

## Versioning and deploy split

- **Developers do not manage versions** for routine work on first-party services ([ADR 0009](../architecture/decisions/0009-ci-push-cd-on-cluster.md)).
- CI tags images with the **git SHA** and, on `main`, updates the **`main`** deploy channel.
- **CD runs on the cluster** (reconciler), not in the developer workflow. See [versioning and images](../operations/versioning-and-images.md) and `pipelines/`.
- `latest` is never used for deployment.
- Optional semver `v*` tags are only for deliberate freezes later.

## CI stages (developer-facing)

1. Lint and static analysis
2. Unit tests
3. Dependency vulnerability scan
4. Secret scan
5. Build container image
6. Image vulnerability scan
7. Push to registry (`:sha`, and `:main` on merge to `main`)

Only services whose files changed are built. **Deploy is not a CI responsibility** for production; the server-side CD reconciler applies rollouts.

## CD stages (server-facing)

1. Detect new digest on channel tag `main` (or pinned SHA)
2. Update workload image in k3s
3. Wait for rollout / health
4. Emit failure alert if rollout fails

## Configuration

- No secrets in Git. Ever.
- Example configuration files contain placeholders only.
- Environment-specific values live in `infrastructure/environments/<env>/` or the secret manager.

## `.gitignore` policy

| Layer | Responsibility |
|---|---|
| Root `.gitignore` | Monorepo-wide: dependencies, build outputs, caches, env/secrets, local DBs, OS/IDE, logs |
| Nested `.gitignore` (for example `apps/admin-panel/`) | Stack-specific artifacts only (Next.js `.next/`, Prisma local SQLite paths, generated `next-env.d.ts`) |

Always track: lockfiles (`yarn.lock`), `.env.example`, schemas/seeds without secrets, K8s manifests with placeholders.

Never track: `.env*`, keys/certs, local SQLite/DB files, `node_modules/`, `.next/`/`dist/`/`coverage/`, real kubeconfigs, `secrets.local.yaml`.

Upstream Keycloak keeps its own `.gitignore` inside the submodule; do not duplicate that tree into first-party paths.

## Ownership

Each service and platform component declares an owner in its README. Changes require the owner's review.

## Package managers

| Area | Tool |
|---|---|
| Shared JS/TS packages under `packages/` | **Yarn Classic (v1) workspaces** ([ADR 0003](../architecture/decisions/0003-yarn-workspaces-for-js.md)) |
| JS/TS services under `services/` (for example `file-service`) | Same Yarn workspaces from repo root |
| Client apps under `apps/` (for example `admin-panel`) | Same Yarn workspaces from repo root |
| Keycloak / Java in `platform/identity/upstream/` | Maven (upstream build) |
| MinIO | Official container image pinned in `platform/storage/VERSION` |
| Future language stacks | Declared per component README |

Install JS dependencies from the repository root with Yarn only (`yarn install`). Do not run `yarn`/`npm` inside a workspace folder, and do not use npm or pnpm for workspace packages. Shared versions that would otherwise fork (for example `@types/node`) are pinned in the root `resolutions` field so packages hoist to the root `node_modules/`.

## Submodules

- Keycloak source is a git submodule at `platform/identity/upstream/`.
- After clone: `git submodule update --init --recursive`.
- Pin is recorded in `platform/identity/VERSION`.
- MinIO is pinned by image tag in `platform/storage/VERSION` (not a source submodule).
