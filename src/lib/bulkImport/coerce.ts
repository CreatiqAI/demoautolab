export type CoerceResult<T> =
  | { ok: true; value: T | null }
  | { ok: false; error: string };

function isEmpty(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string' && v.trim() === '') return true;
  return false;
}

export function coerceText(input: unknown): CoerceResult<string> {
  if (isEmpty(input)) return { ok: true, value: null };
  return { ok: true, value: String(input).trim() };
}

export function coerceNumber(
  input: unknown,
  opts: { min?: number; max?: number } = {}
): CoerceResult<number> {
  if (isEmpty(input)) return { ok: true, value: null };
  let raw: string;
  if (typeof input === 'number') raw = String(input);
  else raw = String(input).trim().replace(/^RM\s*/i, '').replace(/,/g, '');
  const n = Number(raw);
  if (!Number.isFinite(n)) return { ok: false, error: `not a number: "${input}"` };
  if (opts.min !== undefined && n < opts.min)
    return { ok: false, error: `must be >= ${opts.min}` };
  if (opts.max !== undefined && n > opts.max)
    return { ok: false, error: `must be <= ${opts.max}` };
  return { ok: true, value: n };
}

export function coerceInteger(
  input: unknown,
  opts: { min?: number; max?: number } = {}
): CoerceResult<number> {
  const r = coerceNumber(input, opts);
  if (!r.ok) return r;
  if (r.value === null) return r;
  if (!Number.isInteger(r.value))
    return { ok: false, error: `must be an integer (got ${r.value})` };
  return r;
}

const TRUE_SET = new Set(['true', 'yes', '1']);
const FALSE_SET = new Set(['false', 'no', '0']);

export function coerceBoolean(input: unknown): CoerceResult<boolean> {
  if (isEmpty(input)) return { ok: true, value: null };
  if (typeof input === 'boolean') return { ok: true, value: input };
  if (typeof input === 'number') {
    if (input === 1) return { ok: true, value: true };
    if (input === 0) return { ok: true, value: false };
    return { ok: false, error: `not a boolean: ${input}` };
  }
  const s = String(input).trim().toLowerCase();
  if (TRUE_SET.has(s)) return { ok: true, value: true };
  if (FALSE_SET.has(s)) return { ok: true, value: false };
  return { ok: false, error: `not a boolean: "${input}"` };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function coerceUuid(input: unknown): CoerceResult<string> {
  if (isEmpty(input)) return { ok: true, value: null };
  const s = String(input).trim();
  if (!UUID_RE.test(s)) return { ok: false, error: `not a UUID: "${input}"` };
  return { ok: true, value: s.toLowerCase() };
}
