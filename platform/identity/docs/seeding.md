# Seeding Keycloak realms

## Purpose

Seeds create the baseline realm configuration (`customers`, `operators`) on a **new** environment. They are not a substitute for database backups.

## Files

- `platform/identity/realms/customers-realm.json` — role `customer` only; no store groups
- `platform/identity/realms/operators-realm.json` — staff roles + group `store-demo` + clients `minio-console` and `file-service` (secrets replaced at apply time)
- `platform/identity/seeds/clients/` — documentation for storage-related clients

No client secrets, admin passwords, users, or real hostnames are stored in these files. Create bootstrap users at apply time from the secret manager.

## Seeded roles (operators)

| Role | Purpose |
|---|---|
| `platform-super-admin` | Platform owner; Keycloak Admin Console |
| `store-owner` | Store owner persona |
| `store-admin` | Store admin persona |
| `store-editor` | Editor persona (permissions in app) |

Permissions are **not** seeded into Keycloak. See [identity-permission-map.example.md](../../../docs/operations/identity-permission-map.example.md).

## When to seed

- First install of identity in an environment
- Rebuild of a non-production environment from scratch (after empty database)

Do **not** re-import production seeds over a live database that already has users.

## How to apply (intended)

1. Database empty (or freshly created).
2. Keycloak started and ready.
3. One-shot Kubernetes Job (or documented `kc.sh import`) imports the realm JSON with placeholders resolved.
4. Job is not left as a recurring CronJob.

## Idempotency

- Prefer "import only if realm missing" for automation.
- If a realm already exists, skip or fail loudly; do not silently overwrite production data.

## Operators realm

MFA is required for operator users. Enforce via realm authentication flows after first admin bootstrap (document the flow name in environment runbooks when configured).
