# Production file-service overlay

- Hostname: `file.abysso.ir`
- Image: build and load `file-service:0.1.0` into k3s, or point `images:` at the private registry when bound.
- Secrets: materialize `file-service-secrets` and `file-service-pg-secrets` on the node.
