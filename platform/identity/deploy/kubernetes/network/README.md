# Identity NetworkPolicies

Templates for CNI NetworkPolicy. Adjust Ingress controller and application namespace labels when binding the cluster.

| File | Intent |
|---|---|
| `default-deny-identity.yaml` | Deny all ingress in the namespace |
| `allow-ingress-to-keycloak.yaml` | Ingress controller → Keycloak |
| `allow-apps-to-keycloak.yaml` | Labeled app namespaces → Keycloak |
| `allow-keycloak-to-postgres.yaml` | Keycloak → Postgres only |

Namespace labels live in `../namespace.yaml` (single Namespace object).

Design notes: [../../../docs/network.md](../../../docs/network.md).

Apply order (via base kustomization): namespace → default deny → allow rules.
