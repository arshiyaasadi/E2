# Production identity overlay (reference)

**Live SSO bind:** Docker Compose via Abysso Server `services/keycloak/` on the Server inventory host. See Server `docs/dns-sso.md` for `sso.abysso.ir`.

This kustomize overlay is retained as a **future / reference** Kubernetes path (`sso.abysso.ir`, Traefik, image channel `ghcr.io/arshiyaasadi/keycloak:main`). Do not treat it as the current host source of truth — host IPs and SSH live only in Server inventory.
