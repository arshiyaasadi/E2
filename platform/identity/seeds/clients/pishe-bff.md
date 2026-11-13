# Client — `pishe-bff` (realm `pishe`)

## Purpose

Confidential machine client for the Pishe Next.js BFF. Uses client-credentials to call the Keycloak Admin API (create pre-registration users, look up users, assign realm roles).

## Realm

`pishe` — see [pishe-realm.json](../../realms/pishe-realm.json). Companion browser/ROPC client: [pishe-app.md](pishe-app.md).

## Settings

| Setting | Value |
|---------|-------|
| `publicClient` | `false` |
| `serviceAccountsEnabled` | `true` |
| `standardFlowEnabled` | `false` |
| `directAccessGrantsEnabled` | `false` |
| `fullScopeAllowed` | **`false`** (least privilege) |

## Required Admin API access

With `fullScopeAllowed=false`, both of the following are required or the access token has empty `resource_access` and Admin API calls return **403**:

1. **Service-account user** role-mappings on client `realm-management`: `manage-users`, `view-users`, `query-users`, `view-realm`, `manage-realm`.
2. **Client scope-mappings** on `pishe-bff` → `realm-management` for the same roles.

`yarn workspace pishe kc:create-realm` applies both. Do not set `fullScopeAllowed=true` as a shortcut.

## Related

- Fragment: [pishe-bff.client.json](pishe-bff.client.json)
- Bootstrap: `apps/pishe/scripts/create-remote-realm.ts`
