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
    const { phone, testMode } = await req.json();

    if (!phone) {
      return new Response(
        JSON.stringify({ error: 'Phone number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize phone number: remove +, spaces, dashes (e.g. 60164502380)
    const normalizedPhone = phone.replace(/[\s\-\+]/g, '');

    // Generate 6-digit OTP (use fixed code in test mode)
    const code = testMode ? '123456' : Math.floor(100000 + Math.random() * 900000).toString();
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

    // Send SMS via OneWay SMS (skip in test mode to save credits)
    if (!testMode) {
      const apiUsername = Deno.env.get('ONEWAYSMS_API_USERNAME');
      const apiPassword = Deno.env.get('ONEWAYSMS_API_PASSWORD');
      const mtUrl = Deno.env.get('ONEWAYSMS_MT_URL') || 'https://gateway.onewaysms.com.my/api.aspx';

      if (!apiUsername || !apiPassword) {
        throw new Error('OneWay SMS credentials not configured');
      }

      const message = `RM0.00 Auto Lab : Your verification code is ${code}. Valid for 5 minutes.`;

      const params = new URLSearchParams({
        apiusername: apiUsername,
        apipassword: apiPassword,
        mobileno: normalizedPhone,
        senderid: 'INFO',
        languagetype: '1',
        message: message,
      });

      const smsResponse = await fetch(`${mtUrl}?${params.toString()}`);
      const smsResult = await smsResponse.text();
      const resultCode = parseInt(smsResult.trim(), 10);

      // OneWay SMS: positive value = success (MT ID), negative = error
      if (isNaN(resultCode) || resultCode < 0) {
        const errorMessages: Record<number, string> = {
          [-100]: 'Invalid API credentials',
          [-200]: 'Invalid sender ID',
          [-300]: 'Invalid phone number',
          [-400]: 'Invalid language type',
          [-500]: 'Invalid message characters',
          [-600]: 'Insufficient SMS credits',
        };
        throw new Error(errorMessages[resultCode] || `OneWay SMS error: ${smsResult.trim()}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: testMode ? 'Test OTP stored (123456)' : 'OTP sent successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to send OTP' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
