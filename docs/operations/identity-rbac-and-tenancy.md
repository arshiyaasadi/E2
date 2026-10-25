# Identity RBAC and Tenancy Guideline

Rules for connecting storefront, admin panel, and microservices to Keycloak without breaking isolation or authorization.

Related: [identity-sso](identity-sso.md), [ADR 0004](../architecture/decisions/0004-keycloak-roles-app-permissions.md), [Keycloak API usage](../../platform/identity/docs/api-usage.md).

## Identity layers

| Layer | Realm | Who | Logs into |
|---|---|---|---|
| Platform super-admin | `operators` | Platform owner | Keycloak Admin Console + optional platform tools |
| Store staff | `operators` | Store owner / admin / future editor | Ecommerce admin panel only |
| Customer (buyer) | `customers` | Shopper | Storefront |

## Roles vs permissions

| Concern | Owned by | Examples |
|---|---|---|
| Roles | Keycloak (realm roles) | `platform-super-admin`, `store-owner`, `store-admin`, `store-editor`, `customer` |
| Permissions | Each application / service | `product.write`, `order.refund`, `cms.publish` |

### Rules

1. Keycloak assigns **roles** to users. It does not store fine-grained permission catalogs for business features.
2. Each service keeps a **role → permissions** map (config or DB). Enforcement happens in the service on every request.
3. Gateway (when present) checks token validity and coarse audience; services still enforce permissions.
4. Never grant store staff `realm-management` or Keycloak Admin Console access.

## Tenancy (stores)

### Staff (now)

- One ecommerce admin panel UI; OIDC client(s) against realm `operators`.
- Each store is a Keycloak **group** named `store-<id>` (seed: `store-demo`).
- Staff users are members of one or more store groups.
- Put stable store id in token claims (group path or protocol mapper → `store_id` / `store_ids`).
- Admin panel and APIs must scope every query by the caller's store membership. A `store-owner` of A must not access B.

### Customers (current phase)

- Buyers live in realm `customers` with role `customer`.
- **No per-store segregation in SSO yet.** Storefront may still pass a store context in the app; it is not enforced via Keycloak groups in this phase.
- Do not invent parallel customer accounts per store in Keycloak until product requires it.

## Clients

| Client (logical name) | Realm | Used by |
|---|---|---|
| `admin-panel` | `operators` | Ecommerce admin SPA/BFF |
| `storefront` | `customers` | Storefront |
| `svc-<service-name>` | as needed | Service-to-service (client credentials) |

Client secrets never go in Git. Register clients at deploy time from the secret manager.

Recommended: **one** `admin-panel` client for all stores; store context comes from group membership after login. Per-store OIDC clients are optional later.

## Token contract services must honor

Every protected API must:

1. Validate JWT (issuer, signature via JWKS, `exp`, `aud` / authorized party as configured).
2. Reject tokens from the wrong realm for that API surface (admin APIs ≠ customer APIs).
3. Read realm roles from the token.
4. Resolve permissions via the service-local role→permission map.
5. For staff APIs: enforce `store_id` / group membership on every resource access.
6. Propagate `trace_id`; never log raw tokens.

## Keycloak Admin Console

- Only users with role `platform-super-admin` (and bootstrap admin) may use the Admin Console / Admin API with full realm powers.
- Store user management from the product should use a **dedicated confidential client** with the minimum Admin API scopes, restricted by automation — not human Admin Console access for store owners.

## Seeding

- Baseline roles and `store-demo` staff group: `platform/identity/realms/`.
- Apply once on empty environments. See `platform/identity/docs/seeding.md`.
- Seeds are not backups and must not contain passwords or client secrets.

## Checklist when connecting a new app or service

- [ ] Correct realm and OIDC client registered
- [ ] Redirect URIs and web origins set per environment
- [ ] JWKS URL and issuer configured; clock skew tolerated
- [ ] Role names match this guideline (no ad-hoc role strings)
- [ ] Permission map defined in the service
- [ ] Staff APIs enforce store membership
- [ ] Customer APIs do not accept `operators` tokens (and vice versa)
- [ ] Network path to Keycloak (and JWKS) allowed — see identity network docs
- [ ] No Keycloak Admin Console credentials shipped with the app
