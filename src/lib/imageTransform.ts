// Supabase Storage image transformation helper.
//
// Since rehost-media-url now stores ORIGINAL (full-resolution) bytes, rendering
// those originals directly is slow — a listing or product page can pull several
// MB per image. Supabase serves on-the-fly resized versions from its image CDN:
//   /storage/v1/object/public/...   ->  /storage/v1/render/image/public/...?width=...
// Rewriting the URL at render time means the browser downloads a small, resized
// image instead of the original (≈10× smaller for thumbnails).
//
// Non-Supabase URLs (external links, YouTube/Vimeo, data:/blob:, or already a
// render URL) are returned unchanged.

export interface ImageTransformOptions {
  /** Target width in pixels. Pass ~2× the CSS display width for crisp retina. */
  width?: number;
  /** Target height in pixels (only enforced together with width). */
  height?: number;
  /** JPEG/WebP quality 20–100. Default 70. */
  quality?: number;
  /** How to fit when both width and height are given. Default 'contain'. */
  resize?: 'cover' | 'contain' | 'fill';
}

const OBJECT_PATH = '/storage/v1/object/public/';
const RENDER_PATH = '/storage/v1/render/image/public/';

export function transformImage(
  url: string | null | undefined,
  opts: ImageTransformOptions = {},
): string {
  if (!url) return url ?? '';
  // Only Supabase Storage public object URLs can be transformed. Leave external
  // URLs, YouTube/Vimeo embeds, data:/blob: URIs, and existing render URLs alone.
  if (!url.includes(OBJECT_PATH)) return url;

  const { width, height, quality = 70, resize = 'contain' } = opts;
  if (!width && !height) return url; // nothing to do

  const params = new URLSearchParams();
  if (width) params.set('width', String(Math.round(width)));
  if (height) params.set('height', String(Math.round(height)));
  if (quality) params.set('quality', String(quality));
  // IMPORTANT: always send `resize`. Supabase only preserves aspect ratio when
  // `resize` is present — a width-only (or height-only) request WITHOUT it leaves
  // the other dimension at the original size, squishing the image into a sliver.
  // With a single dimension + resize=contain it scales proportionally.
  params.set('resize', resize);

  const base = url.replace(OBJECT_PATH, RENDER_PATH);
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}${params.toString()}`;
}
