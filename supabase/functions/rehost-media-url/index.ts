// supabase/functions/rehost-media-url/index.ts
// Downloads an image or video from any public URL (including Google Drive
// sharing links) and re-uploads the original bytes to Supabase Storage,
// returning the permanent public URL.
//
// Solves: pasting a Drive sharing URL into the existing ImageUpload "From URL"
// tab used to just store the string; browsers can't render Drive URLs as
// images because they're HTML pages. This function re-hosts the actual bytes.
//
// NOTE: We intentionally do NOT decode/resize images in this function. Doing so
// with a pure-JS image library (ImageScript) on large supplier photos exceeded
// the edge runtime's CPU/memory budget and the worker was killed (HTTP 546),
// dropping otherwise-valid images during bulk import. Re-hosting the original
// bytes is fast, light, and reliable. If on-the-fly resizing is needed later,
// use Supabase Storage image transformations at render time (?width=...).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DRIVE_FILE_ID_RE = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
const DRIVE_OPEN_ID_RE = /drive\.google\.com\/open\?(?:[^&]*&)*id=([a-zA-Z0-9_-]+)/;
const DRIVE_UC_ID_RE = /drive\.google\.com\/uc\?(?:[^&]*&)*id=([a-zA-Z0-9_-]+)/;

function normalizeMediaUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  let parsed: URL;
  try { parsed = new URL(trimmed); } catch { return null; }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;

  if (/^https?:\/\/(www\.)?drive\.google\.com\//.test(trimmed)) {
    const m = trimmed.match(DRIVE_FILE_ID_RE)
           ?? trimmed.match(DRIVE_OPEN_ID_RE)
           ?? trimmed.match(DRIVE_UC_ID_RE);
    if (m) return `https://drive.google.com/uc?export=download&id=${m[1]}`;
    return trimmed;
  }
  if (parsed.hostname.endsWith('dropbox.com') && parsed.searchParams.get('dl') === '0') {
    parsed.searchParams.set('dl', '1');
    return parsed.toString();
  }
  return trimmed;
}

const IMAGE_BUCKET = 'product-images';
const VIDEO_BUCKET = 'product-videos';
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 2 * 1024 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 60_000;

function pickExtension(contentType: string): string {
  if (contentType.startsWith('video/')) {
    if (contentType.includes('webm')) return 'webm';
    if (contentType.includes('quicktime')) return 'mov';
    return 'mp4';
  }
  // Preserve the original image format (we no longer re-encode to JPEG).
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('gif')) return 'gif';
  if (contentType.includes('svg')) return 'svg';
  return 'jpg';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { url, folder, check } = await req.json() as { url?: string; folder?: string; check?: boolean };
    if (!url) {
      return new Response(JSON.stringify({ error: 'url required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const normalized = normalizeMediaUrl(url);
    if (!normalized) {
      return new Response(JSON.stringify({ error: 'invalid URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let resp: Response;
    try {
      resp = await fetch(normalized, {
        redirect: 'follow',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: `download failed: ${(e as Error).message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!resp.ok) {
      return new Response(JSON.stringify({ error: `download HTTP ${resp.status}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const contentType = resp.headers.get('content-type') ?? '';
    const isImage = contentType.startsWith('image/');
    const isVideo = contentType.startsWith('video/');
    if (!isImage && !isVideo) {
      return new Response(JSON.stringify({ error: `not a media file: content-type was "${contentType}". Make sure the Drive folder is shared "Anyone with the link".` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Pre-flight "check" mode: confirm the URL is reachable and is real media,
    // optionally flagging oversize via Content-Length, WITHOUT downloading the
    // full body or uploading anything. Lets the bulk-import UI verify every
    // image up front so the admin fixes broken links before committing.
    if (check) {
      const lenHeader = resp.headers.get('content-length');
      try { await resp.body?.cancel(); } catch { /* ignore */ }
      if (lenHeader) {
        const len = Number(lenHeader);
        const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
        if (Number.isFinite(len) && len > maxBytes) {
          return new Response(JSON.stringify({ error: `file too large (>${Math.round(maxBytes / 1024 / 1024)}MB)` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      }
      return new Response(JSON.stringify({ ok: true, mediaType: isVideo ? 'video' : 'image' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const buf = new Uint8Array(await resp.arrayBuffer());
    const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (buf.byteLength > maxBytes) {
      return new Response(JSON.stringify({ error: `file too large (>${Math.round(maxBytes / 1024 / 1024)}MB)` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const cleanFolder = (folder ?? 'uploads').replace(/[^a-zA-Z0-9-_/]/g, '');
    const ext = pickExtension(contentType);
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
    const path = `${cleanFolder}/${filename}`;
    const bucket = isVideo ? VIDEO_BUCKET : IMAGE_BUCKET;

    // Re-host the original bytes as-is. No decode/resize: keeps the function
    // within its CPU/memory budget so large images don't get the worker killed.
    const { error: uploadErr } = await supabase
      .storage.from(bucket)
      .upload(path, buf, { contentType, upsert: false });
    if (uploadErr) throw uploadErr;

    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
    return new Response(JSON.stringify({
      url: pub.publicUrl,
      path,
      mediaType: isVideo ? 'video' : 'image',
      bucket,
    }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
