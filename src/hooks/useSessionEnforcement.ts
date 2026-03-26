import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { generateDeviceFingerprint, getDeviceInfo } from '@/utils/deviceFingerprint';

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

  const forceSignOut = useCallback(async () => {
    if (isSigningOutRef.current) return;
    isSigningOutRef.current = true;
    localStorage.removeItem(SESSION_ID_KEY);

    // Show a full-screen overlay instead of a tiny toast
    const overlay = document.createElement('div');
    overlay.id = 'force-logout-overlay';
    overlay.innerHTML = `
      <div style="position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);padding:16px;">
        <div style="background:white;border-radius:16px;padding:32px 24px;max-width:360px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
          <div style="width:48px;height:48px;border-radius:50%;background:#fef2f2;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
          <h2 style="font-size:18px;font-weight:700;color:#0f172a;margin:0 0 8px;">Session Expired</h2>
          <p style="font-size:14px;color:#64748b;margin:0 0 20px;line-height:1.5;">Your account was signed in on another device. You have been logged out for security.</p>
          <div style="width:24px;height:24px;border:3px solid #e2e8f0;border-top-color:#0f172a;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto;"></div>
          <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    await signOut();
    // Brief delay so user sees the message before redirect
    setTimeout(() => { window.location.href = '/'; }, 2000);
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
