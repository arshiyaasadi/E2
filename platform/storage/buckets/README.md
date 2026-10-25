# Bucket definitions

Declarative descriptions of MinIO buckets. Apply with a bootstrap Job using `mc` and credentials from the secret manager — never commit access keys.

| File | Bucket | Owner service |
|---|---|---|
| [product-images.yaml](product-images.yaml) | `product-images` | `file-service` |

Object keys for product images:

```
stores/{store_id}/products/{owner_ref}/{file_id}.{ext}
```
