import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import AdminLogin from '@/pages/AdminLogin';

// Access is decided by the REAL Supabase session's admin role (JWT app_metadata),
// read from the app's already-initialized auth provider — never from a stale
// localStorage blob. localStorage is only a UI mirror of the verified session.
interface ProtectedAdminRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export default function ProtectedAdminRoute({
  children,
  allowedRoles = ['super_admin', 'admin', 'support'],
}: ProtectedAdminRouteProps) {
  const { user, loading, signOut } = useAuth();
  const role = (user?.app_metadata as Record<string, unknown> | undefined)?.role as string | undefined;
  const isAdmin = !!user && !!role && allowedRoles.includes(role);

  useEffect(() => {
    if (!(isAdmin && user)) {
      localStorage.removeItem('admin_user');
      return;
    }
    let cancelled = false;
    (async () => {
      // The audit log FK and several edge functions key off admin_profiles.id —
      // NOT the auth user id — so resolve it server-side and mirror that.
      const { data } = await supabase.rpc('get_admin_context' as any);
      if (cancelled) return;
      const ctx = (data ?? null) as { id?: string; username?: string; full_name?: string; role?: string } | null;
      localStorage.setItem('admin_user', JSON.stringify({
        id: ctx?.id || user.id,              // admin_profiles.id (fallback: auth uid)
        auth_id: user.id,
        username: ctx?.username || user.email,
        role: ctx?.role || role,
        full_name: ctx?.full_name || (user.user_metadata as Record<string, unknown> | undefined)?.full_name || user.email,
      }));
    })();
    return () => { cancelled = true; };
  }, [isAdmin, user, role]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-lime-500 mx-auto mb-4"></div>
          <p className="text-gray-500 text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  // Not signed in → show the admin login right here (so /admin is the entry point).
  if (!user) {
    return <AdminLogin />;
  }

  // Signed in but not an admin (e.g. a customer) → no access, whatever localStorage says.
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8] px-4">
        <div className="text-center p-8 max-w-sm">
          <div className="text-5xl mb-4">🚫</div>
          <h1 className="text-2xl font-heading font-bold uppercase tracking-tight text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-500 mb-5 text-sm">
            You're signed in as <span className="font-medium text-gray-700">{user.email}</span>, which isn't an admin account.
          </p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => signOut()}
              className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-lime-600 transition-colors"
            >
              Sign in as admin
            </button>
            <button
              onClick={() => (window.location.href = '/')}
              className="border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              Back to store
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
