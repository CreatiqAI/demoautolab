import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeletePayload {
  admin_id: string;
  vendor_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
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

    const body = (await req.json()) as DeletePayload;
    if (!body.vendor_id) {
      return new Response(
        JSON.stringify({ success: false, message: 'vendor_id is required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Load the vendor
    const { data: vendor, error: vErr } = await supabase
      .from('vendors')
      .select('id, user_id, business_name')
      .eq('id', body.vendor_id)
      .maybeSingle();
    if (vErr || !vendor) {
      return new Response(
        JSON.stringify({ success: false, message: 'Vendor not found.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Block deletion if there's financial / fulfilment history we can't safely drop
    const { count: ledgerCount } = await supabase
      .from('vendor_sales_ledger')
      .select('id', { count: 'exact', head: true })
      .eq('vendor_id', body.vendor_id);
    if ((ledgerCount ?? 0) > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Vendor has ledger history. Suspend the account instead of deleting to preserve audit trail.',
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { count: payoutCount } = await supabase
      .from('vendor_payouts')
      .select('id', { count: 'exact', head: true })
      .eq('vendor_id', body.vendor_id);
    if ((payoutCount ?? 0) > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Vendor has payout records. Suspend the account instead of deleting.',
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { count: activeFulfilCount } = await supabase
      .from('vendor_fulfilments')
      .select('id', { count: 'exact', head: true })
      .eq('vendor_id', body.vendor_id)
      .not('status', 'in', '("CANCELLED")');
    if ((activeFulfilCount ?? 0) > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Vendor has active fulfilments. Cancel them or suspend the vendor instead.',
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Cascade clean — orders/components/products keep their vendor_id set to NULL
    //    (FKs use ON DELETE SET NULL), so historical orders read as "AutoLab".
    //    Drop vendor's components + their cancelled fulfilments + the vendor row.
    await supabase.from('vendor_fulfilments').delete().eq('vendor_id', body.vendor_id);
    await supabase.from('component_library').delete().eq('vendor_id', body.vendor_id);
    // products_new.vendor_id uses SET NULL, so we leave them; admin can clean up manually
    // if the user wants AutoLab to stop showing those products.

    const { error: vendorDelErr } = await supabase
      .from('vendors')
      .delete()
      .eq('id', body.vendor_id);
    if (vendorDelErr) {
      return new Response(
        JSON.stringify({ success: false, message: `Could not delete vendor row: ${vendorDelErr.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Best-effort delete of the linked auth user. Failure here is non-fatal —
    //    the orphan auth row can be cleaned manually if needed.
    let authDeleted = false;
    if (vendor.user_id) {
      const { error: authErr } = await supabase.auth.admin.deleteUser(vendor.user_id);
      authDeleted = !authErr;
    }

    return new Response(
      JSON.stringify({
        success: true,
        vendor_id: body.vendor_id,
        business_name: (vendor as any).business_name,
        auth_user_deleted: authDeleted,
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
