# Production identity overlay

- Hostname: `sso.abysso.ir`
- IngressClass: `traefik`
- Replicas: 1 (single-node bind)

Apply Secrets from `platform/identity/deploy/kubernetes/secret.example.yaml` on the node before or with the overlay.
