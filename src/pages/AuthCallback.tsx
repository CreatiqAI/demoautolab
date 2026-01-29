import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { checkAndCreateProfile } = useAuth();
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
          setError(errorMessage);
          setStatus('Authentication failed');
          return;
        }

        setStatus('Completing authentication...');

        // Check if there's a hash fragment with tokens (implicit grant flow)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken) {
          console.log('Found access token in URL hash, setting session...');

          // Set the session manually using the tokens from the hash
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || ''
          });

          if (sessionError) {
            console.error('Error setting session:', sessionError);
            setError('Failed to establish session. Please try again.');
            setStatus('Authentication failed');
            return;
          }

          if (data.session) {
            console.log('Session established successfully:', data.session.user.email);

            // Clear the hash from URL for cleaner look
            window.history.replaceState(null, '', window.location.pathname);

            // Continue with profile check
            await handleProfileCheck();
            return;
          }
        }

        // Fallback: Try to get existing session
        console.log('No hash tokens, checking for existing session...');
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          console.log('Found existing session:', session.user.email);
          await handleProfileCheck();
          return;
        }

        // No session found
        console.error('No session could be established');
        setError('Login failed. Could not establish session. Please try again.');
        setStatus('Authentication failed');

      } catch (err) {
        console.error('Auth callback error:', err);
        setError('An unexpected error occurred during login. Please try again.');
        setStatus('Error during login');
      }
    };

    const handleProfileCheck = async () => {
      setStatus('Checking your profile...');

      const { isNewUser, error: profileError } = await checkAndCreateProfile();

      if (profileError && profileError.message !== 'No user logged in') {
        console.error('Error checking profile:', profileError);
        setError(profileError.message || 'Error processing login');
        setStatus('Error processing login');
        return;
      }

      if (isNewUser) {
        setStatus('Redirecting to complete registration...');
        navigate('/auth?step=complete-profile');
      } else {
        setStatus('Login successful! Redirecting...');
        navigate('/');
      }
    };

    handleCallback();
  }, [navigate, searchParams, checkAndCreateProfile]);

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
