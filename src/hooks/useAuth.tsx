
import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { deactivateDeviceSession } from '@/hooks/useSessionEnforcement';
import { clearDeviceFingerprint } from '@/utils/deviceFingerprint';

// Registration data for OTP-based signup
interface RegistrationData {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  carMakeId?: string;
  carMakeName?: string;
  carModelId?: string;
  carModelName?: string;
}

// Normalize phone: strip +, spaces, dashes for iSMS format (e.g. 60164502380)
const normalizePhone = (phone: string): string => phone.replace(/[\s\-\+]/g, '');

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  // Phone OTP methods (via iSMS Edge Function)
  sendPhoneOTP: (phone: string, options?: { testMode?: boolean }) => Promise<{ error: any }>;
  verifyPhoneOTP: (phone: string, token: string) => Promise<{ error: any; isNewUser?: boolean; existingUserEmail?: string; tokenHash?: string }>;
  signUpWithPhoneOTP: (phone: string, token: string, userData: RegistrationData) => Promise<{ error: any }>;
  // Sign in with magic link token (used after phone OTP verification for merchants)
  signInWithToken: (tokenHash: string) => Promise<{ error: any; userId?: string }>;
  // Email/Password sign in (used after phone OTP verification for existing users)
  signInWithPassword: (email: string, password: string) => Promise<{ error: any }>;
  // Google OAuth (FREE)
  signInWithGoogle: () => Promise<{ error: any }>;
  checkAndCreateProfile: () => Promise<{ isNewUser: boolean; error: any }>;
  completeGoogleRegistration: (userData: Omit<RegistrationData, 'email'>) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let authSubscription: any = null;

    const initializeAuth = async () => {
      try {
        // Get the current session first
        const { data: { session } } = await supabase.auth.getSession();

        if (isMounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }

        // Set up a very simple auth state listener - only respond to explicit events
        authSubscription = supabase.auth.onAuthStateChange((event, session) => {
          if (!isMounted) return;

          // ONLY logout on explicit signout - ignore all other events that might cause logout
          if (event === 'SIGNED_OUT') {
            setSession(null);
            setUser(null);
          } else if (event === 'SIGNED_IN' && session) {
            // Only update on successful sign in
            setSession(session);
            setUser(session.user);
          }
          // Ignore TOKEN_REFRESHED, USER_UPDATED, etc. to prevent accidental logouts
        });

      } catch (error) {
        // Don't logout on errors - keep user logged in
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      if (authSubscription?.data?.subscription) {
        authSubscription.data.subscription.unsubscribe();
      }
    };
  }, []);

  const signOut = async () => {
    // Deactivate device session before signing out
    await deactivateDeviceSession();
    clearDeviceFingerprint();
    // Clear any stored OTP data
    localStorage.removeItem('pending_phone_auth');
    await supabase.auth.signOut();
  };

  // ============================================
  // PHONE OTP METHODS (via iSMS Edge Function)
  // ============================================

  // Send OTP via iSMS SMS gateway (server-side Edge Function)
  const sendPhoneOTP = async (phone: string, options?: { testMode?: boolean }): Promise<{ error: any }> => {
    try {
      const { data, error } = await supabase.functions.invoke('send-otp-sms', {
        body: { phone: normalizePhone(phone), testMode: options?.testMode ?? false },
      });

      if (error) {
        return { error: { message: error.message || 'Failed to send OTP' } };
      }

      if (data?.error) {
        return { error: { message: data.error } };
      }

      return { error: null };
    } catch (error) {
      return { error };
    }
  };



  // Verify Phone OTP via server-side Edge Function
  const verifyPhoneOTP = async (phone: string, token: string): Promise<{
    error: any;
    isNewUser?: boolean;
    existingUserEmail?: string;
    tokenHash?: string;
  }> => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-otp-sms', {
        body: { phone: normalizePhone(phone), code: token },
      });

      if (error) {
        return { error: { message: error.message || 'Failed to verify OTP' } };
      }

      if (!data?.valid) {
        return { error: { message: data?.error || 'Invalid OTP code.' } };
      }

      return {
        error: null,
        isNewUser: data.isNewUser,
        existingUserEmail: data.existingUserEmail || undefined,
        tokenHash: data.tokenHash || undefined,
      };
    } catch (error) {
      return { error };
    }
  };

  // Sign in with magic link token (used after phone OTP verification for merchants)
  const signInWithToken = async (tokenHash: string): Promise<{ error: any; userId?: string }> => {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'magiclink',
      });
      if (error) return { error };
      if (data.session) {
        setSession(data.session);
        setUser(data.user);
      }
      localStorage.removeItem('pending_phone_auth');
      return { error: null, userId: data.user?.id };
    } catch (error) {
      return { error };
    }
  };

  // Sign in with email and password (used after phone OTP verification for existing users)
  const signInWithPassword = async (email: string, password: string): Promise<{ error: any }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return { error };
      }

      // Clear any pending phone OTP data on successful login
      localStorage.removeItem('pending_phone_auth');

      // Update auth state
      if (data.session) {
        setSession(data.session);
        setUser(data.user);
      }

      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  // Complete registration with Phone OTP (for new users)
  const signUpWithPhoneOTP = async (
    phone: string,
    token: string,
    userData: RegistrationData
  ): Promise<{ error: any }> => {
    try {
      // OTP was already verified server-side via verifyPhoneOTP

      // Create auth user with email (required by Supabase)
      // Use a generated email if not provided
      const authEmail = userData.email || `${phone.replace(/\D/g, '')}@phone.autolab.local`;

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: authEmail,
        password: `phone_${phone}_${Date.now()}`, // Random password (user will use phone OTP)
        options: {
          data: {
            phone: phone,
            full_name: userData.fullName,
            auth_method: 'phone_otp'
          }
        }
      });

      if (signUpError) {
        // If email already exists, try to link the phone
        if (signUpError.message?.includes('already registered')) {
          return { error: { message: 'This email is already registered. Please use Google sign-in or try a different email.' } };
        }
        return { error: signUpError };
      }

      if (!authData.user) {
        return { error: { message: 'Failed to create user account' } };
      }

      // Wait a moment for database triggers
      await new Promise(resolve => setTimeout(resolve, 500));

      // Create customer profile
      const { error: profileError } = await supabase
        .from('customer_profiles')
        .insert({
          user_id: authData.user.id,
          username: `user_${authData.user.id.slice(0, 8)}`,
          full_name: userData.fullName,
          phone: phone,
          email: userData.email,
          date_of_birth: userData.dateOfBirth || null,
          customer_type: 'normal',
          car_make_id: userData.carMakeId || null,
          car_make_name: userData.carMakeName || null,
          car_model_id: userData.carModelId || null,
          car_model_name: userData.carModelName || null
        });

      if (profileError) {
        // Profile might already exist from trigger, try update instead
        const { error: updateError } = await supabase
          .from('customer_profiles')
          .update({
            full_name: userData.fullName,
            phone: phone,
            email: userData.email,
            date_of_birth: userData.dateOfBirth || null,
            car_make_id: userData.carMakeId || null,
            car_make_name: userData.carMakeName || null,
            car_model_id: userData.carModelId || null,
            car_model_name: userData.carModelName || null
          })
          .eq('user_id', authData.user.id);

        if (updateError) {
        }
      }

      // Clear any pending auth data
      localStorage.removeItem('pending_phone_auth');

      // Update user state
      setUser(authData.user);
      setSession(authData.session);

      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  // ============================================
  // GOOGLE OAUTH METHODS (FREE via Supabase)
  // ============================================

  // Sign in with Google OAuth
  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      return { error };
    } catch (error) {
      return { error };
    }
  };

  // Check if user has a profile, create one if new
  const checkAndCreateProfile = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      if (!currentUser) {
        return { isNewUser: false, error: { message: 'No user logged in' } };
      }

      // Check if profile exists
      const { data: profile, error: profileError } = await supabase
        .from('customer_profiles')
        .select('id, full_name, phone')
        .eq('user_id', currentUser.id)
        .single();

      // Handle errors - treat 406 or any error as "new user" to allow registration
      if (profileError) {
        // PGRST116 = not found, which is expected for new users
        // 406 or other errors = assume new user to allow registration flow
        return { isNewUser: true, error: null };
      }

      // If no profile exists, user is new
      if (!profile) {
        return { isNewUser: true, error: null };
      }

      // Profile exists - check if it has required fields (phone)
      // If phone is missing, user needs to complete registration
      if (!profile.phone || profile.phone === '') {
        return { isNewUser: true, error: null };
      }

      return { isNewUser: false, error: null };
    } catch (error) {
      // On any error, treat as new user to allow registration
      return { isNewUser: true, error: null };
    }
  };

  // Complete registration after Google sign-in (collect additional details)
  const completeGoogleRegistration = async (userData: Omit<RegistrationData, 'email'>) => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      if (!currentUser) {
        return { error: { message: 'No user logged in' } };
      }

      // Get user's email from auth
      const userEmail = currentUser.email || '';
      const userName = currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || 'User';

      // Normalize phone
      const normalizedPhone = userData.phone ?
        (userData.phone.startsWith('+60') ? userData.phone : `+60${userData.phone.replace(/\D/g, '')}`)
        : '';

      // Check if profile already exists
      const { data: existingProfile } = await supabase
        .from('customer_profiles')
        .select('id')
        .eq('user_id', currentUser.id)
        .single();

      if (existingProfile) {
        // Update existing profile
        const { error: updateError } = await supabase
          .from('customer_profiles')
          .update({
            full_name: userData.fullName || userName,
            phone: normalizedPhone,
            date_of_birth: userData.dateOfBirth || null,
            car_make_id: userData.carMakeId || null,
            car_make_name: userData.carMakeName || null,
            car_model_id: userData.carModelId || null,
            car_model_name: userData.carModelName || null
          })
          .eq('user_id', currentUser.id);

        if (updateError) {
          return { error: updateError };
        }
      } else {
        // Create new profile
        const { error: profileError } = await supabase
          .from('customer_profiles')
          .insert({
            user_id: currentUser.id,
            username: `user_${currentUser.id.slice(0, 8)}`,
            full_name: userData.fullName || userName,
            phone: normalizedPhone,
            email: userEmail,
            date_of_birth: userData.dateOfBirth || null,
            customer_type: 'normal',
            car_make_id: userData.carMakeId || null,
            car_make_name: userData.carMakeName || null,
            car_model_id: userData.carModelId || null,
            car_model_name: userData.carModelName || null
          });

        if (profileError) {
          return { error: profileError };
        }
      }

      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const value = {
    user,
    session,
    loading,
    sendPhoneOTP,
    verifyPhoneOTP,
    signUpWithPhoneOTP,
    signInWithToken,
    signInWithPassword,
    signInWithGoogle,
    checkAndCreateProfile,
    completeGoogleRegistration,
    signOut
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
