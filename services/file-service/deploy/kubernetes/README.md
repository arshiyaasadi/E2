# file-service Kubernetes manifests

Apply via environment overlays under `infrastructure/environments/<env>/` when the cluster is bound.

Namespace is labeled `platform.e2/access-storage=true` and `platform.e2/access-identity=true` for NetworkPolicies.
