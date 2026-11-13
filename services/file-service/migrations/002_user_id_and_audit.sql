-- Scope product images by user_id (M2M callers pass the owning user).
-- Append-only audit for mutate operations.

ALTER TABLE files RENAME COLUMN store_id TO user_id;

ALTER TABLE files ADD COLUMN IF NOT EXISTS updated_by TEXT;

DROP INDEX IF EXISTS files_store_id_idx;
DROP INDEX IF EXISTS files_owner_idx;

CREATE INDEX IF NOT EXISTS files_user_id_idx ON files (user_id);
CREATE INDEX IF NOT EXISTS files_owner_idx ON files (user_id, owner_type, owner_ref);

CREATE TABLE IF NOT EXISTS file_audit_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  action          TEXT NOT NULL,
  file_id         UUID,
  user_id         TEXT NOT NULL,
  client_id       TEXT NOT NULL,
  actor_user_id   TEXT,
  request_id      TEXT,
  detail          JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS file_audit_events_at_idx ON file_audit_events (at);
CREATE INDEX IF NOT EXISTS file_audit_events_file_id_idx ON file_audit_events (file_id);
CREATE INDEX IF NOT EXISTS file_audit_events_user_id_idx ON file_audit_events (user_id);
