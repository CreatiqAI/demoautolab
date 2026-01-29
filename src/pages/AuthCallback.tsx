import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useDeviceSession } from '@/hooks/useDeviceSession';
import { supabase } from '@/lib/supabase';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { checkAndCreateProfile, createDeviceSession } = useAuth();
  const { deviceFingerprint, deviceInfo } = useDeviceSession();
  const [status, setStatus] = useState('Processing login...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check for OAuth errors in URL parameters
        const errorParam = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        if (errorParam) {
          console.error('OAuth error:', { errorParam, errorDescription });
          let errorMessage = errorDescription?.replace(/\+/g, ' ') || errorParam;

          if (errorDescription?.includes('Database error saving new user')) {
            errorMessage = 'Database error: Unable to create user. Please check Supabase configuration.';
          }

          setError(errorMessage);
          setStatus('Authentication failed');
          return;
        }

        setStatus('Completing authentication...');

        // Wait for Supabase to process the OAuth callback and establish session
        // The tokens are in the URL hash, Supabase needs to exchange them
        let session = null;
        let attempts = 0;
        const maxAttempts = 10;

        while (!session && attempts < maxAttempts) {
          attempts++;
          console.log(`Checking for session... attempt ${attempts}`);

          // Try to get the session
          const { data, error: sessionError } = await supabase.auth.getSession();

          if (sessionError) {
            console.error('Session error:', sessionError);
          }

          if (data?.session) {
            session = data.session;
            console.log('Session found:', session.user.email);
            break;
          }

          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        if (!session) {
          console.error('No session established after OAuth callback');
          setError('Login failed. Could not establish session. Please try again.');
          setStatus('Authentication failed');
          return;
        }

        setStatus('Checking your profile...');

        // Now check if user has a complete profile
        const { isNewUser, error: profileError } = await checkAndCreateProfile();

        if (profileError && profileError.message !== 'No user logged in') {
          console.error('Error checking profile:', profileError);
          setError(profileError.message || 'Error processing login');
          setStatus('Error processing login');
          return;
        }

        if (isNewUser) {
          // User needs to complete registration
          setStatus('Redirecting to complete registration...');
          navigate('/auth?step=complete-profile');
        } else {
          // Existing user with complete profile
          setStatus('Login successful! Redirecting...');

          // Create device session
          try {
            await createDeviceSession(deviceFingerprint, deviceInfo);
          } catch (e) {
            console.log('Device session creation skipped:', e);
          }

          navigate('/');
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setError('An unexpected error occurred during login. Please try again.');
        setStatus('Error during login');
      }
    };

    handleCallback();
  }, [navigate, searchParams, checkAndCreateProfile, createDeviceSession, deviceFingerprint, deviceInfo]);

  // Error state UI
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-md">
          <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {status}
          </h2>
          <p className="text-gray-600 mb-6">
            {error}
          </p>
          <Button
            onClick={() => navigate('/auth')}
            className="bg-lime-600 hover:bg-lime-700 text-white"
          >
            Back to Login
          </Button>
        </div>
      </div>
    );
  }

  // Loading state UI
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-lime-600 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {status}
        </h2>
        <p className="text-gray-500">
          Please wait while we set up your account...
        </p>
      </div>
    </div>
  );
}
