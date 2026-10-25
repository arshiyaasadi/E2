# 0007. Traefik as API gateway on k3s

- Status: accepted
- Date: 2026-10-21

## Context

The platform needs a single public entry point for TLS termination and host-based routing. The first production bind is a single Linux edge node with limited RAM. Full kubeadm plus a separate gateway product would consume too much capacity. Operators and agents need a simple, well-documented Ingress path that can grow to multi-node later.

## Decision

- Use **k3s** as the first production Kubernetes distribution (still Kubernetes per ADR 0002).
- Use **Traefik** (bundled with k3s) as the platform gateway: TLS termination, Ingress routing, and the only process listening on public 80/443 for platform hosts.
- Manage certificates with **cert-manager** and Let's Encrypt HTTP-01 (`ClusterIssuer` named `letsencrypt-prod`).
- Public hosts for the first bind: `sso.abysso.ir`, `file.abysso.ir`, `noz.abysso.ir`. Databases and MinIO API stay ClusterIP only.

## Consequences

- Gateway product choice is fixed; route tables live as Kubernetes Ingress objects under each component's `deploy/kubernetes/` plus environment overlays.
- Scaling means adding k3s agents and raising replica patches; Traefik remains on the edge (or is moved deliberately later).
- Operators must keep host/docker nginx off ports 80/443 so Traefik can bind them.
- VPN and unrelated host services stay out of this gateway's scope.
