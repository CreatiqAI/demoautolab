import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { generateDeviceFingerprint, getDeviceInfo } from '@/utils/deviceFingerprint';
import { toast } from 'sonner';

const SESSION_ID_KEY = 'autolab_session_id';
const POLL_INTERVAL_MS = 30_000; // 30 seconds

/**
 * Check if a session is still active in the database.
 * Returns false if session doesn't exist or is inactive.
 */
async function checkSessionActive(sessionId: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('user_sessions' as any)
      .select('is_active')
      .eq('id', sessionId)
      .maybeSingle();

    return (data as any)?.is_active === true;
  } catch {
    // Network error — don't force logout on transient failures
    return true;
  }
}

export function useSessionEnforcement() {
  const { user, signOut } = useAuth();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isSigningOutRef = useRef(false);

  const forceSignOut = useCallback(() => {
    if (isSigningOutRef.current) return;
    isSigningOutRef.current = true;
    localStorage.removeItem(SESSION_ID_KEY);
    toast.error('You have been signed out because your account was signed in on another device.');
    signOut();
  }, [signOut]);

  useEffect(() => {
    if (!user) {
      isSigningOutRef.current = false;
      return;
    }

    const sessionId = localStorage.getItem(SESSION_ID_KEY);
    if (!sessionId) return;

    let cancelled = false;

    // 1. Immediate validation on mount — catch stale sessions after refresh
    checkSessionActive(sessionId).then((active) => {
      if (!cancelled && !active) {
        forceSignOut();
      }
    });

    // 2. Realtime listener — instant notification when another device logs in
    const channel = supabase
      .channel(`session_enforce_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.new && (payload.new as any).is_active === false) {
            forceSignOut();
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    // 3. Polling fallback — reliable safety net every 30 seconds
    //    Catches cases where Realtime misses the event (network issues, tab suspended, etc.)
    const interval = setInterval(async () => {
      if (isSigningOutRef.current) return;
      const active = await checkSessionActive(sessionId);
      if (!active) {
        forceSignOut();
      }
    }, POLL_INTERVAL_MS);

    intervalRef.current = interval;

    return () => {
      cancelled = true;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [user, signOut, forceSignOut]);
}

/**
 * Register a new device session for the current user.
 * The DB trigger `invalidate_other_sessions` auto-deactivates all other sessions.
 * Must be called AFTER the user is authenticated (RLS requires auth.uid()).
 */
export async function registerDeviceSession(userId: string): Promise<{ error: any }> {
  const fingerprint = generateDeviceFingerprint();
  const deviceInfo = getDeviceInfo();

  // Verify the Supabase client has an active session (required for RLS)
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData?.session) {
    const err = 'No active Supabase session — cannot register device session';
    console.error('[Session]', err);
    return { error: { message: err } };
  }

  // Step 1: Deactivate all existing active sessions for this user
  // This must happen BEFORE insert to avoid the unique constraint violation
  // (idx_user_sessions_unique_active allows only one active session per user)
  await supabase
    .from('user_sessions' as any)
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('is_active', true);

  // Step 2: Insert the new active session
  const { data, error } = await supabase
    .from('user_sessions' as any)
    .insert({
      user_id: userId,
      device_fingerprint: fingerprint,
      device_info: deviceInfo,
      is_active: true,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[Session] Insert failed:', error.message, error.details, error.hint);
  }

  if (!error && data) {
    localStorage.setItem(SESSION_ID_KEY, (data as any).id);
    console.log('[Session] Registered device session:', (data as any).id);
  }

  return { error };
}

/**
 * Deactivate the current device session (called on logout).
 */
export async function deactivateDeviceSession(): Promise<void> {
  const sessionId = localStorage.getItem(SESSION_ID_KEY);
  if (sessionId) {
    await supabase
      .from('user_sessions' as any)
      .update({ is_active: false })
      .eq('id', sessionId);
    localStorage.removeItem(SESSION_ID_KEY);
  }
}
