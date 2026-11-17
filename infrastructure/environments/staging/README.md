# Staging environment

Mirrors production product topology at smaller scale.

- Synthetic or anonymized data
- Separate secrets, databases, buckets, and network from production
- **Host / IP bind:** not documented in E2 — use Abysso Server inventory when a staging host exists

## Identity

Product overlays: `identity/`. Live SSO patterns follow Server `services/keycloak/` until a dedicated staging host is inventoried there.
