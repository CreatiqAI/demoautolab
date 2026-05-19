import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

const VENDOR_APPROVED_KEY = (userId: string) => `vendor_approved_${userId}`;

// Routes that don't trigger redirect for an approved vendor:
//   /vendor/*  — their own console
//   /auth*     — sign-in / sign-up / callback / sign-out flow
//   /admin*    — staff-only pages (admins might also be vendors in theory)
//   /warehouse — staff-only operations
const ALLOWED_PREFIXES = ['/vendor', '/auth', '/admin', '/warehouse'];

const isAllowed = (pathname: string) =>
  ALLOWED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`)) || pathname === '/auth';

/**
 * When an APPROVED vendor is signed in, every customer-facing route
 * (`/`, `/catalog`, `/my-orders`, `/cart`, etc.) is replaced with
 * a redirect to `/vendor/dashboard`. Vendors don't need the customer
 * experience — they have their own portal.
 *
 * This is mounted once in `<App />` and silently watches the route +
 * user. No render output.
 */
export default function VendorRedirector() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    if (isAllowed(location.pathname)) return;

    // Only redirect users who signed in via the partner login flow.
    // Partner auth emails are synthetic: <username>@partner.autolab.local.
    // Customers/merchants signing in via phone OTP get phone-based emails
    // (e.g. <digits>@phone.autolab.local) — those should NOT be redirected
    // even if they happen to also have a vendor row attached for some reason.
    const email = (user.email ?? '').toLowerCase();
    if (!email.endsWith('@partner.autolab.local')) return;

    // Fast path — read cached result so we don't flash customer pages
    // before the DB lookup finishes on every navigation.
    const cached = localStorage.getItem(VENDOR_APPROVED_KEY(user.id));
    if (cached === 'true') {
      navigate('/vendor/dashboard', { replace: true });
      return;
    }
    if (cached === 'false') {
      // Known not-a-vendor — don't redirect, don't re-query.
      return;
    }

    // First-time check — go to DB, then cache.
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from('vendors' as any)
        .select('status')
        .eq('user_id', user.id)
        .maybeSingle();
      if (cancelled) return;
      const isApproved = (data as any)?.status === 'APPROVED';
      localStorage.setItem(VENDOR_APPROVED_KEY(user.id), String(isApproved));
      if (isApproved && !isAllowed(location.pathname)) {
        navigate('/vendor/dashboard', { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, location.pathname, navigate]);

  return null;
}

/**
 * Clear the cached vendor-approved flag for a user. Call on sign-out
 * so the next user signing in on the same browser doesn't inherit
 * stale state.
 */
export function clearVendorApprovedCache(userId: string) {
  try {
    localStorage.removeItem(VENDOR_APPROVED_KEY(userId));
  } catch { /* localStorage unavailable, no-op */ }
}
