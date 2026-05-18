const DRIVE_FILE_ID_RE = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
const DRIVE_OPEN_ID_RE = /drive\.google\.com\/open\?(?:[^&]*&)*id=([a-zA-Z0-9_-]+)/;
const DRIVE_UC_ID_RE = /drive\.google\.com\/uc\?(?:[^&]*&)*id=([a-zA-Z0-9_-]+)/;

export function isLikelyDriveUrl(url: string): boolean {
  return /^https?:\/\/(www\.)?drive\.google\.com\//.test(url);
}

function extractDriveId(url: string): string | null {
  const fileMatch = url.match(DRIVE_FILE_ID_RE);
  if (fileMatch) return fileMatch[1];
  const openMatch = url.match(DRIVE_OPEN_ID_RE);
  if (openMatch) return openMatch[1];
  const ucMatch = url.match(DRIVE_UC_ID_RE);
  if (ucMatch) return ucMatch[1];
  return null;
}

export function normalizeMediaUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
  if (isLikelyDriveUrl(trimmed)) {
    const id = extractDriveId(trimmed);
    if (id) return `https://drive.google.com/uc?export=download&id=${id}`;
    return trimmed;
  }
  if (parsed.hostname.endsWith('dropbox.com') && parsed.searchParams.get('dl') === '0') {
    parsed.searchParams.set('dl', '1');
    return parsed.toString();
  }
  return trimmed;
}
