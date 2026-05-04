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
  const [loading, setLoading] = useState<boolean>(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setVendor(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    void (async () => {
      const v = await getVendorByUserId(user.id);
      if (!cancelled) {
        setVendor(v);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, tick]);

  return { vendor, loading, refetch: () => setTick((t) => t + 1) };
}

/**
 * True only when the currently signed-in user has an APPROVED vendor row.
 * Pending / suspended / rejected vendors get a different UI (a status page),
 * not the regular dashboard.
 */
export function vendorIsActive(vendor: Vendor | null): boolean {
  return vendor?.status === 'APPROVED';
}
