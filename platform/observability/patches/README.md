# SigNoz SSO patches (Abysso)

Controlled diffs applied on top of `platform/observability/upstream` (or baked into the first-party image via [../sso/](../sso/)).

## Policy

- **Allowed:** OIDC login against Keycloak (`operators` realm), role mapping, disable public signup, branding hooks that do not fork Enterprise SSO.
- **Forbidden:** Copying SigNoz Enterprise / licensed SSO source or binaries into this tree.
- **Upgrade path:** bump `SIGNOZ_GIT_REF` in [../VERSION](../VERSION), update the submodule pin, rebase or re-apply patches listed here, rebuild `REGISTRY/signoz:<sha>`.

## Layout

| Path | Purpose |
|---|---|
| `README.md` | This policy |
| `0001-oidc-keycloak.md` | Contract for the thin OIDC surface |

Branch naming on an org fork (when `UPSTREAM_URL` points at it):

- `upstream/vX.Y.Z` — vendor tag
- `abysso/sso` — SSO-only commits cherry-picked onto the vendor tag
