import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

// Private buckets whose stored getPublicUrl links now 404 and must be signed.
const PRIVATE_BUCKETS = ['merchant-documents', 'vendor-payout-slips'];

/**
 * These buckets are PRIVATE (SSM / bank / payment / workshop / vendor-payout files).
 * The DB stores old `getPublicUrl` links which 404 on a private bucket, so viewers
 * must mint a short-lived signed URL. Only authenticated users (admins, the owning
 * merchant/vendor) can sign — anonymous web visitors are blocked by storage RLS.
 */

// Pull the bucket + object path out of a stored Supabase storage URL, e.g.
// https://<ref>.supabase.co/storage/v1/object/public/merchant-documents/ssm/x.pdf
//   -> { bucket: 'merchant-documents', path: 'ssm/x.pdf' }
function parseStorageUrl(url: string): { bucket: string; path: string } | null {
  for (const bucket of PRIVATE_BUCKETS) {
    const marker = `/${bucket}/`;
    const i = url.indexOf(marker);
    if (i === -1) continue;
    let path = url.slice(i + marker.length);
    const q = path.indexOf('?');
    if (q !== -1) path = path.slice(0, q);
    try {
      return { bucket, path: decodeURIComponent(path) };
    } catch {
      return { bucket, path };
    }
  }
  return null;
}

export async function getSignedMerchantDocUrl(
  storedUrl: string | null | undefined,
  transform?: { width?: number; quality?: number },
): Promise<string | null> {
  if (!storedUrl) return null;
  const parsed = parseStorageUrl(storedUrl);
  if (!parsed) return storedUrl; // not a private-bucket URL — leave untouched
  try {
    const { data, error } = await supabase.storage
      .from(parsed.bucket)
      .createSignedUrl(parsed.path, 3600, transform ? { transform } : undefined);
    return error || !data?.signedUrl ? storedUrl : data.signedUrl;
  } catch {
    return storedUrl;
  }
}

export function useSignedMerchantUrl(
  storedUrl: string | null | undefined,
  transform?: { width?: number; quality?: number },
): string | null {
  const [signed, setSigned] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    getSignedMerchantDocUrl(storedUrl, transform).then((u) => {
      if (active) setSigned(u);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storedUrl, transform?.width, transform?.quality]);
  return signed;
}

type SignedDocLinkProps = {
  url: string;
  className?: string;
  children: React.ReactNode;
};

export function SignedDocLink({ url, className, children }: SignedDocLinkProps) {
  const signed = useSignedMerchantUrl(url);
  return (
    <a
      href={signed ?? undefined}
      target="_blank"
      rel="noopener noreferrer"
      aria-disabled={!signed}
      onClick={(e) => {
        if (!signed) e.preventDefault();
      }}
      className={className}
    >
      {children}
    </a>
  );
}

type SignedImageProps = {
  url: string;
  alt: string;
  className?: string;
  transform?: { width?: number; quality?: number };
  loading?: 'lazy' | 'eager';
  decoding?: 'async' | 'sync' | 'auto';
};

export function SignedImage({ url, alt, className, transform, loading, decoding }: SignedImageProps) {
  const signed = useSignedMerchantUrl(url, transform);
  if (!signed) return <div className={className} aria-label={alt} />;
  return <img src={signed} alt={alt} className={className} loading={loading} decoding={decoding} />;
}
