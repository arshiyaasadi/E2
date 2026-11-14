# Infrastructure

Product infrastructure definitions (manifests / overlays). **No host IPs, SSH, or kubeconfig here.**

Live server inventory and SSO Compose bind: Abysso Server control-plane repo.

## Layout

```
infrastructure/
├── modules/          Building blocks (cluster module archived for future k3s)
└── environments/
    ├── local/
    ├── staging/
    └── production/   Overlays; SSO live path is Server Compose (see production/README)
```

Design reference: [environments and servers](../docs/operations/environments-and-servers.md).
