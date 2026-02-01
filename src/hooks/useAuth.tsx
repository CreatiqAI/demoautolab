
import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

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

// Store for simulated OTP codes (in production, this would be handled by Twilio/SMS provider)
const otpStore: Map<string, { code: string; expiresAt: number; userId?: string }> = new Map();

// Generate a random 6-digit OTP
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  // Phone OTP methods (simulated/dummy for testing)
  sendPhoneOTP: (phone: string) => Promise<{ error: any; code?: string }>;
  verifyPhoneOTP: (phone: string, token: string) => Promise<{ error: any; isNewUser?: boolean }>;
  signUpWithPhoneOTP: (phone: string, token: string, userData: RegistrationData) => Promise<{ error: any }>;
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

          console.log('Auth event:', event);

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
        console.error('Auth initialization error:', error);
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
    // Clear any stored OTP data
    localStorage.removeItem('pending_phone_auth');
    await supabase.auth.signOut();
  };

  // ============================================
  // PHONE OTP METHODS (Simulated/Dummy for testing)
  // In production, replace with Twilio or other SMS provider
  // ============================================

  // Send simulated OTP to phone number
  const sendPhoneOTP = async (phone: string): Promise<{ error: any; code?: string }> => {
    try {
      // Generate OTP code
      const code = generateOTP();
      const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes expiry

      // Store OTP in memory (in production, this would be stored server-side)
      otpStore.set(phone, { code, expiresAt });

      // Also store in localStorage for persistence across page reloads (development only)
      localStorage.setItem('pending_phone_auth', JSON.stringify({
        phone,
        code,
        expiresAt
      }));

      console.log(`[DEV] OTP for ${phone}: ${code}`);

      // In production, you would call Twilio/SMS API here:
      // await twilioClient.messages.create({
      //   body: `Your AutoLab verification code is: ${code}`,
      //   to: phone,
      //   from: TWILIO_PHONE_NUMBER
      // });

      return { error: null, code }; // Return code for testing purposes
    } catch (error) {
      console.error('Error sending OTP:', error);
      return { error };
    }
  };

  // Verify Phone OTP - handles both login and registration
  const verifyPhoneOTP = async (phone: string, token: string): Promise<{ error: any; isNewUser?: boolean }> => {
    try {
      // Get stored OTP
      let storedOTP = otpStore.get(phone);

      // Fallback to localStorage
      if (!storedOTP) {
        const stored = localStorage.getItem('pending_phone_auth');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.phone === phone) {
            storedOTP = parsed;
          }
        }
      }

      if (!storedOTP) {
        return { error: { message: 'No OTP found. Please request a new code.' } };
      }

      // Check if OTP is expired
      if (Date.now() > storedOTP.expiresAt) {
        otpStore.delete(phone);
        localStorage.removeItem('pending_phone_auth');
        return { error: { message: 'OTP has expired. Please request a new code.' } };
      }

      // Verify OTP code
      if (storedOTP.code !== token) {
        return { error: { message: 'Invalid OTP code. Please try again.' } };
      }

      // OTP is valid - check if user exists
      // First, try to sign in with phone (to check if user exists)
      const { data: existingCustomer } = await supabase
        .from('customer_profiles')
        .select('id, user_id')
        .eq('phone', phone)
        .single();

      if (existingCustomer?.user_id) {
        // Existing user - sign them in using a custom token or session
        // For now, we'll create a "phantom" session by setting user state directly
        // In production, you'd use Supabase's phone auth or custom JWT

        // Try to get the auth user
        const { data: authUser } = await supabase.auth.admin?.getUserById?.(existingCustomer.user_id) || { data: null };

        if (authUser?.user) {
          // For demo purposes, we'll sign in with a password-less approach
          // In production, implement proper phone auth with Supabase
          setUser(authUser.user as any);

          // Clear OTP data
          otpStore.delete(phone);
          localStorage.removeItem('pending_phone_auth');

          return { error: null, isNewUser: false };
        }

        // Fallback: Mark as existing user (they'll need to use Google sign-in)
        return { error: null, isNewUser: false };
      }

      // New user - keep OTP valid for registration completion
      return { error: null, isNewUser: true };
    } catch (error) {
      console.error('Error verifying OTP:', error);
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
      // Verify OTP one more time
      let storedOTP = otpStore.get(phone);
      if (!storedOTP) {
        const stored = localStorage.getItem('pending_phone_auth');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.phone === phone) {
            storedOTP = parsed;
          }
        }
      }

      if (!storedOTP || storedOTP.code !== token) {
        return { error: { message: 'Invalid or expired OTP. Please try again.' } };
      }

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
        console.error('Error creating customer profile:', profileError);
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
          console.error('Error updating customer profile:', updateError);
        }
      }

      // Clear OTP data
      otpStore.delete(phone);
      localStorage.removeItem('pending_phone_auth');

      // Update user state
      setUser(authData.user);
      setSession(authData.session);

      return { error: null };
    } catch (error) {
      console.error('Error completing phone registration:', error);
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
        console.log('Profile check result:', profileError.code, profileError.message);
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
      console.log('Profile check exception:', error);
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
          console.error('Error updating profile:', updateError);
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
          console.error('Error creating profile:', profileError);
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
