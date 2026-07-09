import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Eye, EyeOff, ArrowRight } from 'lucide-react';

// Dedicated, unlinked admin sign-in portal. Kept off the public /auth page so
// the admin panel isn't advertised to customers. NOTE: this is hygiene, not a
// security boundary — real admin authorization is a separate (pending) rebuild.
export default function AdminLogin({ onAuthenticated }: { onAuthenticated?: () => void } = {}) {
  const navigate = useNavigate();
  // When rendered inside the admin guard, re-check the session in place;
  // otherwise (standalone) route to the dashboard.
  const afterLogin = () => (onAuthenticated ? onAuthenticated() : navigate('/admin'));
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim() || !form.password) {
      toast.error('Please enter both email and password');
      return;
    }
    const email = form.email.trim().toLowerCase();
    setLoading(true);
    try {
      // Real Supabase Auth session — the JWT's app_metadata.role is what the
      // route guard and RLS check via is_admin().
      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email,
        password: form.password,
      });
      if (authErr || !authData?.user) {
        toast.error('Invalid credentials');
        setLoading(false);
        return;
      }
      const role = (authData.user.app_metadata as any)?.role as string | undefined;
      if (!role || !['super_admin', 'admin', 'support'].includes(role)) {
        // A non-admin account (e.g. a customer) must not enter the panel.
        await supabase.auth.signOut();
        localStorage.removeItem('admin_user');
        toast.error('This account does not have admin access.');
        setLoading(false);
        return;
      }
      // Mirror admin_profiles.id (not the auth uid) so the audit log FK and edge
      // functions resolve correctly. The route guard re-affirms this too.
      const { data: ctxData } = await supabase.rpc('get_admin_context' as any);
      const ctx = (ctxData ?? null) as { id?: string; username?: string; full_name?: string; role?: string } | null;
      localStorage.setItem('admin_user', JSON.stringify({
        id: ctx?.id || authData.user.id,
        auth_id: authData.user.id,
        username: ctx?.username || email,
        role: ctx?.role || role,
        full_name: ctx?.full_name || (authData.user.user_metadata as any)?.full_name || email,
      }));
      toast.success(`Welcome back, ${(authData.user.user_metadata as any)?.full_name || 'Admin'}!`);
      afterLogin();
    } catch {
      toast.error('An error occurred. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        {/* Wordmark */}
        <div className="flex items-center justify-center gap-2.5 mb-8 select-none">
          <img src="/12v-logo.png" alt="12V" className="h-8 w-auto object-contain" />
          <span className="text-gray-400 text-xs uppercase tracking-[0.25em] border-l border-gray-300 pl-2.5">
            Admin
          </span>
        </div>

        <div className="bg-white border border-gray-200/80 rounded-2xl p-7 shadow-[0_18px_50px_-28px_rgba(0,0,0,0.25)]">
          <div className="flex items-center gap-2.5 mb-1">
            <span className="h-9 w-9 rounded-lg bg-lime-50 border border-lime-200 flex items-center justify-center">
              <Shield className="h-4.5 w-4.5 text-lime-600" />
            </span>
            <div>
              <h1 className="text-gray-900 font-heading font-bold uppercase tracking-tight text-lg leading-none">Admin Portal</h1>
              <p className="text-gray-500 text-xs mt-1">Sign in to the 12V control panel</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 mt-6">
            <div className="space-y-1.5">
              <Label htmlFor="admin-email" className="text-gray-700 text-sm font-medium">Email</Label>
              <Input
                id="admin-email"
                type="email"
                autoComplete="username"
                placeholder="name@company.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                className="h-11 border-gray-200 focus:border-lime-500 focus:ring-lime-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="admin-password" className="text-gray-700 text-sm font-medium">Password</Label>
              <div className="relative">
                <Input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  className="h-11 pr-10 border-gray-200 focus:border-lime-500 focus:ring-lime-500"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-gray-400"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-gray-900 hover:bg-lime-600 text-white font-semibold rounded-lg transition-colors"
            >
              {loading ? 'Signing in…' : (<>Sign In<ArrowRight className="h-4 w-4 ml-2" /></>)}
            </Button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6">
            Admin accounts are provisioned by the master admin.
          </p>
        </div>

        <button
          onClick={() => navigate('/')}
          className="w-full text-center text-gray-400 hover:text-gray-600 text-xs mt-6 transition-colors"
        >
          ← Back to store
        </button>
      </div>
    </div>
  );
}
