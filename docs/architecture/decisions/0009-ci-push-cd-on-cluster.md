# 0009. CI builds images; CD runs on the cluster

- Status: accepted
- Date: 2026-10-21
- Updated: 2026-10-25

## Context

Developers should not manage release versions, image tags, or kubectl deploys for platform services. The monorepo already defines CI stages that build and push images. The edge runs Kubernetes (k3s). Manual `VERSION` bumps and overlay tag edits do not scale and conflict with “merge to main and move on.”

## Decision

- **CI (developer-facing):** lint, test, scan, build container image, push to the registry. Triggered by pull requests and merges to `main`.
- **Image identity:** every build is tagged with the **git commit SHA** (immutable). On merge to `main`, CI also moves a mutable channel tag **`main`** to that digest for continuous deploy.
- **No day-to-day semver** for app services in this phase. Optional `v*` tags remain only for deliberate production freezes later; they are not required for routine deploys.
- **CD (server-facing):** a cluster-side reconciler watches channel tags (starting with `main`), updates Deployments/StatefulSets in k3s, and rolls out. Operators do not run manual image tags for routine work.
- **First-party channel images** (SHA / `:main`):
  - Business services (for example `file-service`)
  - **Keycloak** — built/tagged from `platform/identity` (source pin in `VERSION` + submodule; runtime identity is git SHA)
  - **SigNoz app** — first-party image from `platform/observability` (controlled submodule + SSO overlay; runtime identity is git SHA)
- **Vendor-only pins** (still upstream version in overlays / chart values, not SHA channel): MinIO, Postgres, SigNoz ClickHouse / ZooKeeper / OTel collector chart components, and similar pure third-party sidecars.

## Consequences

- Developers ship by merging to `main`; they do not edit image tags in overlays for routine releases of channelled images.
- CD must run on the edge (or a runner with kubeconfig) with registry pull credentials.
- Rollback = redeploy a previous SHA (CI can re-tag `main` or CD can pin a SHA temporarily).
- Source upgrades for Keycloak / SigNoz remain deliberate `VERSION` + submodule bumps, then CI rebuild.
- Docs in `docs/operations/versioning-and-images.md` and `pipelines/` describe the split.
- Active workflows live under `.github/workflows/`; templates under `pipelines/ci/github-actions/`.
