// Consolidated supabase client for better module resolution
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { customAuthStorage } from '@/utils/customAuthStorage';

const SUPABASE_URL = "https://znxtabtksamgdsylagfo.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpueHRhYnRrc2FtZ2RzeWxhZ2ZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MzcwMDMsImV4cCI6MjA3MjIxMzAwM30.ovzGbdzB42XPWenj6bS3bhTddSV5B_SMvtvQqlh4Kak";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: customAuthStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: 'implicit'
  }
});