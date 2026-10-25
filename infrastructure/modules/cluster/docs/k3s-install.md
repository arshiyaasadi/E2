# k3s install (edge)

First production bind: single server node. Add agents later for scale.

## Prerequisites

- Ubuntu 24.04 (or compatible) Linux
- Public A records for `sso.abysso.ir`, `file.abysso.ir`, `noz.abysso.ir`
- Ports 80 and 443 free for Traefik (stop host nginx / docker publish on those ports)
- Do not change unrelated VPN host services

## Install server

```bash
curl -sfL https://get.k3s.io | sh -s - \
  --write-kubeconfig-mode 644 \
  --disable traefik=false
```

k3s enables Traefik by default. Confirm:

```bash
kubectl get ingressclass
# NAME      CONTROLLER
# traefik   traefik.io/ingress-controller
```

## kubeconfig (operators)

```bash
sudo cat /etc/rancher/k3s/k3s.yaml
# Replace server: https://127.0.0.1:6443 with the node address for remote use.
# Never commit kubeconfig to Git.
```

## Install cert-manager

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.16.2/cert-manager.yaml
kubectl -n cert-manager wait --for=condition=Available deploy --all --timeout=180s
```

Then apply the ClusterIssuer from this module:

```bash
kubectl apply -f infrastructure/modules/cluster/cert-manager/cluster-issuer.yaml
```

Update `email` in the issuer before first use if needed (placeholder is fine for docs; set a real ops mailbox on the node).

## Storage

k3s ships `local-path` StorageClass. Use it for single-node PVCs until a shared storage class exists.

## Add an agent (scale path)

On a new Linux node:

```bash
# On server:
sudo cat /var/lib/rancher/k3s/server/node-token

# On agent:
curl -sfL https://get.k3s.io | K3S_URL=https://<server-ip>:6443 \
  K3S_TOKEN=<node-token> sh -
```

Then raise replica patches in production overlays.
