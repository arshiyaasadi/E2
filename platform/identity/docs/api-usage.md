# Keycloak API and integration usage

How applications use Keycloak for login, tokens, users, roles, and admin operations.

Base URLs (placeholders):

| Purpose | URL shape |
|---|---|
| Issuer (customers) | `https://REPLACE_KEYCLOAK_HOSTNAME/realms/customers` |
| Issuer (operators) | `https://REPLACE_KEYCLOAK_HOSTNAME/realms/operators` |
| JWKS | `{issuer}/protocol/openid-connect/certs` |
| Token | `{issuer}/protocol/openid-connect/token` |
| Auth (browser) | `{issuer}/protocol/openid-connect/auth` |
| UserInfo | `{issuer}/protocol/openid-connect/userinfo` |
| Logout | `{issuer}/protocol/openid-connect/logout` |
| Admin API | `https://REPLACE_ADMIN_HOSTNAME/admin/realms/{realm}/...` |

Prefer the **internal** Kubernetes Service DNS for service-to-service calls inside the cluster (see [network.md](network.md)). Use the public hostname only for browsers.

## 1. Browser / SPA login (Authorization Code + PKCE)

Use a standard OIDC library (AppAuth, oidc-client, NextAuth, etc.). Do not invent a custom login against the Admin API.

Flow:

1. Redirect user to `/protocol/openid-connect/auth` with `client_id`, `redirect_uri`, `response_type=code`, `scope=openid profile email`, `code_challenge` (PKCE).
2. User authenticates on Keycloak (correct realm).
3. Exchange `code` at `/protocol/openid-connect/token` with `code_verifier`.
4. Store access token (short-lived) and refresh token securely (httpOnly cookie via BFF preferred for SPAs).
5. Call APIs with `Authorization: Bearer <access_token>`.

| App | Realm | Client (logical) |
|---|---|---|
| Admin panel | `operators` | `admin-panel` |
| Storefront | `customers` | `storefront` |
| MinIO Console | `operators` | `minio-console` |
| File service (API audience) | `operators` | `file-service` |

Storage clients: [seeds/clients/](../seeds/clients/). Console OIDC: [platform/storage/docs/console-oidc.md](../../storage/docs/console-oidc.md).

## 2. Service login (Client Credentials)

Machine clients obtain tokens without a user:

```http
POST {issuer}/protocol/openid-connect/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&client_id=svc-example&client_secret=...
```

Use only for service-to-service calls. Never embed these secrets in frontend code.

## 3. Validate / check tokens (every API)

Do **not** call Keycloak on every request if you can validate locally.

1. Fetch JWKS from `{issuer}/protocol/openid-connect/certs` (cache keys; refresh on unknown `kid`).
2. Verify signature, `iss`, `exp`, `nbf`, and `aud` / `azp` per client policy.
3. Read realm roles (typically `realm_access.roles`).
4. Map roles → permissions in the **application** (Keycloak does not own permission lists).
5. For staff APIs, read store group / `store_id` claim and enforce tenancy.

Optional introspection (confidential clients only):

```http
POST {issuer}/protocol/openid-connect/token/introspect
```

Prefer local JWT validation for APIs; use introspection when you must check revocation immediately.

## 4. UserInfo

```http
GET {issuer}/protocol/openid-connect/userinfo
Authorization: Bearer <access_token>
```

Use for profile display. Authorization decisions must use access-token claims + local permissions, not UserInfo alone.

## 5. Filters and gateway checks (coarse)

At the edge / gateway:

- Require `Authorization` bearer token on protected routes.
- Reject expired / invalid signatures.
- Optionally require a role claim (for example admin routes require presence of any staff role).
- Route admin traffic only with `operators` issuer; storefront APIs only with `customers` issuer.

Fine filters (permission names) stay in services.

## 6. Admin API (users, roles, groups)

Admin REST API is for **platform automation and super-admin tools**, not for store staff browsers.

Authenticate the Admin API with a confidential client that has only the required service roles, or with a super-admin session. Base path:

`/admin/realms/{realm}`

Common operations (illustrative):

| Action | Method / path |
|---|---|
| List users | `GET /admin/realms/{realm}/users?username=&email=&first=&max=` |
| Get user | `GET /admin/realms/{realm}/users/{id}` |
| Create user | `POST /admin/realms/{realm}/users` |
| Update user | `PUT /admin/realms/{realm}/users/{id}` |
| Reset password | `PUT /admin/realms/{realm}/users/{id}/reset-password` |
| User realm roles | `GET/POST /admin/realms/{realm}/users/{id}/role-mappings/realm` |
| Groups | `GET /admin/realms/{realm}/groups` |
| Add user to group | `PUT /admin/realms/{realm}/users/{id}/groups/{groupId}` |
| Realm roles | `GET /admin/realms/{realm}/roles` |

Official reference: Keycloak Server Administration REST API for the pinned version in `platform/identity/VERSION`.

### Rules

- Store owners manage staff through the **ecommerce admin panel**, which calls your BFF; the BFF may call Admin API with a locked-down service account scoped to that store's group.
- Humans other than super-admin must not use the Keycloak Admin Console UI.
- Never commit admin passwords or client secrets; rotate via secret manager.

## 7. Roles only in Keycloak

Assign and read these realm roles (seeded):

| Role | Realm | Meaning |
|---|---|---|
| `platform-super-admin` | `operators` | Platform owner; Admin Console allowed |
| `store-owner` | `operators` | Owner of a store (group member) |
| `store-admin` | `operators` | Store administrator |
| `store-editor` | `operators` | Content/product editor (permissions in app) |
| `customer` | `customers` | Buyer |

Permission strings such as `product.write` are **not** created as Keycloak roles. Map them in the application from the roles above.

## 8. Logout and session

- Browser logout: redirect to `/protocol/openid-connect/logout` with `id_token_hint` and `post_logout_redirect_uri` as configured.
- Revoke refresh token when the client supports revocation endpoint.
- After role or group changes, rely on short access-token TTL; force logout if immediate effect is required.

## 9. Errors apps should handle

| Symptom | Likely cause |
|---|---|
| `invalid_grant` | Bad/expired code or refresh token |
| `401` from API | Expired access token; refresh or re-login |
| `403` from API | Role OK in Keycloak but permission denied in app, or wrong store |
| JWKS fetch fail | Network policy / DNS to Keycloak broken — see [network.md](network.md) |
