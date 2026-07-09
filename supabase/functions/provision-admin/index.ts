import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const ALLOWED_ROLES = ['admin', 'support'];

// A strong throwaway password so the account is never logged into with a known
// secret — the invited admin sets their own via the returned set-password link.
function randomPassword(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return 'Aa1!' + btoa(String.fromCharCode(...bytes)).replace(/[^a-zA-Z0-9]/g, '').slice(0, 28) + 'z9';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const j = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(url, serviceKey);

    // Authorize the CALLER: must be a signed-in super_admin/admin.
    const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '');
    const { data: { user }, error: uErr } = await admin.auth.getUser(jwt);
    if (uErr || !user) return j({ success: false, message: 'Unauthorized' }, 401);
    const callerRole = (user.app_metadata as Record<string, unknown> | null)?.role;
    if (callerRole !== 'super_admin' && callerRole !== 'admin') {
      return j({ success: false, message: 'Admin privileges required' }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    const fullName = String(body.fullName || '').trim();
    const role = ALLOWED_ROLES.includes(body.role) ? body.role : 'admin';
    const redirectTo = String(body.redirectTo || '').trim() || undefined;
    // Business-logic failures return 200 with { success:false } so the UI can show
    // the message (supabase-js hides the body of non-2xx responses).
    if (!email || !fullName) {
      return j({ success: false, message: 'Email and full name are required.' });
    }

    // Try to create the real Supabase Auth user with the admin role + a random password.
    const { error: cErr } = await admin.auth.admin.createUser({
      email,
      password: randomPassword(),
      email_confirm: true,
      user_metadata: { full_name: fullName },
      app_metadata: { role, provider: 'email', providers: ['email'] },
    });

    let alreadyExisted = false;
    if (cErr) {
      const msg = (cErr.message || '').toLowerCase();
      const exists = msg.includes('already') || msg.includes('registered') || msg.includes('exists');
      if (!exists) return j({ success: false, message: cErr.message });
      // Email already exists — only proceed if it's already an admin; otherwise block.
      const { data: prof } = await admin
        .from('admin_profiles')
        .select('id')
        .eq('username', email)
        .maybeSingle();
      if (!prof) {
        return j({ success: false, message: 'That email already belongs to a non-admin account. Use a different email.' });
      }
      alreadyExisted = true;
    } else {
      // New account → mirror into admin_profiles so the Staff list shows them.
      await admin
        .from('admin_profiles')
        .insert({ username: email, full_name: fullName, role, is_active: true, password_hash: 'supabase_auth' });
    }

    // Generate a one-time set-password (recovery) link to hand to the invitee.
    const { data: linkData, error: lErr } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: redirectTo ? { redirectTo } : undefined,
    });
    const inviteLink = (linkData?.properties as { action_link?: string } | undefined)?.action_link ?? null;
    if (lErr || !inviteLink) {
      return j({
        success: true,
        inviteLink: null,
        message: 'Account ready, but the invite link could not be generated: ' + (lErr?.message || 'unknown'),
      });
    }

    return j({
      success: true,
      inviteLink,
      message: alreadyExisted
        ? 'That admin already existed — generated a fresh set-password link.'
        : 'Admin invited',
    });
  } catch (e) {
    return j({ success: false, message: String((e as Error)?.message || e) }, 500);
  }
});
