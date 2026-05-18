// supabase/functions/get-bulk-import-logs/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json() as { admin_id: string; limit?: number };
    if (!body.admin_id) {
      return new Response(JSON.stringify({ error: 'admin_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: admin } = await supabase
      .from('admin_profiles')
      .select('id, is_active')
      .eq('id', body.admin_id)
      .maybeSingle<{ id: string; is_active: boolean | null }>();
    if (!admin || admin.is_active === false) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data, error } = await supabase
      .from('bulk_import_logs')
      .select('*')
      .order('run_at', { ascending: false })
      .limit(body.limit ?? 50);
    if (error) throw error;
    return new Response(JSON.stringify({ logs: data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
