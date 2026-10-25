# Identity and SSO

## Goal

One identity provider for the whole platform. No service manages its own usernames and passwords.

## Product

- **Keycloak** ([ADR 0001](../architecture/decisions/0001-keycloak-as-identity-provider.md)).
- Source: git submodule at `platform/identity/upstream/`, pin in `platform/identity/VERSION`.
- Runtime: container image built from the pinned source, deployed on Kubernetes.
- Database: dedicated PostgreSQL per environment (not Keycloak `dev-file`).

## Roles vs permissions

- Keycloak manages **roles only** ([ADR 0004](../architecture/decisions/0004-keycloak-roles-app-permissions.md)).
- Applications manage **permissions** mapped from those roles.
- Full rules: [identity RBAC and tenancy](identity-rbac-and-tenancy.md).
- Example map: [identity-permission-map.example.md](identity-permission-map.example.md).
- Integration APIs: [platform/identity/docs/api-usage.md](../../platform/identity/docs/api-usage.md).

## Protocol

- OpenID Connect (OIDC) on top of OAuth 2.0.
- Services validate access tokens (signature, issuer, audience, expiry). They do not keep sessions.

## Realms

| Realm | Who | Used by |
|---|---|---|
| `customers` | Buyers (not segregated by store in SSO yet) | Storefront |
| `operators` | Platform super-admin and store staff | Admin panel; Keycloak Admin Console for super-admin only |

Operator accounts require multi-factor authentication (especially `platform-super-admin`).

Seed definitions (no secrets): `platform/identity/realms/`. See `platform/identity/seeds/README.md`.

## Clients

| Client type | Flow |
|---|---|
| Web and mobile apps | Authorization Code with PKCE |
| Service-to-service | Client Credentials (machine identity) |

Each app registers its own client. Secrets for confidential clients live in the secret manager.

## Authorization

- Roles are carried as token claims from Keycloak.
- Coarse checks (token valid, correct realm/audience) happen at the gateway.
- Fine-grained permission checks happen inside each service using the local role→permission map.
- Staff APIs also enforce store group / `store_id` membership.

## Tokens

- Short-lived access tokens.
- Refresh tokens for user sessions, revocable.
- Signing keys rotate on a schedule. Services fetch keys from the provider's JWKS endpoint (prefer in-cluster DNS — [network](../../platform/identity/docs/network.md)).

## Audit

Logins, failed logins, password changes, role changes, and token revocations are written to the audit log (Keycloak events / admin events, shipped to the observability stack).

## Backup and seeds

- **Backups** cover the identity PostgreSQL database (WAL + snapshots). See [database and backup](database-and-backup.md) and [restore identity database](../runbooks/restore-identity-database.md).
- **Seeds** recreate empty realm configuration and baseline roles/groups. They do not replace backups.

## Upgrade from upstream

See `platform/identity/docs/upgrade-from-upstream.md`.
