# Identity database backup and restore

## Ownership

Keycloak does not own backup jobs. The **PostgreSQL** layer for the identity database does.

Platform policy: [database and backup](../../../docs/operations/database-and-backup.md).  
Procedure: [restore identity database](../../../docs/runbooks/restore-identity-database.md).

## What is backed up

- All Keycloak relational data: realms, users, clients, roles, keys, sessions (as persisted), events tables as configured.

## What is not a backup

- Realm JSON under `realms/` are **seeds** for empty or rebuilt environments. They do not restore production users or secrets.

## Requirements

- Continuous WAL archiving (PITR) and scheduled encrypted snapshots to off-host storage
- Failed backup jobs alert
- Monthly restore rehearsal into staging

## Before Keycloak upgrades in production

Confirm a recent successful backup or a valid PITR window, then proceed with [upgrade-from-upstream](upgrade-from-upstream.md).
