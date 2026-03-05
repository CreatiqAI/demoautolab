import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_ATTEMPTS = 5;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { phone, code } = await req.json();

    if (!phone || !code) {
      return new Response(
        JSON.stringify({ error: 'Phone and code are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedPhone = phone.replace(/[\s\-\+]/g, '');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Look up OTP record
    const { data: otpRecord, error: fetchError } = await supabase
      .from('phone_otp_verifications')
      .select('*')
      .eq('phone', normalizedPhone)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      throw new Error(`Database error: ${fetchError.message}`);
    }

    if (!otpRecord) {
      return new Response(
        JSON.stringify({ valid: false, error: 'No OTP found. Please request a new code.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check max attempts
    if (otpRecord.attempts >= MAX_ATTEMPTS) {
      // Delete the OTP record
      await supabase.from('phone_otp_verifications').delete().eq('id', otpRecord.id);
      return new Response(
        JSON.stringify({ valid: false, error: 'Too many attempts. Please request a new code.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check expiry
    if (new Date() > new Date(otpRecord.expires_at)) {
      await supabase.from('phone_otp_verifications').delete().eq('id', otpRecord.id);
      return new Response(
        JSON.stringify({ valid: false, error: 'OTP has expired. Please request a new code.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Increment attempts
    await supabase
      .from('phone_otp_verifications')
      .update({ attempts: otpRecord.attempts + 1 })
      .eq('id', otpRecord.id);

    // Verify code
    if (otpRecord.code !== code) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Invalid OTP code. Please try again.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // OTP is valid — delete the record
    await supabase.from('phone_otp_verifications').delete().eq('id', otpRecord.id);

    // Check if user exists by phone number
    let isNewUser = true;
    let existingUserEmail: string | null = null;

    const { data: existingCustomer } = await supabase
      .from('customer_profiles')
      .select('id, user_id, email')
      .eq('phone', normalizedPhone)
      .maybeSingle();

    if (existingCustomer?.user_id) {
      isNewUser = false;
      existingUserEmail = existingCustomer.email || null;
    }

    return new Response(
      JSON.stringify({
        valid: true,
        isNewUser,
        existingUserEmail,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to verify OTP' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
