import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Mint a fresh one-time set-password link for an EXISTING admin (e.g. when the
// original invite expired or was consumed by an email link-scanner). Caller must
// be a signed-in super_admin/admin; the target must already be an admin account.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const j = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(url, serviceKey);

    const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '');
    const { data: { user }, error: uErr } = await admin.auth.getUser(jwt);
    if (uErr || !user) return j({ success: false, message: 'Unauthorized' }, 401);
    const callerRole = (user.app_metadata as Record<string, unknown> | null)?.role;
    if (callerRole !== 'super_admin' && callerRole !== 'admin') {
      return j({ success: false, message: 'Admin privileges required' }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    const redirectTo = String(body.redirectTo || '').trim() || undefined;
    if (!email) return j({ success: false, message: 'Email is required.' }, 400);

    // Only for accounts that are already admins — never mint a set-password link
    // for an arbitrary user via this endpoint.
    const { data: prof } = await admin
      .from('admin_profiles')
      .select('id, role, is_active')
      .eq('username', email)
      .maybeSingle();
    if (!prof) return j({ success: false, message: 'No admin account found for that email.' }, 404);

    const { data: linkData, error: lErr } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: redirectTo ? { redirectTo } : undefined,
    });
    const inviteLink = (linkData?.properties as { action_link?: string } | undefined)?.action_link ?? null;
    if (lErr || !inviteLink) {
      return j({ success: false, message: 'Could not generate link: ' + (lErr?.message || 'unknown') }, 400);
    }
    return j({ success: true, inviteLink });
  } catch (e) {
    return j({ success: false, message: String((e as Error)?.message || e) }, 500);
  }
});
