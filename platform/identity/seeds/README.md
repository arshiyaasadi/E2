# Identity seeds

Realm JSON files live in `../realms/`.

| File | Realm | Contents |
|---|---|---|
| `../realms/customers-realm.json` | `customers` | Role `customer` (no store groups) |
| `../realms/operators-realm.json` | `operators` | Staff roles + group `store-demo` + storage clients (`minio-console`, `file-service`) |
| [clients/](clients/) | `operators` | Docs and JSON fragments for MinIO Console and file-service |

## Rules

- Seeds configure empty or rebuilt environments only.
- Keycloak gets **roles** (and staff store groups). Permissions stay in apps.
- Never commit secrets, passwords, users, or real hostnames.
- Seeds are not backups. See [../docs/seeding.md](../docs/seeding.md) and [../docs/backup-restore.md](../docs/backup-restore.md).
- Guideline: [identity-rbac-and-tenancy](../../../docs/operations/identity-rbac-and-tenancy.md).

## Apply

Use a one-shot import Job after first Keycloak boot, or `kc.sh import` as documented in [../docs/seeding.md](../docs/seeding.md).
