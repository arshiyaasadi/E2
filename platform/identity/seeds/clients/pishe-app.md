# Clients — `pishe-app` and `pishe-bff` (realm `pishe`)

## Purpose

| Client | Use |
|--------|-----|
| `pishe-app` | Pishe Next.js BFF exchanges username/password for tokens (Direct Access Grants). |
| `pishe-bff` | Service account for Admin API: create pre-registration users, look up users, assign roles. See [pishe-bff.md](pishe-bff.md). |

## Realm

`pishe` — see [pishe-realm.json](../../realms/pishe-realm.json).

In Keycloak Admin, switch the realm dropdown to **`pishe`** (not `master` / `operators`) to see Pishe users such as `flamingo-manager`.

## User attribute

| Attribute | Value | Meaning |
|-----------|-------|---------|
| `pre_registration` | `"true"` | Pre-registered via Pishe; **no password** until an operator grants access. Cannot login. |
| `pre_registration` | `"false"` | Approved; may login after a password is set. |

Keycloak declarative user profile must allow these attributes (`unmanagedAttributePolicy=ENABLED` or explicit `pre_registration` / `mobile` attributes). `yarn kc:create-realm` configures this.

## Approve a pre-registered user (operator)

1. Keycloak Admin → realm **`pishe`** → Users → open the mobile username.
2. Credentials → set a permanent password (temporary = off).
3. Attributes → set `pre_registration` to `false` (or remove it).
4. User can then login in Pishe with that mobile + password.

## Apply-time setup

1. Prefer `yarn workspace pishe kc:create-realm` (creates realm, secrets, SA roles **and** client scope-mappings, seeds `flamingo-manager`).
2. Or import realm JSON and apply [pishe-bff.md](pishe-bff.md) permissions manually.
3. Do not enable public self-registration on the realm; registration is app-driven only.

## Related

- [pishe-bff.md](pishe-bff.md)
- Pishe app: `apps/pishe`
