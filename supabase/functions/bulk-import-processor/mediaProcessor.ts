// supabase/functions/bulk-import-processor/mediaProcessor.ts
// Process a single media URL that may be an image OR a video. YouTube/Vimeo
// URLs pass through unchanged; everything else is fetched, detected by
// content-type, and uploaded to the appropriate Storage bucket.

import { Image } from "https://deno.land/x/imagescript@1.2.17/mod.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { normalizeMediaUrl } from "./driveUrl.ts";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 2 * 1024 * 1024 * 1024;
const MAX_DIM = 1920;
const FETCH_TIMEOUT_MS = 60_000;
const IMAGE_BUCKET = 'product-images';
const VIDEO_BUCKET = 'product-videos';

export type MediaType = 'image' | 'video';

export interface ProcessedMedia {
  ok: true;
  url: string;            // public URL (Storage URL for re-hosted, or original for embeds)
  mediaType: MediaType;
  embedded: boolean;      // true for YouTube/Vimeo (no re-host)
}
export interface ProcessedMediaError {
  ok: false;
  error: string;
}

function isEmbeddableUrl(url: string): boolean {
  return /youtube\.com\/watch|youtu\.be\/|vimeo\.com\//i.test(url);
}

function pickExtension(contentType: string): string {
  if (contentType.startsWith('video/')) {
    if (contentType.includes('webm')) return 'webm';
    if (contentType.includes('quicktime')) return 'mov';
    return 'mp4';
  }
  return 'jpg';
}

export async function processMediaUrl(
  supabase: SupabaseClient,
  rawUrl: string,
  destinationFolder: string,
  filenameBase: string
): Promise<ProcessedMedia | ProcessedMediaError> {
  if (!rawUrl) return { ok: false, error: 'empty URL' };
  if (isEmbeddableUrl(rawUrl)) {
    return { ok: true, url: rawUrl, mediaType: 'video', embedded: true };
  }

  const url = normalizeMediaUrl(rawUrl);
  if (!url) return { ok: false, error: `invalid URL: ${rawUrl}` };

  let resp: Response;
  try {
    resp = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  } catch (e) {
    return { ok: false, error: `download failed: ${(e as Error).message}` };
  }
  if (!resp.ok) return { ok: false, error: `download HTTP ${resp.status}` };

  const contentType = resp.headers.get('content-type') ?? '';
  const isImage = contentType.startsWith('image/');
  const isVideo = contentType.startsWith('video/');
  if (!isImage && !isVideo) {
    return { ok: false, error: `not a media file: content-type "${contentType}"` };
  }
  const buf = new Uint8Array(await resp.arrayBuffer());
  const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (buf.byteLength > maxBytes) {
    return { ok: false, error: `file too large (>${Math.round(maxBytes / 1024 / 1024)}MB)` };
  }

  let body: Uint8Array;
  let uploadContentType: string;
  let bucket: string;

  if (isImage) {
    const img = await Image.decode(buf);
    if (img.width > MAX_DIM || img.height > MAX_DIM) {
      if (img.width >= img.height) img.resize(MAX_DIM, Image.RESIZE_AUTO);
      else img.resize(Image.RESIZE_AUTO, MAX_DIM);
    }
    body = await img.encodeJPEG(85);
    uploadContentType = 'image/jpeg';
    bucket = IMAGE_BUCKET;
  } else {
    body = buf;
    uploadContentType = contentType;
    bucket = VIDEO_BUCKET;
  }

  const ext = pickExtension(uploadContentType);
  const path = `${destinationFolder}/${filenameBase}.${ext}`;
  const { error: uploadErr } = await supabase
    .storage.from(bucket)
    .upload(path, body, { contentType: uploadContentType, upsert: true });
  if (uploadErr) return { ok: false, error: `upload failed: ${uploadErr.message}` };

  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
  return { ok: true, url: pub.publicUrl, mediaType: isVideo ? 'video' : 'image', embedded: false };
}
