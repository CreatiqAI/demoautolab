import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2, Lock, Eye, EyeOff } from 'lucide-react';

// Landing page for the one-time set-password (recovery) link handed to a newly
// invited admin. The link establishes a recovery session; here they choose their
// own password. No password is ever known to whoever created the account.
export default function SetAdminPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState<'checking' | 'ok' | 'invalid'>('checking');
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let settled = false;
    const accept = (userEmail: string | null) => {
      settled = true;
      setEmail(userEmail);
      setReady('ok');
    };

    // supabase-js parses the recovery token in the URL hash and emits a session.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) accept(session.user.email ?? null);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) accept(data.session.user.email ?? null);
    });

    // If no valid session materialises shortly, the link is bad/expired.
    const t = setTimeout(() => {
      if (!settled) setReady('invalid');
    }, 3000);
    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(t);
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      toast.error('Passwords do not match.');
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Password set. Welcome to the admin panel!');
    navigate('/admin');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8] px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <img src="/12v-logo.png" alt="12V" className="h-9 w-auto" />
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-7">
          {ready === 'invalid' ? (
            <div className="text-center">
              <div className="text-4xl mb-3">⏳</div>
              <h1 className="text-lg font-heading font-bold uppercase tracking-tight text-gray-900 mb-2">
                Link invalid or expired
              </h1>
              <p className="text-sm text-gray-500 mb-5">
                This set-password link is no longer valid. Ask the admin who invited you to send a fresh one.
              </p>
              <button
                onClick={() => navigate('/admin')}
                className="text-sm font-medium text-gray-700 hover:text-lime-600"
              >
                Go to admin sign in
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-heading font-bold uppercase tracking-tight text-gray-900 mb-1">
                Set your password
              </h1>
              <p className="text-sm text-gray-500 mb-5">
                {email ? (
                  <>Create a password for <span className="font-medium text-gray-700">{email}</span>.</>
                ) : (
                  'Create a password for your admin account.'
                )}
              </p>

              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-600">New password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type={show ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      disabled={ready !== 'ok'}
                      placeholder="At least 8 characters"
                      className="w-full pl-9 pr-9 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 disabled:bg-gray-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShow((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
                    >
                      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-600">Confirm password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type={show ? 'text' : 'password'}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                      minLength={8}
                      disabled={ready !== 'ok'}
                      placeholder="Re-enter password"
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 disabled:bg-gray-50"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={saving || ready !== 'ok'}
                  className="w-full bg-gray-900 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-lime-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {ready === 'checking' ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Verifying link…</>
                  ) : saving ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Saving…</>
                  ) : (
                    'Set password & continue'
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
