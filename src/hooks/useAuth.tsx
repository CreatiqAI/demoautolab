
import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (phone: string, password: string, username?: string) => Promise<{ error: any }>;
  signIn: (phone: string, password: string) => Promise<{ error: any }>;
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

  const signUp = async (phone: string, password: string, username?: string) => {
    // First check if username is already taken (if provided)
    if (username) {
      try {
        const { data: existingUser, error: checkError } = await supabase
          .from('customer_profiles')
          .select('id')
          .eq('username', username)
          .single();
          
        if (existingUser && !checkError) {
          return { error: { message: 'This username is already taken. Please choose a different one.' } };
        }
      } catch (error) {
        // If error is not found (PGRST116), that means username is available
        if (error && (error as any).code !== 'PGRST116') {
          console.error('Error checking username:', error);
        }
      }
    }

    const { data, error } = await supabase.auth.signUp({
      phone,
      password,
      options: {
        data: {
          phone_e164: phone,
          full_name: username || 'New User',
          username: username
        }
      }
    });

    // If auth user was created successfully, create customer profile
    if (!error && data.user) {
      try {
        // Wait a moment for any database triggers to run
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Create customer profile instead of general profile
        const { error: profileError } = await supabase
          .from('customer_profiles')
          .insert({
            user_id: data.user.id,
            username: username || `user_${data.user.id.slice(0, 8)}`,
            full_name: username || 'New User',
            phone: phone,
            phone_e164: phone,
            email: '', // Will be filled later by user
            customer_type: 'normal',
            is_phone_verified: false
          });

        if (profileError) {
          console.error('Error creating customer profile:', profileError);
          // Don't fail the signup if profile creation fails, just log it
        }
      } catch (profileError) {
        console.error('Error handling customer profile creation:', profileError);
      }
    }

    return { error };
  };

  const signIn = async (phone: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      phone,
      password
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
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
