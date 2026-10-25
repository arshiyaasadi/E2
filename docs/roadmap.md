# Roadmap

The platform is brought up in this order. Each step depends on the previous ones.

| # | Step | Outcome | Docs |
|---|---|---|---|
| 1 | Repository, CI, image registry, Yarn workspaces | Every change is built, tested, scanned; JS packages use Yarn; Keycloak source pinned in-repo | [code-management](engineering/code-management.md), [ADR 0003](architecture/decisions/0003-yarn-workspaces-for-js.md) |
| 2 | Kubernetes scaffolding | Cluster and workload manifests for Linux; placeholders until server bind | [ADR 0002](architecture/decisions/0002-kubernetes-orchestration.md), [environments-and-servers](operations/environments-and-servers.md) |
| 3 | Configuration and secrets | Secrets live in a secret manager, never in Git | [security](operations/security.md) |
| 4 | Identity (Keycloak) | Pinned Keycloak submodule, realms, seeds, Postgres, backup; first K8s workload | [ADR 0001](architecture/decisions/0001-keycloak-as-identity-provider.md), [identity-sso](operations/identity-sso.md) |
| 5 | Server bind | Real node inventory, registry, kubeconfig, TLS for staging then production | Deferred until server details are provided |
| 6 | Gateway and TLS | Single public entry point with routing, rate limiting, token checks | [overview](architecture/overview.md) |
| 7 | Reference service | One minimal service that proves the template: health, logs, metrics, migrations, backup | [microservices](architecture/microservices.md) |
| 8 | File storage | MinIO pinned under `platform/storage/`; `file-service` with JWT, signed/proxy upload, metadata DB; backup runbook | [file-storage](operations/file-storage.md), [ADR 0005](architecture/decisions/0005-minio-object-storage.md) |
| 9 | Central logging and alerting | Logs, metrics, traces, audit, alerts in one place | [logging-and-observability](operations/logging-and-observability.md) |
| 10 | Recovery rehearsal | One successful rollback and one successful identity database restore | [release-and-rollback](deployment/release-and-rollback.md), [restore identity](runbooks/restore-identity-database.md) |
| 11 | Business services and apps | Services and the existing storefront and admin panel are connected to the platform | [services](../services/README.md), [apps](../apps/README.md) |

A step is done when its outcome is verified in `staging`, and in `production` where applicable.

## Parallel track: admin UI lab

While platform foundation continues, feature UX can advance in `apps/admin-panel` with `APP_MODE=ui` (Prisma SQLite, no Keycloak/MinIO/gateway). See [ADR 0006](architecture/decisions/0006-admin-ui-first-sqlite-lab.md). This does not replace steps 1–10.

## Current focus

Steps 1–4 scaffolding (docs, submodule, Yarn, K8s placeholders, identity layout). File storage scaffolding (step 8 layout: MinIO + `file-service`) is in-repo; live cluster bind waits for server details (step 5). Admin panel lives under `apps/admin-panel` for UI-first feature work (`yarn dev:ui`).
