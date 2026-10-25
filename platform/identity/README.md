# Identity (Keycloak)

OIDC identity provider for the whole platform.

- **Owner:** TBD
- **Product:** Keycloak ([ADR 0001](../../docs/architecture/decisions/0001-keycloak-as-identity-provider.md))
- **RBAC split:** roles in Keycloak, permissions in apps ([ADR 0004](../../docs/architecture/decisions/0004-keycloak-roles-app-permissions.md))
- **Pinned version:** see [VERSION](VERSION)
- **Source:** git submodule [upstream/](upstream/)

## Layout

```
platform/identity/
├── VERSION
├── upstream/
├── realms/                 Role + group seeds (no secrets)
├── seeds/
├── database/
├── deploy/kubernetes/      Workloads + network policies
└── docs/                   Deploy, upgrade, backup, seeding, API, network
```

## Realms and roles

| Realm | Roles (Keycloak) |
|---|---|
| `operators` | `platform-super-admin`, `store-owner`, `store-admin`, `store-editor` |
| `customers` | `customer` (buyers not store-segregated in SSO yet) |

Staff tenancy seed: group `store-demo` with attribute `store_id=store-demo`.

Keycloak Admin Console: **only** `platform-super-admin`.

## Docs

- [RBAC guideline](../../docs/operations/identity-rbac-and-tenancy.md)
- [API usage (login, token, users, admin)](docs/api-usage.md)
- [Network](docs/network.md)
- [Deploy](docs/deploy.md)
- [Upgrade from upstream](docs/upgrade-from-upstream.md)
- [Backup and restore](docs/backup-restore.md)
- [Seeding](docs/seeding.md)
- [Storage clients](seeds/clients/) (`minio-console`, `file-service`)

Platform references: [identity-sso](../../docs/operations/identity-sso.md), [restore identity database](../../docs/runbooks/restore-identity-database.md), [file storage](../../docs/operations/file-storage.md).
