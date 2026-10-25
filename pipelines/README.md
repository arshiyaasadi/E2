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

## Active workflows

Copy of templates under `.github/workflows/` (GitHub Actions reads that path):

| Workflow | Image | Paths |
|---|---|---|
| `file-service.yml` | `file-service` | `services/file-service/**` |
| `keycloak.yml` | `keycloak` | `platform/identity/**` (Dockerfile, VERSION, upstream) |
| `signoz.yml` | `signoz` | `platform/observability/**` (Dockerfile, VERSION, sso, patches, upstream) |

Templates (source of truth to edit, then sync to `.github/workflows/`): `ci/github-actions/`.

## Registry vars (GitHub)

Set repository **Variables** / **Secrets** (never commit values):

| Name | Kind | Example |
|---|---|---|
| `IMAGE_REGISTRY` | variable | `ghcr.io/arshiyaasadi` or edge registry host |
| `REGISTRY_USERNAME` | secret | registry user |
| `REGISTRY_PASSWORD` | secret | registry token |

CD ConfigMap `REGISTRY` on the cluster must match what CI pushes to (today: `registry.platform-cd.svc:5000` on edge).

CD reconciler: `cd/channel-reconciler/` (CronJob on k3s). Channels include `file-service`, `keycloak`, and `signoz`.
