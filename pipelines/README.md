# Pipelines

CI/CD definitions and conventions shared by all services and platform components.

## Split (ADR 0009)

| Pipeline | Where it runs | Job |
|---|---|---|
| **CI** | GitHub Actions (or equivalent) | Lint, test, scan, build, push images |
| **CD** | Edge k3s cluster | Reconcile channel tag → rollout |

Developers only care about green CI on the PR / `main`. They do not bump versions or run kubectl for routine deploys.

## Layout

| Path | Purpose |
|---|---|
| `ci/github-actions/` | CI workflow templates |
| `cd/` | Cluster-side reconciler manifests (applied on the edge) |
| `templates/` | Reusable snippets |

## Image contract

- Every successful build: `REGISTRY/SERVICE:<git-sha>`
- Merge to `main`: also tag `REGISTRY/SERVICE:main`
- CD watches `main` (and can pin a SHA for rollback)

## First service

`file-service` CI workflow: `ci/github-actions/file-service.yml`.

CD reconciler: `cd/channel-reconciler/` (CronJob on k3s).
