import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export type VendorStatus = 'PENDING' | 'APPROVED' | 'SUSPENDED' | 'REJECTED';

export interface Vendor {
  id: string;
  user_id: string | null;
  business_name: string;
  business_registration_no: string | null;
  tax_id: string | null;
  contact_person: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  description: string | null;
  logo_url: string | null;
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  is_sst_registered: boolean;
  commission_rate: number;
  default_shipping_fee: number;
  status: VendorStatus;
  applied_at: string;
  approved_at: string | null;
  approved_by: string | null;
  rejection_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch the vendor row for a given Supabase Auth user_id. Returns null if
 * the user has no vendor record or the lookup failed.
 */
export async function getVendorByUserId(userId: string): Promise<Vendor | null> {
  if (!userId) return null;
  const { data, error } = await supabase
    .from('vendors' as any)
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return null;
  return (data as unknown as Vendor) ?? null;
}

/**
 * React hook returning the vendor record for the currently signed-in
 * Supabase Auth user. Returns:
 *   - { vendor: null, loading: true } while fetching
 *   - { vendor: Vendor | null, loading: false } once resolved
 *   - { vendor: null } when the user is not signed in or has no vendor row
 *
 * `ProtectedVendorRoute` uses this to gate access; vendor pages use it to
 * scope queries to `vendor.id`.
 */
export function useCurrentVendor(): { vendor: Vendor | null; loading: boolean; refetch: () => void } {
  const { user } = useAuth();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  // Which auth user the current `vendor` value was resolved for. Loading is
  // derived from this *during render* rather than a separate effect-set flag.
  // That matters on a hard refresh: the auth user is restored one render before
  // this hook's fetch effect re-runs, so a plain `loading` boolean would briefly
  // read false-with-null-vendor and make ProtectedVendorRoute bounce to /auth
  // (a false "logout"). Comparing against the current user.id closes that gap.
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setVendor(null);
      setResolvedUserId(null);
      return;
    }
    void (async () => {
      const v = await getVendorByUserId(user.id);
      if (!cancelled) {
        setVendor(v);
        setResolvedUserId(user.id);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, tick]);

  // While a user is signed in but their vendor row hasn't been resolved yet,
  // report loading — never a premature (loading:false, vendor:null).
  const resolved = !!user && resolvedUserId === user.id;
  return {
    vendor: resolved ? vendor : null,
    loading: !!user && !resolved,
    refetch: () => setTick((t) => t + 1),
  };
}

/**
 * True only when the currently signed-in user has an APPROVED vendor row.
 * Pending / suspended / rejected vendors get a different UI (a status page),
 * not the regular dashboard.
 */
export function vendorIsActive(vendor: Vendor | null): boolean {
  return vendor?.status === 'APPROVED';
}
