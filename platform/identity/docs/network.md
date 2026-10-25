# Identity network design (Kubernetes)

Ensure Keycloak, its PostgreSQL database, the gateway, and application services can reach each other without exposing extra surfaces.

## Zones

| Zone | Members | Exposure |
|---|---|---|
| Edge | Ingress / future API gateway | Public HTTPS only |
| Identity app | Keycloak pods | Cluster-internal + Ingress |
| Identity data | PostgreSQL for Keycloak | Cluster-internal only |
| Application | Business services, admin BFF, storefront BFF | Cluster-internal; reach Keycloak JWKS/token as needed |
| Admin edge | Optional separate Ingress host for Admin Console | Restricted (VPN / allowlist); not public if possible |

## DNS names (in-cluster)

Use these from pods (replace namespace if changed):

| Target | DNS |
|---|---|
| Keycloak HTTPS | `keycloak.platform-identity.svc.cluster.local` |
| Keycloak management / health | `keycloak.platform-identity.svc.cluster.local:9000` |
| Identity Postgres | `keycloak-pg-rw.platform-identity.svc.cluster.local` (CNPG-style primary name; adjust to your operator) |

Browsers use `REPLACE_KEYCLOAK_HOSTNAME` / `REPLACE_ADMIN_HOSTNAME` via Ingress — never point browser apps at ClusterIP DNS.

## Required flows

```text
Browser → Ingress (443) → Keycloak
Browser → Ingress → Admin panel / storefront → (BFF) → Keycloak token/JWKS (in-cluster)
Services → Keycloak JWKS / token (in-cluster Service)
Keycloak → PostgreSQL (in-cluster only)
Super-admin → Admin hostname → Keycloak Admin UI (restricted)
```

Blocked by default:

- Internet → PostgreSQL
- Internet → Keycloak management port
- Other namespaces → PostgreSQL (unless explicitly allowed for backup jobs)
- Store staff browsers → Admin Console path (enforce via separate hostname + network / IdP; do not publish admin Ingress publicly)

## NetworkPolicy intent

Manifests: `platform/identity/deploy/kubernetes/network/`

1. **Default deny** ingress in `platform-identity` (optional baseline).
2. Allow Ingress controller → Keycloak pods (HTTPS + management if health checks come from the controller).
3. Allow pods in application namespaces (label `platform.e2/access-identity=true`) → Keycloak Service (443/8443).
4. Allow Keycloak pods → PostgreSQL pods (5432).
5. Allow Prometheus / observability scrape to management port if labeled.
6. Deny all other cross-namespace ingress to Postgres.

Until the live CNI and Ingress controller are bound, policies ship as templates with placeholder namespace labels.

## Hostname split

| Hostname | Audience | Paths |
|---|---|---|
| `REPLACE_KEYCLOAK_HOSTNAME` | Apps and users (OIDC) | `/realms/*`, protocol endpoints |
| `REPLACE_ADMIN_HOSTNAME` | Super-admin only | Admin Console / Admin API |

Do not put Admin Console on the same public host as OIDC if you can avoid it. Restrict admin host with VPN, IP allowlist, or private Ingress.

## Failure modes to avoid

- Services validating tokens via public Ingress while NetworkPolicy blocks egress → use in-cluster DNS.
- Keycloak `KC_HOSTNAME` mismatch with Ingress → broken redirects; keep config aligned with [deploy.md](deploy.md).
- Postgres exposed via NodePort/LoadBalancer → forbidden.
- Seed Job in another namespace without egress to Keycloak/Postgres → import fails.

## Checklist before go-live

- [ ] NetworkPolicies applied and tested (deny + allow)
- [ ] JWKS reachable from a test pod in an application namespace
- [ ] Postgres not reachable from outside the cluster
- [ ] Admin hostname not world-open (or MFA + allowlist documented)
- [ ] DNS and TLS for both hostnames valid
