# Platform

Shared components that every service depends on. Each folder holds the design notes and, later, the deployment definitions for one component.

| Component | Responsibility | Docs |
|---|---|---|
| `gateway/` | Public entry point, TLS, routing, rate limiting, token validation | [overview](../docs/architecture/overview.md) |
| `identity/` | Keycloak SSO (source submodule, K8s deploy, seeds, Postgres) | [identity-sso](../docs/operations/identity-sso.md), [ADR 0001](../docs/architecture/decisions/0001-keycloak-as-identity-provider.md) |
| `messaging/` | Message broker, events, queues | [microservices](../docs/architecture/microservices.md) |
| `database/` | Database engines, provisioning, migration conventions | [database-and-backup](../docs/operations/database-and-backup.md) |
| `backup/` | Backup schedules, retention, restore tooling | [database-and-backup](../docs/operations/database-and-backup.md) |
| `storage/` | Object storage for files | [file-storage](../docs/operations/file-storage.md) |
| `observability/` | Logs, metrics, traces, audit, alerting | [logging-and-observability](../docs/operations/logging-and-observability.md) |
| `secrets/` | Secret manager and rotation | [security](../docs/operations/security.md) |
