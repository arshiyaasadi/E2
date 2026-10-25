-- file-service owns this database. Other services never query it directly.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS files (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        TEXT NOT NULL,
  owner_type      TEXT NOT NULL CHECK (owner_type IN ('product')),
  owner_ref       TEXT NOT NULL,
  kind            TEXT NOT NULL CHECK (kind IN ('product_image')),
  bucket          TEXT NOT NULL,
  object_key      TEXT NOT NULL,
  content_type    TEXT NOT NULL,
  size_bytes      BIGINT,
  status          TEXT NOT NULL CHECK (status IN ('pending', 'available', 'deleted')),
  created_by      TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (bucket, object_key)
);

CREATE INDEX IF NOT EXISTS files_store_id_idx ON files (store_id);
CREATE INDEX IF NOT EXISTS files_owner_idx ON files (store_id, owner_type, owner_ref);
CREATE INDEX IF NOT EXISTS files_status_idx ON files (status);
