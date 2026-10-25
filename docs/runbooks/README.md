# Runbooks

Step-by-step procedures for operating the platform. Every alert links to a runbook.

| Runbook | Use when |
|---|---|
| [Rollback release](rollback-release.md) | A release causes errors or regressions |
| [Restore database](restore-database.md) | Data loss, corruption, or restore rehearsal (generic) |
| [Restore identity database](restore-identity-database.md) | Keycloak PostgreSQL loss, corruption, or identity restore rehearsal |
| [Restore object storage](restore-object-storage.md) | MinIO bucket loss, corruption, or object-storage restore rehearsal |
| [Disaster recovery](disaster-recovery.md) | Loss of a node, data store, or environment |
| [Incident response](incident-response.md) | Any production incident, including security incidents |

## Runbook template

```
# Title

## When to use
## Prerequisites (access, tools)
## Steps
## Verification
## Escalation
## Rehearsal log (date, who, result, notes)
```
