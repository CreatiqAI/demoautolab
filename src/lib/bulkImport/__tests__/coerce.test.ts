import { describe, expect, it } from 'vitest';
import { coerceText, coerceNumber, coerceInteger, coerceBoolean, coerceUuid } from '../coerce';

describe('coerceText', () => {
  it('trims and returns string', () => {
    expect(coerceText('  hello  ')).toEqual({ ok: true, value: 'hello' });
  });
  it('returns null for empty', () => {
    expect(coerceText('')).toEqual({ ok: true, value: null });
    expect(coerceText('   ')).toEqual({ ok: true, value: null });
    expect(coerceText(null)).toEqual({ ok: true, value: null });
    expect(coerceText(undefined)).toEqual({ ok: true, value: null });
  });
  it('coerces numbers to string', () => {
    expect(coerceText(42)).toEqual({ ok: true, value: '42' });
  });
});

describe('coerceNumber', () => {
  it('parses plain numbers', () => {
    expect(coerceNumber(12.5)).toEqual({ ok: true, value: 12.5 });
    expect(coerceNumber('12.5')).toEqual({ ok: true, value: 12.5 });
  });
  it('strips currency prefix RM', () => {
    expect(coerceNumber('RM 12.50')).toEqual({ ok: true, value: 12.5 });
  });
  it('strips thousands separators', () => {
    expect(coerceNumber('12,500')).toEqual({ ok: true, value: 12500 });
    expect(coerceNumber('1,234.56')).toEqual({ ok: true, value: 1234.56 });
  });
  it('returns null on empty', () => {
    expect(coerceNumber('')).toEqual({ ok: true, value: null });
    expect(coerceNumber(null)).toEqual({ ok: true, value: null });
  });
  it('fails on non-numeric', () => {
    expect(coerceNumber('abc').ok).toBe(false);
  });
  it('fails on negative when min=0', () => {
    expect(coerceNumber('-5', { min: 0 }).ok).toBe(false);
  });
});

describe('coerceInteger', () => {
  it('parses integers', () => {
    expect(coerceInteger('42')).toEqual({ ok: true, value: 42 });
    expect(coerceInteger(42)).toEqual({ ok: true, value: 42 });
  });
  it('rejects decimals', () => {
    expect(coerceInteger('12.5').ok).toBe(false);
  });
  it('returns null on empty', () => {
    expect(coerceInteger('')).toEqual({ ok: true, value: null });
  });
});

describe('coerceBoolean', () => {
  it('accepts true variants', () => {
    for (const v of ['TRUE', 'true', 'yes', 'YES', '1', 1, true]) {
      expect(coerceBoolean(v)).toEqual({ ok: true, value: true });
    }
  });
  it('accepts false variants', () => {
    for (const v of ['FALSE', 'false', 'no', 'NO', '0', 0, false]) {
      expect(coerceBoolean(v)).toEqual({ ok: true, value: false });
    }
  });
  it('returns null on empty', () => {
    expect(coerceBoolean('')).toEqual({ ok: true, value: null });
    expect(coerceBoolean(null)).toEqual({ ok: true, value: null });
  });
  it('fails on garbage', () => {
    expect(coerceBoolean('maybe').ok).toBe(false);
  });
});

describe('coerceUuid', () => {
  it('accepts valid UUIDs', () => {
    expect(coerceUuid('123e4567-e89b-12d3-a456-426614174000'))
      .toEqual({ ok: true, value: '123e4567-e89b-12d3-a456-426614174000' });
  });
  it('returns null on empty', () => {
    expect(coerceUuid('')).toEqual({ ok: true, value: null });
  });
  it('fails on invalid', () => {
    expect(coerceUuid('not-a-uuid').ok).toBe(false);
  });
});
