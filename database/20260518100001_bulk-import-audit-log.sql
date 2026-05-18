-- 20260518100001_bulk-import-audit-log.sql
-- Audit log for bulk Excel import runs. RLS enabled with no public policies —
-- access is via edge functions using the service-role key, gated by the same
-- admin session check used by admin-create-vendor / admin-delete-vendor.

CREATE TABLE IF NOT EXISTS bulk_import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  admin_id UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
  entity TEXT NOT NULL CHECK (entity IN ('component', 'product')),
  mode TEXT NOT NULL CHECK (mode IN ('insert', 'update', 'upsert')),
  total_rows INT NOT NULL,
  succeeded INT NOT NULL,
  failed INT NOT NULL,
  result_json JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bulk_import_logs_run_at
  ON bulk_import_logs (run_at DESC);
CREATE INDEX IF NOT EXISTS idx_bulk_import_logs_admin_id
  ON bulk_import_logs (admin_id);

ALTER TABLE bulk_import_logs ENABLE ROW LEVEL SECURITY;
