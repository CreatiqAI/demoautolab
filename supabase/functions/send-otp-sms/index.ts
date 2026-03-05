import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { phone } = await req.json();

    if (!phone) {
      return new Response(
        JSON.stringify({ error: 'Phone number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize phone number: remove +, spaces, dashes — iSMS expects format like 60164502380
    const normalizedPhone = phone.replace(/[\s\-\+]/g, '');

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

    // Store OTP in database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Delete any existing OTPs for this phone (only latest matters)
    await supabase
      .from('phone_otp_verifications')
      .delete()
      .eq('phone', normalizedPhone);

    // Insert new OTP
    const { error: insertError } = await supabase
      .from('phone_otp_verifications')
      .insert({
        phone: normalizedPhone,
        code,
        attempts: 0,
        expires_at: expiresAt,
      });

    if (insertError) {
      throw new Error(`Failed to store OTP: ${insertError.message}`);
    }

    // Send SMS via iSMS.com.my
    const ismsUsername = Deno.env.get('ISMS_USERNAME');
    const ismsPassword = Deno.env.get('ISMS_PASSWORD');
    const ismsSenderId = Deno.env.get('ISMS_SENDER_ID') || '63001';

    if (!ismsUsername || !ismsPassword) {
      throw new Error('iSMS credentials not configured');
    }

    const message = `Your AutoLab verification code is: ${code}. Valid for 5 minutes.`;

    const params = new URLSearchParams({
      un: ismsUsername,
      pwd: ismsPassword,
      dstno: normalizedPhone,
      msg: message,
      type: '1',
      agreedterm: 'YES',
      sendid: ismsSenderId,
    });

    const smsResponse = await fetch('https://www.isms.com.my/isms_send_all_id.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const smsResult = await smsResponse.text();

    // iSMS returns numeric codes: 2000 = success, negative = error
    // Check if the response indicates success
    if (smsResult.trim().startsWith('-')) {
      throw new Error(`iSMS error: ${smsResult.trim()}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'OTP sent successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to send OTP' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
