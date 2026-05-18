// supabase/functions/bulk-import-processor/auth.ts
// Verifies the requester is a real, active admin. Mirrors the pattern used by
// admin-create-vendor / admin-delete-vendor.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function verifyAdmin(
  supabase: SupabaseClient,
  admin_id: string | undefined
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  if (!admin_id) {
    return { ok: false, status: 400, message: 'admin_id required' };
  }
  const { data: admin, error } = await supabase
    .from('admin_profiles')
    .select('id, is_active')
    .eq('id', admin_id)
    .maybeSingle<{ id: string; is_active: boolean | null }>();
  if (error || !admin) {
    return { ok: false, status: 403, message: 'Unauthorized — admin profile not found.' };
  }
  if (admin.is_active === false) {
    return { ok: false, status: 403, message: 'Admin account is inactive.' };
  }
  return { ok: true };
}
