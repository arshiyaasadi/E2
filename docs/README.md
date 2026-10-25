# Documentation Index

`docs/` is the source of truth for how the platform is designed and operated.

## Foundation

- [Vision and scope](vision-and-scope.md)
- [Roadmap](roadmap.md)
- [Go-live checklist](go-live-checklist.md)

## Architecture

- [Platform overview](architecture/overview.md)
- [Microservice conventions](architecture/microservices.md)
- [Architecture decision records](architecture/decisions/README.md)
  - [0001 Keycloak as identity provider](architecture/decisions/0001-keycloak-as-identity-provider.md)
  - [0002 Kubernetes orchestration](architecture/decisions/0002-kubernetes-orchestration.md)
  - [0003 Yarn workspaces for JS](architecture/decisions/0003-yarn-workspaces-for-js.md)
  - [0004 Keycloak roles; application permissions](architecture/decisions/0004-keycloak-roles-app-permissions.md)
  - [0005 MinIO object storage](architecture/decisions/0005-minio-object-storage.md)
  - [0006 Admin UI-first SQLite lab](architecture/decisions/0006-admin-ui-first-sqlite-lab.md)
  - [0007 Traefik gateway on k3s](architecture/decisions/0007-traefik-gateway-on-k3s.md)
  - [0008 SigNoz observability](architecture/decisions/0008-signoz-observability.md)
  - [0009 CI push / CD on cluster](architecture/decisions/0009-ci-push-cd-on-cluster.md)

## Engineering

- [Code management](engineering/code-management.md)

## Operations

- [Environments and servers](operations/environments-and-servers.md)
- [Versioning and images](operations/versioning-and-images.md)
- [Identity and SSO](operations/identity-sso.md)
- [Identity RBAC and tenancy](operations/identity-rbac-and-tenancy.md)
- [Identity permission map example](operations/identity-permission-map.example.md)
- [Databases and backups](operations/database-and-backup.md)
- [File storage](operations/file-storage.md)
- [Logging and observability](operations/logging-and-observability.md)
- [Security](operations/security.md)
- [Reliability](operations/reliability.md)

## Deployment

- [Deployment scenarios](deployment/scenarios.md)
- [Release and rollback](deployment/release-and-rollback.md)

## Runbooks

- [Runbook index](runbooks/README.md)
