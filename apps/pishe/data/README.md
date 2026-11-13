# Local JSON data

Runtime mock files (gitignored):

- `products.json` — product catalog
- `login-sessions.json` — login session log (ISO timestamps)
- `profiles.json` — first/last name overrides for the local BFF

Auth users live in Keycloak realm `pishe`. Display dates in the UI are Jalali; stored timestamps stay ISO.

Each product stores only `fileId` references. Image bytes live in `file-service` / MinIO.

Do not store secrets or credentials in these files. Do not commit `*.json` under this folder.
