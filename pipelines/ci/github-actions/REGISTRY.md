# GitHub Actions registry settings

In-cluster registry (`registry.platform-cd.svc:5000`) is **not reachable from GitHub Actions**. Use **GHCR** for CI push; CD on the edge pulls the same registry.

## Suggested values (this repo: `arshiyaasadi/E2`)

| Name | Where | Suggested value |
|---|---|---|
| `IMAGE_REGISTRY` | Repo **Settings → Secrets and variables → Actions → Variables** | `ghcr.io/arshiyaasadi` |
| `REGISTRY_USERNAME` | Actions **Secrets** | `arshiyaasadi` (GitHub username) |
| `REGISTRY_PASSWORD` | Actions **Secrets** | GitHub PAT with `write:packages` and `read:packages` (classic), or a fine-grained token with Packages write on this account |

Optional: set packages to public under GitHub Packages so the edge can pull without a pull secret. If packages stay private, create a cluster `imagePullSecret` that uses the same PAT (`read:packages`) and attach it to namespaces `platform-identity`, `platform-observability`, `services-file`.

## CD ConfigMap

`pipelines/cd/channel-reconciler` `REGISTRY` must match `IMAGE_REGISTRY` (for example `ghcr.io/arshiyaasadi`). Image names become:

- `ghcr.io/arshiyaasadi/keycloak:main`
- `ghcr.io/arshiyaasadi/signoz:main`
- `ghcr.io/arshiyaasadi/file-service:main`

## Publish rule

| Event | Build | Push `:sha` | Move `:main` (CD channel) |
|---|---|---|---|
| Push / PR on `develop` | Yes | No | No |
| Merge / push to `main` | Yes | Yes | Yes |
