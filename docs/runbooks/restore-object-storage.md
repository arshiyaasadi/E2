# Restore Object Storage

## When to use

- Data loss or corruption in MinIO buckets
- Failed MinIO upgrade that damaged disk or metadata
- Scheduled restore rehearsal for object storage in `staging`

## Prerequisites

- Access to the secondary replica / mirror location and backup encryption key
- `mc` (MinIO Client) or equivalent with credentials from the secret manager
- Approval from the storage / platform owner (for `production`)
- Ability to put `file-service` in maintenance or scale it down to stop new writes

## Steps

1. Announce maintenance; block uploads at the gateway or scale `file-service` write paths down.
2. Scale MinIO to a safe restore state (quiesce writers; follow [`platform/storage/docs/backup-restore.md`](../../platform/storage/docs/backup-restore.md)).
3. Restore bucket data from the replica or `mc mirror` source into the target cluster.
4. Confirm versioning and a sample of product-image keys under `stores/{store_id}/products/...`.
5. Restore or reconcile `file-service` PostgreSQL if metadata is out of sync (prefer point-in-time that matches the object cut).
6. Scale MinIO and `file-service` back up; run health checks and a signed upload/download smoke test.

## Verification

- MinIO readiness passes.
- `file-service` `/health/ready` passes (DB + MinIO reachable).
- Known `file_id` returns metadata `available` and a working download URL.
- Orphan check: no critical `available` rows without objects (sample query).

## Escalation

Platform owner; if identity login to Console fails after restore, involve identity owner (OIDC client config).

## Rehearsal log (date, who, result, notes)

| Date | Who | Result | Notes |
|---|---|---|---|
| | | | |
