import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Json } from '@/integrations/supabase/types';

export interface OfficeHour {
  days: string;
  /** null open/close means closed that day. */
  open: string | null;
  close: string | null;
}

export interface SiteSettings {
  trading_name: string;
  legal_name: string;
  description: string;
  phone: string;
  whatsapp: string;
  email: string;
  address_line1: string;
  address_city: string;
  address_state: string;
  address_postcode: string;
  office_hours: OfficeHour[];
  facebook_url: string;
  instagram_url: string;
  privacy_policy: string;
  terms_conditions: string;
  return_window_days: number;
  free_return_shipping: boolean;
  return_policy_intro: string;
  updated_at: string;
}

/**
 * Shown while the row loads, and if it ever fails to load, so the footer never
 * renders blank. Kept deliberately sparse — the real values live in the database.
 */
const FALLBACK: SiteSettings = {
  trading_name: 'Auto Lab',
  legal_name: 'Auto Lab Ebiz Sdn Bhd',
  description: '',
  phone: '',
  whatsapp: '',
  email: '',
  address_line1: '',
  address_city: '',
  address_state: '',
  address_postcode: '',
  office_hours: [],
  facebook_url: '',
  instagram_url: '',
  privacy_policy: '',
  terms_conditions: '',
  return_window_days: 7,
  free_return_shipping: true,
  return_policy_intro: '',
  updated_at: '',
};

export const SITE_SETTINGS_KEY = ['site-settings'] as const;

export function useSiteSettings() {
  const { data, isLoading, error } = useQuery({
    queryKey: SITE_SETTINGS_KEY,
    queryFn: async (): Promise<SiteSettings> => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return FALLBACK;
      // office_hours is jsonb, so it arrives as Json rather than OfficeHour[].
      return { ...data, office_hours: (data.office_hours ?? []) as unknown as OfficeHour[] };
    },
    // Company details change a few times a year; don't refetch them on every mount.
    staleTime: 5 * 60 * 1000,
  });

  return { settings: data ?? FALLBACK, isLoading, error };
}

export function useUpdateSiteSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patch: Partial<SiteSettings>) => {
      const { office_hours, ...rest } = patch;
      const { error } = await supabase
        .from('site_settings')
        .update({
          ...rest,
          // Widen OfficeHour[] to the Json type the jsonb column expects.
          ...(office_hours ? { office_hours: office_hours as unknown as Json } : {}),
        })
        .eq('id', 1);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SITE_SETTINGS_KEY });
    },
  });
}

/** "17, Jalan 7/95B, Cheras Utama, 56100 Cheras, Wilayah Persekutuan Kuala Lumpur" */
export function formatAddress(s: SiteSettings): string {
  return [
    s.address_line1,
    [s.address_postcode, s.address_city].filter(Boolean).join(' '),
    s.address_state,
  ]
    .filter(Boolean)
    .join(', ');
}

/** "Monday – Friday: 9:30am - 6:00pm" / "Sunday: Closed" */
export function formatOfficeHour(h: OfficeHour): string {
  if (!h.open || !h.close) return `${h.days}: Closed`;
  return `${h.days}: ${h.open} - ${h.close}`;
}

/** Strips the country code and spaces so it can be used in a tel:/wa.me href. */
export function toDialable(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}

const DAY_CODES: Record<string, string> = {
  monday: 'Mo', tuesday: 'Tu', wednesday: 'We', thursday: 'Th',
  friday: 'Fr', saturday: 'Sa', sunday: 'Su',
};

/** "9:30am" -> "09:30". Returns null if it can't be parsed. */
function to24h(time: string): string | null {
  const m = time.trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!m) return null;
  let hour = Number(m[1]);
  const minute = m[2] ?? '00';
  const meridiem = m[3];
  if (meridiem === 'pm' && hour !== 12) hour += 12;
  if (meridiem === 'am' && hour === 12) hour = 0;
  if (hour > 23) return null;
  return `${String(hour).padStart(2, '0')}:${minute}`;
}

/**
 * Converts the office hours into schema.org openingHours strings
 * (e.g. "Mo-Fr 09:30-18:00"). Rows that are closed, or that we can't parse
 * confidently, are dropped — emitting wrong structured data is worse than
 * emitting none.
 */
export function toSchemaOpeningHours(hours: OfficeHour[]): string[] {
  return hours.flatMap((h) => {
    if (!h.open || !h.close) return [];

    const open = to24h(h.open);
    const close = to24h(h.close);
    if (!open || !close) return [];

    const days = (h.days.toLowerCase().match(/[a-z]+/g) ?? [])
      .map((d) => DAY_CODES[d])
      .filter(Boolean);
    if (days.length === 0) return [];

    // "Monday – Friday" -> a range; a single day stays a single day.
    const span = days.length > 1 ? `${days[0]}-${days[days.length - 1]}` : days[0];
    return [`${span} ${open}-${close}`];
  });
}
