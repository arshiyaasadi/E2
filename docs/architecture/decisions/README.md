# Architecture Decision Records

Significant decisions are recorded here as ADRs.

## When to write an ADR

- Choosing or replacing a technology (orchestrator, database, identity provider, broker, ...)
- Changing a convention in `docs/architecture/microservices.md`
- Any decision that is expensive to reverse

## File naming

`NNNN-short-title.md`, for example `0001-use-oidc-for-sso.md`.

## Template

```
# NNNN. Title

- Status: proposed | accepted | superseded by NNNN
- Date: YYYY-MM-DD

## Context
What problem are we solving and what constraints apply.

## Decision
What we decided.

## Consequences
What becomes easier, what becomes harder, and what follow-up work is needed.
```

## Accepted

| ADR | Title |
|---|---|
| [0001](0001-keycloak-as-identity-provider.md) | Keycloak as identity provider |
| [0002](0002-kubernetes-orchestration.md) | Kubernetes orchestration |
| [0003](0003-yarn-workspaces-for-js.md) | Yarn workspaces for shared JavaScript packages |
| [0004](0004-keycloak-roles-app-permissions.md) | Keycloak roles; application permissions |
| [0005](0005-minio-object-storage.md) | MinIO as S3-compatible object storage |
| [0006](0006-admin-ui-first-sqlite-lab.md) | Admin UI-first feature lab with Prisma SQLite |
| [0007](0007-traefik-gateway-on-k3s.md) | Traefik as API gateway on k3s |
| [0008](0008-signoz-observability.md) | SigNoz as observability stack |
| [0009](0009-ci-push-cd-on-cluster.md) | CI pushes images; CD runs on the cluster |

## Pending decisions

| Topic | Notes |
|---|---|
| Relational database engine (platform default) | PostgreSQL chosen for identity; confirm as default for all services |
| Message broker | Async messaging and events |
| Secret manager | Secret storage and rotation |
| Multi-node inventory | First bind is single-node k3s on edge; add agents later |
