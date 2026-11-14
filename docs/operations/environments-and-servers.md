# Environments and servers

## Environments

| Environment | Purpose | Data | Deploy trigger |
|---|---|---|---|
| `local` | Developer machine | Fake data | Manual |
| `staging` | Integration, QA, restore rehearsals | Synthetic or anonymized | Merge to `main` |
| `production` | Real users | Real data | Approved release / ops pack |

Rules:

- Environments do not share databases, secrets, storage buckets, or networks.
- Production data never goes to `staging` or `local` unless anonymized.
- `staging` mirrors `production` topology at smaller scale where applicable.

## Host / IP source of truth

**Do not document server IPs, SSH, or host inventory in this repository.**

All live host inventory, DNS click-ops, nginx, and reboot patterns live in the **Abysso Server** control-plane repo (`~/Documents/Abysso/Server`):

- `inventory/servers.json`
- `inventory/services.json`
- `docs/dns-sso.md` (SSO DNS / Arvan)
- `services/keycloak/` (production Keycloak Compose bind)

## Production SSO (current)

| Hostname | Role | Runtime |
|---|---|---|
| `sso.abysso.ir` | Keycloak (OIDC) | Docker Compose on the Server-inventory host (`services/keycloak`) |

Product identity docs (realms, roles, seeds, VERSION) stay under `platform/identity/` in this repo. Host bind and secrets paths are Server-only.

## Other platform hostnames (product intent)

| Host | Public | Notes |
|---|---|---|
| `file.abysso.ir` | Yes | Object console (OIDC) — host bind not owned here |
| `noz.abysso.ir` | Yes | Observability UI — host bind not owned here |
| `pg.abysso.ir` | No | Logical DB name only; never publish |

## Orchestration note

Historical ADRs (`0002`, `0007`, `0009`) describe a k3s + Traefik path. **Production Kicklok/SSO is Docker Compose** on the Server inventory host until those ADRs are explicitly revived for a dedicated cluster. Kubernetes manifests under `platform/*/deploy/kubernetes/` remain design references / future path — not the live SSO bind.

## Access

Operator access and SSH details: Server inventory only. Never commit kubeconfig, host passwords, or live `.env` values here.
