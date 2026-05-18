import { describe, expect, it } from 'vitest';
import { normalizeMediaUrl, isLikelyDriveUrl } from '../driveUrl';

describe('normalizeMediaUrl', () => {
  it('rewrites file/d/{ID}/view to uc?export=download', () => {
    expect(normalizeMediaUrl('https://drive.google.com/file/d/ABC123/view?usp=sharing'))
      .toBe('https://drive.google.com/uc?export=download&id=ABC123');
  });
  it('rewrites file/d/{ID}/preview', () => {
    expect(normalizeMediaUrl('https://drive.google.com/file/d/ABC123/preview'))
      .toBe('https://drive.google.com/uc?export=download&id=ABC123');
  });
  it('rewrites open?id={ID}', () => {
    expect(normalizeMediaUrl('https://drive.google.com/open?id=ABC123'))
      .toBe('https://drive.google.com/uc?export=download&id=ABC123');
  });
  it('passes through uc?id direct URLs unchanged but normalizes form', () => {
    expect(normalizeMediaUrl('https://drive.google.com/uc?id=ABC123'))
      .toBe('https://drive.google.com/uc?export=download&id=ABC123');
  });
  it('rewrites Dropbox dl=0 to dl=1', () => {
    expect(normalizeMediaUrl('https://www.dropbox.com/s/foo/bar.jpg?dl=0'))
      .toBe('https://www.dropbox.com/s/foo/bar.jpg?dl=1');
  });
  it('passes through ordinary https URLs unchanged', () => {
    expect(normalizeMediaUrl('https://cdn.example.com/img/foo.jpg'))
      .toBe('https://cdn.example.com/img/foo.jpg');
  });
  it('returns null for empty/whitespace input', () => {
    expect(normalizeMediaUrl('')).toBe(null);
    expect(normalizeMediaUrl('   ')).toBe(null);
  });
  it('returns null for invalid URLs', () => {
    expect(normalizeMediaUrl('not a url')).toBe(null);
  });
});

describe('isLikelyDriveUrl', () => {
  it('detects Drive URLs', () => {
    expect(isLikelyDriveUrl('https://drive.google.com/file/d/X/view')).toBe(true);
    expect(isLikelyDriveUrl('https://drive.google.com/uc?id=X')).toBe(true);
  });
  it('rejects non-Drive URLs', () => {
    expect(isLikelyDriveUrl('https://cdn.example.com/foo.jpg')).toBe(false);
    expect(isLikelyDriveUrl('https://dropbox.com/s/foo.jpg')).toBe(false);
  });
});
