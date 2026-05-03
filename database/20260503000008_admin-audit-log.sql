-- ============================================================================
-- admin_audit_log + role hardening
-- ============================================================================
-- Track every destructive/sensitive admin action so we can answer "who did
-- this and when" — important now that there are multiple admin accounts.
--
-- Also adds a CHECK constraint on admin_profiles.role to lock down the
-- supported role values.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_admin_id UUID REFERENCES public.admin_profiles(id) ON DELETE SET NULL,
  actor_username TEXT,           -- snapshot at log time so audit survives admin deletion
  action TEXT NOT NULL,          -- e.g. 'customer.suspend', 'merchant.demote', 'panel.promote'
  entity_type TEXT NOT NULL,     -- e.g. 'customer', 'order', 'admin'
  entity_id UUID,
  entity_label TEXT,             -- human-readable label (customer name, order #, etc.)
  before_data JSONB,             -- snapshot of relevant fields before the action
  after_data JSONB,              -- snapshot after
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_actor ON public.admin_audit_log(actor_admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON public.admin_audit_log(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON public.admin_audit_log(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.admin_audit_log(created_at DESC);

COMMENT ON TABLE public.admin_audit_log IS
  'Audit trail of admin actions. actor_username is snapshotted so log entries survive admin deletion.';

-- Lock role values to a known set (super_admin, admin, support).
-- Existing rows currently have role='admin' which is in the new set.
ALTER TABLE public.admin_profiles
  DROP CONSTRAINT IF EXISTS admin_profiles_role_check;
ALTER TABLE public.admin_profiles
  ADD CONSTRAINT admin_profiles_role_check
    CHECK (role IN ('super_admin', 'admin', 'support'));

-- Promote the first admin to super_admin so user-management isn't locked out.
UPDATE public.admin_profiles
SET role = 'super_admin'
WHERE id = (SELECT id FROM public.admin_profiles ORDER BY created_at ASC LIMIT 1)
  AND role = 'admin';
