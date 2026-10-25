# Disaster Recovery

## When to use

Loss of a node, a data store, or an entire environment.

## Prerequisites

- Access to `infrastructure/` definitions
- Access to backup storage and encryption keys (stored separately from the environment)
- Access to the image registry
- Access to the secret manager or its backup

## Order of recovery

1. Network and base infrastructure
2. Secret manager
3. Databases (from backups, per [restore database](restore-database.md))
4. Object storage (from replicas or backups)
5. Message broker
6. Identity provider
7. Gateway
8. Observability stack
9. Services (from registry, pinned to the last known good tags)

## Verification

- All services pass readiness.
- Login through SSO works for both realms.
- Smoke tests pass through the gateway.
- Backups resume on the recovered environment.

## Rehearsal log

| Date | Who | Scope | Duration | Result | Notes |
|---|---|---|---|---|---|
