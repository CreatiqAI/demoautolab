import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateVendorPayload {
  admin_id: string;
  username: string;
  password: string;
  business_name: string;
  contact_person: string;
  contact_email: string;
  contact_phone?: string;
  business_registration_no?: string | null;
  tax_id?: string | null;
  description?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postcode?: string | null;
  bank_name?: string | null;
  bank_account_name?: string | null;
  bank_account_number?: string | null;
  is_sst_registered?: boolean;
  commission_rate?: number;
  default_shipping_fee?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as CreateVendorPayload;

    if (!body.username || !body.password || !body.business_name || !body.contact_person || !body.contact_email) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing required fields.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (body.password.length < 8) {
      return new Response(
        JSON.stringify({ success: false, message: 'Password must be at least 8 characters.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sanitizedUsername = body.username.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9_-]{2,31}$/.test(sanitizedUsername)) {
      return new Response(
        JSON.stringify({ success: false, message: 'Username must be 3-32 chars, lowercase letters/digits/underscore/dash, starting with a letter or digit.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Authorize the CALLER from their JWT (not a client-supplied admin_id).
    const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '');
    const { data: { user }, error: authErr } = await supabase.auth.getUser(jwt);
    const callerRole = (user?.app_metadata as Record<string, unknown> | null)?.role;
    if (authErr || !user || !['super_admin', 'admin', 'support'].includes(callerRole as string)) {
      return new Response(
        JSON.stringify({ success: false, message: 'Admin privileges required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Check username uniqueness
    const { data: existing } = await supabase
      .from('vendors')
      .select('id')
      .ilike('username', sanitizedUsername)
      .maybeSingle();
    if (existing) {
      return new Response(
        JSON.stringify({ success: false, message: 'Username already taken.' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Create the Supabase Auth user with a synthetic email keyed off
    //    the username. email_confirm=true so the partner can sign in
    //    immediately with no verification roundtrip.
    const authEmail = `${sanitizedUsername}@partner.autolab.local`;
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: authEmail,
      password: body.password,
      email_confirm: true,
      user_metadata: {
        username: sanitizedUsername,
        role: 'vendor',
        created_by_admin: body.admin_id,
      },
    });

    if (authError || !authData?.user) {
      return new Response(
        JSON.stringify({ success: false, message: authError?.message ?? 'Could not create auth user.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const partnerUserId = authData.user.id;

    // 4. Insert vendors row in APPROVED state
    const { data: vendorRow, error: vendorError } = await supabase
      .from('vendors')
      .insert({
        user_id: partnerUserId,
        username: sanitizedUsername,
        business_name: body.business_name.trim(),
        contact_person: body.contact_person.trim(),
        contact_email: body.contact_email.trim(),
        contact_phone: body.contact_phone?.trim() || null,
        business_registration_no: body.business_registration_no?.trim() || null,
        tax_id: body.tax_id?.trim() || null,
        description: body.description?.trim() || null,
        address: body.address?.trim() || null,
        city: body.city?.trim() || null,
        state: body.state?.trim() || null,
        postcode: body.postcode?.trim() || null,
        bank_name: body.bank_name?.trim() || null,
        bank_account_name: body.bank_account_name?.trim() || null,
        bank_account_number: body.bank_account_number?.trim() || null,
        is_sst_registered: body.is_sst_registered ?? false,
        commission_rate: typeof body.commission_rate === 'number' ? body.commission_rate : 8,
        default_shipping_fee: typeof body.default_shipping_fee === 'number' ? body.default_shipping_fee : 0,
        status: 'APPROVED',
        approved_at: new Date().toISOString(),
        approved_by: body.admin_id,
      })
      .select('id')
      .single();

    if (vendorError) {
      // Rollback auth user so we don't leave orphan accounts
      await supabase.auth.admin.deleteUser(partnerUserId);
      return new Response(
        JSON.stringify({ success: false, message: `Could not create vendor row: ${vendorError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        vendor_id: (vendorRow as any).id,
        user_id: partnerUserId,
        username: sanitizedUsername,
        login_email: authEmail,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, message: err.message ?? 'Unexpected error.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
