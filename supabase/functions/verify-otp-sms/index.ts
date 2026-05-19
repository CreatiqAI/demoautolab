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
    // customer_profiles stores phone with '+' prefix (e.g. +60165230268)
    // Try both formats to handle any inconsistency
    let isNewUser = true;
    let existingUserEmail: string | null = null;
    let existingUserId: string | null = null;

    const phoneWithPlus = normalizedPhone.startsWith('+') ? normalizedPhone : `+${normalizedPhone}`;
    const phoneWithoutPlus = normalizedPhone.replace(/^\+/, '');

    const { data: existingCustomer } = await supabase
      .from('customer_profiles')
      .select('id, user_id, email')
      .or(`phone.eq.${phoneWithPlus},phone.eq.${phoneWithoutPlus}`)
      .maybeSingle();

    if (existingCustomer?.user_id) {
      existingUserId = existingCustomer.user_id;
      existingUserEmail = existingCustomer.email || null;
    } else {
      // Fallback: a partner (vendor) may have signed up before we started
      // creating customer_profiles for them. Look them up via the vendors
      // table directly so they can still log in.
      const { data: existingVendor } = await supabase
        .from('vendors')
        .select('user_id, contact_email')
        .or(`contact_phone.eq.${phoneWithPlus},contact_phone.eq.${phoneWithoutPlus}`)
        .maybeSingle();

      if (existingVendor?.user_id) {
        existingUserId = existingVendor.user_id;
        // Prefer the auth.users email (auth identity) over vendors.contact_email
        // which is just a notification address.
        const { data: authUserData } = await supabase.auth.admin.getUserById(existingVendor.user_id);
        existingUserEmail = authUserData?.user?.email || existingVendor.contact_email || null;
      }
    }

    if (existingUserId && existingUserEmail) {
      isNewUser = false;

      // Generate a magic link token for passwordless sign-in
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: existingUserEmail,
      });

      if (!linkError && linkData?.properties?.hashed_token) {
        return new Response(
          JSON.stringify({
            valid: true,
            isNewUser: false,
            existingUserEmail,
            tokenHash: linkData.properties.hashed_token,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
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
