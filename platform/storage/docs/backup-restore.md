# Object storage backup and restore

## Ownership

MinIO holds object bytes. Backup is **versioning + off-cluster replication** (site replication or scheduled `mc mirror`), not application-level dumps inside `file-service`.

Platform policy: [database and backup](../../../docs/operations/database-and-backup.md).  
Procedure: [restore object storage](../../../docs/runbooks/restore-object-storage.md).

## What is backed up

- All objects and versions in business buckets (for example `product-images`)
- Bucket configuration needed to recreate access policies (document separately; apply from `buckets/`)

## What is not a backup

- `file-service` PostgreSQL metadata — backed up with the service database policy
- Realm / OIDC client seeds in identity — not object data

## Requirements

- Bucket versioning enabled
- Continuous or frequent encrypted mirror to a second location
- Failed backup / mirror jobs alert
- Quarterly restore rehearsal into staging (align with metadata DB cut)

## Before MinIO upgrades in production

Confirm a recent successful mirror or replication lag within RPO, then bump `VERSION` and roll staging first.
