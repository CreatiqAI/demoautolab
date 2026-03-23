import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { generateDeviceFingerprint, getDeviceInfo } from '@/utils/deviceFingerprint';
import { toast } from 'sonner';

const SESSION_ID_KEY = 'autolab_session_id';

export function useSessionEnforcement() {
  const { user, signOut } = useAuth();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isSigningOutRef = useRef(false);

  // Subscribe to session invalidation via Realtime
  useEffect(() => {
    if (!user) return;

    const sessionId = localStorage.getItem(SESSION_ID_KEY);
    if (!sessionId) return;

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
          if (payload.new && payload.new.is_active === false && !isSigningOutRef.current) {
            // This session was deactivated by another device logging in
            isSigningOutRef.current = true;
            toast.error('You have been signed out because your account was signed in on another device.');
            localStorage.removeItem(SESSION_ID_KEY);
            signOut();
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, signOut]);
}

/**
 * Register a new device session for the current user.
 * The DB trigger `invalidate_other_sessions` auto-deactivates all other sessions.
 * Must be called AFTER the user is authenticated (RLS requires auth.uid()).
 */
export async function registerDeviceSession(userId: string): Promise<{ error: any }> {
  const fingerprint = generateDeviceFingerprint();
  const deviceInfo = getDeviceInfo();

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

  if (!error && data) {
    localStorage.setItem(SESSION_ID_KEY, (data as any).id);
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
