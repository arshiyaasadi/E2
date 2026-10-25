# Versioning and Images

Applies to every platform component and business service.

## Who does what

| Side | Responsibility |
|---|---|
| **Developer** | Open PR, get green CI, merge to `main`. That is the entire release act for first-party services. |
| **CI** | Lint, test, build, push `:<git-sha>` and move channel tag `:main`. No human version bumps. |
| **Server / CD** | Cluster reconciler watches `:main` and rolls out on k3s. |
| **Orchestration** | k3s + Traefik run the workloads; overlays define *what* exists, CD updates *which digest* runs. |

Developers do **not** edit image tags in overlays, bump semver, or run kubectl for day-to-day deploys of these services.

See [ADR 0009](../architecture/decisions/0009-ci-push-cd-on-cluster.md).

## Image tags (first-party services)

| Tag | Who sets it | Purpose |
|---|---|---|
| `<git-sha>` | CI on every successful build | Immutable artifact |
| `main` | CI on merge to `main` | Continuous-deploy channel (CD watches this) |

- Do **not** use `latest` for deploy.
- Do **not** require developers to bump semver for day-to-day deploys of these services.
- Optional `vMAJOR.MINOR.PATCH` tags may be added later for frozen production releases; not required for the first bind.

## Vendor / upstream images

| Component | How it versions |
|---|---|
| Keycloak | Source pin in `platform/identity/VERSION` + submodule; **runtime** image is first-party `keycloak:<sha>` / `:main` |
| SigNoz **app** | Source pin in `platform/observability/VERSION` + submodule; **runtime** image is first-party `signoz:<sha>` / `:main` |
| SigNoz ClickHouse / ZK / collector | Helm chart / vendor tags (not SHA channel) |
| MinIO, Postgres | Pinned by upstream version in overlays |

Changing a source pin is a deliberate platform PR. Day-to-day merges only move the SHA / `:main` channel for first-party images.

## Kubernetes labels and OpenTelemetry

Every Pod template should include:

- `app.kubernetes.io/name`, `app.kubernetes.io/component`, `app.kubernetes.io/part-of`
- `app.kubernetes.io/version` = running image tag (SHA or vendor version)

OTel resource attributes:

| Attribute | Value |
|---|---|
| `service.name` | Stable id (`file-service`, `keycloak`, …) |
| `service.version` | Image SHA or vendor version |
| `deployment.environment` | `local` \| `staging` \| `production` |

## Registry

- CI pushes to the configured registry (see `pipelines/`).
- CD on the cluster pulls the same registry.
- Until an external registry is bound, the edge may run an in-cluster registry; CI/CD config points at it.

## Rollback

Point the channel (or a one-off `kubectl set image …:<sha>`) at a previous SHA. Prefer CI re-promoting a known-good SHA to `main` when possible.
