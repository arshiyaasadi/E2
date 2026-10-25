# Example role → permission map (application-owned)

This file is an **example** for ecommerce admin / services. Real maps live in each service's config or database — not in Keycloak.

| Realm role (Keycloak) | Example permissions (application) |
|---|---|
| `platform-super-admin` | `*` (platform operations; not storefront commerce by default), including cross-store `file.*` |
| `store-owner` | `store.settings.write`, `staff.invite`, `product.*`, `order.*`, `cms.*`, `file.product_image.upload`, `file.product_image.read`, `file.product_image.delete` |
| `store-admin` | `product.*`, `order.read`, `order.update`, `cms.*`, `staff.read`, `file.product_image.upload`, `file.product_image.read`, `file.product_image.delete` |
| `store-editor` | `product.read`, `product.write`, `cms.read`, `cms.publish`, `file.product_image.upload`, `file.product_image.read`, `file.product_image.delete` |
| `customer` | `cart.*`, `checkout.create`, `order.read_own` |

File permissions are enforced in `services/file-service` and always combined with `store_id` from Keycloak group membership (except platform-wide ops for `platform-super-admin`).

Rules:

- Add or remove permission strings without changing Keycloak roles when possible.
- Introduce a new Keycloak role only when a new **persona** appears (for example `store-support`).
- Always combine staff permissions with `store_id` / group membership checks.
