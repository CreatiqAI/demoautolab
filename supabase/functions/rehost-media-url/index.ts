// supabase/functions/rehost-media-url/index.ts
// Downloads an image from any public URL (including Google Drive sharing
// links), resizes to <=1920px, encodes JPEG @ 85%, and uploads to the
// product-images bucket. Returns the permanent public URL.
//
// Solves: pasting a Drive sharing URL into the existing ImageUpload "From URL"
// tab used to just store the string; browsers can't render Drive URLs as
// images because they're HTML pages. This function re-hosts the actual bytes.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image } from "https://deno.land/x/imagescript@1.2.17/mod.ts";

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
const MAX_DIM = 1920;
const FETCH_TIMEOUT_MS = 60_000;

function pickExtension(contentType: string): string {
  if (contentType.startsWith('video/')) {
    if (contentType.includes('webm')) return 'webm';
    if (contentType.includes('quicktime')) return 'mov';
    return 'mp4';
  }
  return 'jpg';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { url, folder } = await req.json() as { url?: string; folder?: string };
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

    const { error: uploadErr } = await supabase
      .storage.from(bucket)
      .upload(path, body, { contentType: uploadContentType, upsert: false });
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
