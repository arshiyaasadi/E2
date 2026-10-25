# Staging — identity

Kustomize overlay. Single resource entry:

`resources: [../../../../platform/identity/deploy/kubernetes]`

The base `kustomization.yaml` there lists manifests with short local paths. Do not list each YAML with a long `../` chain.

Replace all `REPLACE_*` values before apply. Do not apply until the staging cluster and registry are bound.
