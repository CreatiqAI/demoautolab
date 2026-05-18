// supabase/functions/bulk-import-processor/imageProcessor.ts
// Downloads a public image URL, resizes to max 1920px, encodes JPEG @ 85,
// and uploads to bucket "product-images". Returns the public URL.

import { Image } from "https://deno.land/x/imagescript@1.2.17/mod.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { normalizeMediaUrl } from "./driveUrl.ts";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_DIM = 1920;
const FETCH_TIMEOUT_MS = 30_000;
const BUCKET = 'product-images';

export interface ProcessedImage {
  ok: true;
  publicUrl: string;
  path: string;
}
export interface ProcessedImageError {
  ok: false;
  error: string;
}

export async function processImageUrl(
  supabase: SupabaseClient,
  rawUrl: string,
  destinationFolder: string,
  filenameBase: string
): Promise<ProcessedImage | ProcessedImageError> {
  const url = normalizeMediaUrl(rawUrl);
  if (!url) return { ok: false, error: `invalid URL: ${rawUrl}` };

  let resp: Response;
  try {
    resp = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (e) {
    return { ok: false, error: `download failed: ${(e as Error).message}` };
  }
  if (!resp.ok) {
    return { ok: false, error: `download HTTP ${resp.status}` };
  }
  const contentType = resp.headers.get('content-type') ?? '';
  if (!contentType.startsWith('image/')) {
    return { ok: false, error: `not an image: content-type was "${contentType}"` };
  }
  const buf = new Uint8Array(await resp.arrayBuffer());
  if (buf.byteLength > MAX_BYTES) {
    return { ok: false, error: `image too large (>${MAX_BYTES / 1024 / 1024}MB)` };
  }

  let img: Image;
  try {
    img = await Image.decode(buf);
  } catch (e) {
    return { ok: false, error: `decode failed: ${(e as Error).message}` };
  }
  if (img.width > MAX_DIM || img.height > MAX_DIM) {
    if (img.width >= img.height) img.resize(MAX_DIM, Image.RESIZE_AUTO);
    else img.resize(Image.RESIZE_AUTO, MAX_DIM);
  }
  const jpg = await img.encodeJPEG(85);

  const path = `${destinationFolder}/${filenameBase}.jpg`;
  const { error: uploadErr } = await supabase
    .storage
    .from(BUCKET)
    .upload(path, jpg, { contentType: 'image/jpeg', upsert: true });
  if (uploadErr) {
    return { ok: false, error: `upload failed: ${uploadErr.message}` };
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { ok: true, publicUrl: pub.publicUrl, path };
}
