# 0004. Keycloak manages roles; applications manage permissions

- Status: accepted
- Date: 2026-10-21

## Context

The platform has three identity layers: platform super-admin, store staff (owner/admin/editor later), and customers (buyers). Fine-grained permissions (for example product edit, refund) will grow inside the admin panel and services. Buyers do not need per-store segregation in SSO for now. Only the platform super-admin may use the Keycloak Admin Console.

## Decision

- **Keycloak is the source of truth for identity and coarse roles only** (who the user is and which realm roles they hold).
- **Fine-grained permissions are defined and enforced in application services** (and the admin panel backend), mapped from those roles.
- Realms remain:
  - `operators` — platform super-admin and store staff
  - `customers` — buyers (not segregated by store in SSO at this phase)
- Keycloak Admin Console access is limited to **platform super-admin** accounts. Store staff use only the ecommerce admin panel.
- Multi-store staff isolation (store A vs store B) uses Keycloak groups (or organizations later) with a stable `store_id`; customer realm has no store grouping yet.
- Seed the first demo store staff group and baseline roles in realm JSON; no secrets in Git.

## Consequences

- Services validate JWT + realm roles from Keycloak, then apply local permission tables.
- Changing editor/support permissions does not require Keycloak schema churn.
- Connecting new apps must follow `docs/operations/identity-rbac-and-tenancy.md` and `platform/identity/docs/api-usage.md`.
- Buyer multi-store SSO segregation can be added later without changing the roles-vs-permissions split.
