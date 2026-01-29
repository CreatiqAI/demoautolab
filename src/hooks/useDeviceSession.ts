import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface DeviceInfo {
  browser: string;
  os: string;
  screenResolution: string;
  timezone: string;
  language: string;
}

interface UseDeviceSessionReturn {
  deviceFingerprint: string;
  deviceInfo: DeviceInfo;
  createSession: (userId: string) => Promise<boolean>;
  invalidateSession: () => Promise<void>;
  isSessionActive: boolean;
}

// Generate a simple device fingerprint based on browser characteristics
const generateFingerprint = (): string => {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 'unknown',
    (navigator as any).deviceMemory || 'unknown'
  ];

  // Simple hash function
  const str = components.join('|');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Convert to hex string and make it longer by adding timestamp segment
  const hexHash = Math.abs(hash).toString(16);
  const storedId = localStorage.getItem('device_session_id');

  if (storedId) {
    return storedId;
  }

  // Generate new ID if not exists
  const newId = `${hexHash}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
  localStorage.setItem('device_session_id', newId);
  return newId;
};

// Get device info for display/logging
const getDeviceInfo = (): DeviceInfo => {
  const ua = navigator.userAgent;

  // Detect browser
  let browser = 'Unknown';
  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';

  // Detect OS
  let os = 'Unknown';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  return {
    browser,
    os,
    screenResolution: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language
  };
};

export function useDeviceSession(): UseDeviceSessionReturn {
  const [deviceFingerprint] = useState<string>(() => generateFingerprint());
  const [deviceInfo] = useState<DeviceInfo>(() => getDeviceInfo());
  const [isSessionActive, setIsSessionActive] = useState(false);

  // Create a new session for the user
  const createSession = useCallback(async (userId: string): Promise<boolean> => {
    try {
      // First, deactivate any existing sessions for this user
      // The trigger will handle this, but we do it explicitly too
      await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('is_active', true);

      // Create new session
      const { error } = await supabase
        .from('user_sessions')
        .insert({
          user_id: userId,
          device_fingerprint: deviceFingerprint,
          device_info: deviceInfo,
          is_active: true
        });

      if (error) {
        console.error('Error creating session:', error);
        return false;
      }

      setIsSessionActive(true);
      return true;
    } catch (error) {
      console.error('Error creating session:', error);
      return false;
    }
  }, [deviceFingerprint, deviceInfo]);

  // Invalidate current session
  const invalidateSession = useCallback(async (): Promise<void> => {
    try {
      await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('device_fingerprint', deviceFingerprint)
        .eq('is_active', true);

      setIsSessionActive(false);
    } catch (error) {
      console.error('Error invalidating session:', error);
    }
  }, [deviceFingerprint]);

  // Check if current device has an active session
  useEffect(() => {
    const checkSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsSessionActive(false);
        return;
      }

      const { data } = await supabase
        .from('user_sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('device_fingerprint', deviceFingerprint)
        .eq('is_active', true)
        .single();

      setIsSessionActive(!!data);
    };

    checkSession();
  }, [deviceFingerprint]);

  return {
    deviceFingerprint,
    deviceInfo,
    createSession,
    invalidateSession,
    isSessionActive
  };
}

export default useDeviceSession;
