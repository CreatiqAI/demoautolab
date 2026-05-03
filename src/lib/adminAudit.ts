import { supabase } from '@/lib/supabase';

export type AdminRole = 'super_admin' | 'admin' | 'support';

export interface AdminUser {
  id: string;
  username: string;
  full_name: string;
  role: AdminRole;
  is_active: boolean;
}

/**
 * Resolve the current admin from localStorage. The admin auth flow stores
 * a JSON blob there at login time. Returns null if not logged in or stored
 * data is invalid.
 */
export function getCurrentAdmin(): AdminUser | null {
  try {
    const raw = localStorage.getItem('admin_user');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.id || !parsed?.username) return null;
    return {
      id: parsed.id,
      username: parsed.username,
      full_name: parsed.full_name ?? parsed.username,
      role: (parsed.role as AdminRole) ?? 'admin',
      is_active: parsed.is_active ?? true,
    };
  } catch {
    return null;
  }
}

export function hasRole(required: AdminRole | AdminRole[]): boolean {
  const admin = getCurrentAdmin();
  if (!admin) return false;
  const allowed = Array.isArray(required) ? required : [required];
  return allowed.includes(admin.role);
}

export interface LogAdminActionParams {
  action: string;
  entityType: string;
  entityId?: string | null;
  entityLabel?: string | null;
  before?: unknown;
  after?: unknown;
  notes?: string | null;
}

/**
 * Insert an admin_audit_log row. Best-effort — never throws or blocks the
 * caller. Failures are swallowed (the action being audited is the source of
 * truth, the log is decoration).
 */
export async function logAdminAction({
  action,
  entityType,
  entityId,
  entityLabel,
  before,
  after,
  notes,
}: LogAdminActionParams): Promise<void> {
  try {
    const admin = getCurrentAdmin();
    await supabase.from('admin_audit_log' as any).insert({
      actor_admin_id: admin?.id ?? null,
      actor_username: admin?.username ?? null,
      action,
      entity_type: entityType,
      entity_id: entityId ?? null,
      entity_label: entityLabel ?? null,
      before_data: before === undefined ? null : (before as any),
      after_data: after === undefined ? null : (after as any),
      notes: notes ?? null,
    } as any);
  } catch {
    // Logging should never break the action itself.
  }
}
