# Bulk Excel Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an admin-only `/admin/bulk-import` page that lets admins bulk-create components (and, in phase 2, products) by uploading an Excel template, with Google Drive image URLs auto-re-hosted to Supabase Storage, dry-run preview, and insert/update/upsert modes.

**Architecture:** Hybrid client+server. Browser parses Excel (`xlsx` lib) and validates locally for instant preview. On confirm, client chunks rows into batches of 20 and calls a Supabase Edge Function (`bulk-import-processor`) per batch; the function downloads media from Drive URLs, resizes to WebP, uploads to Supabase Storage, then inserts/updates `component_library`. A small `get-bulk-import-logs` function reads the audit table. Both functions use service-role key gated by the existing admin session check (admin_id → admin_profiles lookup pattern from `admin-create-vendor`).

**Tech Stack:** React 18 + TypeScript + Vite, `xlsx` 0.18 (new), Supabase (PostgreSQL + Edge Functions + Storage), Deno `imagescript` for WebP encoding, Vitest + Playwright for tests, shadcn/ui + Tailwind for UI.

**Reference docs:**
- Spec: [docs/superpowers/specs/2026-05-18-bulk-excel-import-design.md](../specs/2026-05-18-bulk-excel-import-design.md)
- Existing admin edge function pattern: [supabase/functions/admin-create-vendor/index.ts](../../../supabase/functions/admin-create-vendor/index.ts)
- Project conventions: [CLAUDE.md](../../../CLAUDE.md)

---

## File Structure

**Created:**
```
database/
├── 20260518100000_bulk-import-video-url.sql
└── 20260518100001_bulk-import-audit-log.sql

src/lib/bulkImport/
├── types.ts
├── driveUrl.ts
├── coerce.ts
├── parser.ts
├── validators.ts
├── api.ts
└── columnMaps/
    ├── index.ts
    ├── components.ts
    └── products.ts

src/lib/bulkImport/__tests__/
├── driveUrl.test.ts
├── coerce.test.ts
├── parser.test.ts
└── validators.test.ts

src/pages/admin/BulkImport.tsx

src/components/admin/bulkImport/
├── EntityPicker.tsx
├── TemplateDownloader.tsx
├── FileDropzone.tsx
├── PreviewTable.tsx
├── ModeSelector.tsx
├── ImportProgress.tsx
└── ResultSummary.tsx

supabase/functions/bulk-import-processor/
├── index.ts
├── auth.ts
├── driveUrl.ts
├── imageProcessor.ts
└── dbWriter.ts

supabase/functions/get-bulk-import-logs/
└── index.ts

scripts/
├── generate-import-templates.ts
└── generate-test-fixtures.ts

public/templates/
├── components-import-template.xlsx        (generated)
└── products-import-template.xlsx          (generated)

src/test/fixtures/bulk-import/              (generated)

src/e2e/bulk-import.spec.ts
```

**Modified:**
- `package.json` — add `xlsx` dep
- `src/App.tsx` — add `/admin/bulk-import` route
- `src/components/admin/AdminLayout.tsx` — add nav link

---

## Phase 1: Database Migrations

### Task 1: Add `video_url` column to `component_library`

**Files:**
- Create: `database/20260518100000_bulk-import-video-url.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 20260518100000_bulk-import-video-url.sql
-- Adds optional video URL field to components for bulk import support.

ALTER TABLE component_library
  ADD COLUMN IF NOT EXISTS video_url TEXT;

COMMENT ON COLUMN component_library.video_url IS
  'Optional public video URL (YouTube/Vimeo/Drive). Stored as-is, not re-hosted.';
```

- [ ] **Step 2: Apply migration via Supabase MCP**

Use `mcp__supabase__apply_migration` with `name=bulk_import_video_url` and the SQL above.
Expected: success, no errors.

- [ ] **Step 3: Verify column exists**

Use `mcp__supabase__execute_sql` with:
```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'component_library' AND column_name = 'video_url';
```
Expected: one row, `video_url | text`.

- [ ] **Step 4: Commit**

```bash
git add database/20260518100000_bulk-import-video-url.sql
git commit -m "db: add video_url column to component_library for bulk import"
```

---

### Task 2: Create `bulk_import_logs` audit table

**Files:**
- Create: `database/20260518100001_bulk-import-audit-log.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 20260518100001_bulk-import-audit-log.sql
-- Audit log for bulk Excel import runs. RLS enabled with no public policies —
-- access is via edge functions using the service-role key, gated by the same
-- admin session check used by admin-create-vendor / admin-delete-vendor.

CREATE TABLE IF NOT EXISTS bulk_import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  admin_id UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
  entity TEXT NOT NULL CHECK (entity IN ('component', 'product')),
  mode TEXT NOT NULL CHECK (mode IN ('insert', 'update', 'upsert')),
  total_rows INT NOT NULL,
  succeeded INT NOT NULL,
  failed INT NOT NULL,
  result_json JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bulk_import_logs_run_at
  ON bulk_import_logs (run_at DESC);
CREATE INDEX IF NOT EXISTS idx_bulk_import_logs_admin_id
  ON bulk_import_logs (admin_id);

ALTER TABLE bulk_import_logs ENABLE ROW LEVEL SECURITY;
```

- [ ] **Step 2: Apply migration**

Use `mcp__supabase__apply_migration` with `name=bulk_import_audit_log` and the SQL above.

- [ ] **Step 3: Verify**

`mcp__supabase__execute_sql`:
```sql
SELECT COUNT(*) FROM bulk_import_logs;
```
Expected: `0`.

- [ ] **Step 4: Commit**

```bash
git add database/20260518100001_bulk-import-audit-log.sql
git commit -m "db: add bulk_import_logs audit table"
```

---

## Phase 2: Engine Core (TDD)

### Task 3: Install `xlsx` dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install**

```bash
npm install xlsx@0.18.5
```

- [ ] **Step 2: Verify install**

```bash
npm list xlsx
```
Expected: `xlsx@0.18.5` listed.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add xlsx for bulk import Excel parsing"
```

---

### Task 4: Type definitions for the engine

**Files:**
- Create: `src/lib/bulkImport/types.ts`

- [ ] **Step 1: Write types**

```ts
// src/lib/bulkImport/types.ts

export type Entity = 'component' | 'product';
export type ImportMode = 'insert' | 'update' | 'upsert';

export type FieldType = 'text' | 'number' | 'integer' | 'boolean' | 'url' | 'uuid';

export type MediaRole = 'default_image' | 'gallery' | 'video';

export interface FieldDef {
  excelColumn: string;
  dbColumn: string;
  required: boolean;
  type: FieldType;
  min?: number;
  max?: number;
  pattern?: RegExp;
}

export interface MediaColumnDef {
  excelColumn: string;
  role: MediaRole;
  sortOrder?: number;
}

export interface ColumnMap {
  entity: Entity;
  table: string;
  uniqueKey: string;
  fields: FieldDef[];
  mediaColumns: MediaColumnDef[];
}

export interface RawRow {
  rowIndex: number;        // 1-based, including header
  raw: Record<string, unknown>;
}

export interface ParsedRow {
  rowIndex: number;
  fields: Record<string, unknown>;
  mediaUrls: {
    default: string | null;
    gallery: string[];
    video: string | null;
  };
  errors: string[];
  warnings: string[];
}

export interface ValidationSummary {
  rows: ParsedRow[];
  totalRows: number;
  validRows: number;
  errorRows: number;
  warningRows: number;
  headerErrors: string[];
}

export interface BatchResult {
  rowIndex: number;
  status: 'inserted' | 'updated' | 'skipped' | 'error';
  sku: string;
  recordId?: string;
  error?: string;
  mediaErrors?: string[];
}

export interface ImportRequest {
  entity: Entity;
  mode: ImportMode;
  admin_id: string;
  rows: Array<{
    rowIndex: number;
    fields: Record<string, unknown>;
    mediaUrls: ParsedRow['mediaUrls'];
  }>;
}

export interface ImportResponse {
  results: BatchResult[];
}
```

- [ ] **Step 2: Type-check**

```bash
npm run type-check
```
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/bulkImport/types.ts
git commit -m "bulkImport: add core type definitions"
```

---

### Task 5: Drive URL normalization (TDD)

**Files:**
- Create: `src/lib/bulkImport/driveUrl.ts`
- Create: `src/lib/bulkImport/__tests__/driveUrl.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/bulkImport/__tests__/driveUrl.test.ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- src/lib/bulkImport/__tests__/driveUrl.test.ts
```
Expected: All tests fail with module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/bulkImport/driveUrl.ts

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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- src/lib/bulkImport/__tests__/driveUrl.test.ts
```
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/bulkImport/driveUrl.ts src/lib/bulkImport/__tests__/driveUrl.test.ts
git commit -m "bulkImport: drive URL normalization with tests"
```

---

### Task 6: Value coercion utilities (TDD)

**Files:**
- Create: `src/lib/bulkImport/coerce.ts`
- Create: `src/lib/bulkImport/__tests__/coerce.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/bulkImport/__tests__/coerce.test.ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- src/lib/bulkImport/__tests__/coerce.test.ts
```
Expected: All tests fail with module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/bulkImport/coerce.ts

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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- src/lib/bulkImport/__tests__/coerce.test.ts
```
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/bulkImport/coerce.ts src/lib/bulkImport/__tests__/coerce.test.ts
git commit -m "bulkImport: value coercion utilities with tests"
```

---

### Task 7: Components column map

**Files:**
- Create: `src/lib/bulkImport/columnMaps/components.ts`
- Create: `src/lib/bulkImport/columnMaps/index.ts`

- [ ] **Step 1: Write components column map**

```ts
// src/lib/bulkImport/columnMaps/components.ts
import type { ColumnMap } from '../types';

export const componentsColumnMap: ColumnMap = {
  entity: 'component',
  table: 'component_library',
  uniqueKey: 'component_sku',
  fields: [
    { excelColumn: 'sku', dbColumn: 'component_sku', required: true, type: 'text',
      pattern: /^[A-Z0-9-]{3,40}$/i },
    { excelColumn: 'name', dbColumn: 'name', required: true, type: 'text', max: 200 },
    { excelColumn: 'type', dbColumn: 'component_type', required: true, type: 'text' },
    { excelColumn: 'value', dbColumn: 'component_value', required: false, type: 'text' },
    { excelColumn: 'description', dbColumn: 'description', required: false, type: 'text' },
    { excelColumn: 'normal_price', dbColumn: 'normal_price', required: true, type: 'number', min: 0 },
    { excelColumn: 'merchant_price', dbColumn: 'merchant_price', required: true, type: 'number', min: 0 },
    { excelColumn: 'stock_level', dbColumn: 'stock_level', required: false, type: 'integer', min: 0 },
    { excelColumn: 'min_stock_level', dbColumn: 'min_stock_level', required: false, type: 'integer', min: 0 },
    { excelColumn: 'reorder_point', dbColumn: 'reorder_point', required: false, type: 'integer', min: 0 },
    { excelColumn: 'warehouse_location', dbColumn: 'warehouse_location', required: false, type: 'text' },
    { excelColumn: 'is_active', dbColumn: 'is_active', required: false, type: 'boolean' },
    { excelColumn: 'vendor_id', dbColumn: 'vendor_id', required: false, type: 'uuid' },
  ],
  mediaColumns: [
    { excelColumn: 'image_1', role: 'default_image' },
    { excelColumn: 'image_2', role: 'gallery', sortOrder: 2 },
    { excelColumn: 'image_3', role: 'gallery', sortOrder: 3 },
    { excelColumn: 'image_4', role: 'gallery', sortOrder: 4 },
    { excelColumn: 'image_5', role: 'gallery', sortOrder: 5 },
    { excelColumn: 'video_url', role: 'video' },
  ],
};
```

- [ ] **Step 2: Write the index/getter**

```ts
// src/lib/bulkImport/columnMaps/index.ts
import type { ColumnMap, Entity } from '../types';
import { componentsColumnMap } from './components';

const maps: Record<Entity, ColumnMap | null> = {
  component: componentsColumnMap,
  product: null,  // added in Task 24
};

export function getColumnMap(entity: Entity): ColumnMap {
  const map = maps[entity];
  if (!map) throw new Error(`No column map registered for entity: ${entity}`);
  return map;
}

export { componentsColumnMap };
```

- [ ] **Step 3: Type-check**

```bash
npm run type-check
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/bulkImport/columnMaps/
git commit -m "bulkImport: components column map"
```

---

### Task 8: Excel parser (TDD)

**Files:**
- Create: `src/lib/bulkImport/parser.ts`
- Create: `src/lib/bulkImport/__tests__/parser.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/bulkImport/__tests__/parser.test.ts
import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { parseWorkbook } from '../parser';
import { componentsColumnMap } from '../columnMaps/components';

function makeWorkbook(rows: Array<Record<string, unknown>>) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Components');
  return wb;
}

describe('parseWorkbook', () => {
  it('extracts rows from the first sheet', () => {
    const wb = makeWorkbook([
      { sku: 'BRK-001', name: 'Bracket', type: 'body', normal_price: 10, merchant_price: 8 },
      { sku: 'BRK-002', name: 'Hinge', type: 'body', normal_price: 25, merchant_price: 20 },
    ]);
    const result = parseWorkbook(wb, componentsColumnMap);
    expect(result.headerErrors).toEqual([]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].raw.sku).toBe('BRK-001');
    expect(result.rows[1].raw.name).toBe('Hinge');
  });

  it('reports missing required headers', () => {
    const wb = makeWorkbook([{ sku: 'X', name: 'Y' }]); // missing type, normal_price, merchant_price
    const result = parseWorkbook(wb, componentsColumnMap);
    expect(result.headerErrors.some(e => e.includes('type'))).toBe(true);
    expect(result.headerErrors.some(e => e.includes('normal_price'))).toBe(true);
  });

  it('flags unknown columns as warnings (not errors)', () => {
    const wb = makeWorkbook([{
      sku: 'X', name: 'Y', type: 'z', normal_price: 1, merchant_price: 1,
      mystery_column: 'foo',
    }]);
    const result = parseWorkbook(wb, componentsColumnMap);
    expect(result.headerErrors).toEqual([]);
    expect(result.unknownColumns).toContain('mystery_column');
  });

  it('sets rowIndex starting at 2 (after header)', () => {
    const wb = makeWorkbook([
      { sku: 'A', name: 'a', type: 't', normal_price: 1, merchant_price: 1 },
      { sku: 'B', name: 'b', type: 't', normal_price: 1, merchant_price: 1 },
    ]);
    const result = parseWorkbook(wb, componentsColumnMap);
    expect(result.rows[0].rowIndex).toBe(2);
    expect(result.rows[1].rowIndex).toBe(3);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- src/lib/bulkImport/__tests__/parser.test.ts
```
Expected: fails — module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/bulkImport/parser.ts
import * as XLSX from 'xlsx';
import type { ColumnMap, RawRow } from './types';

export interface ParseResult {
  rows: RawRow[];
  headerErrors: string[];
  unknownColumns: string[];
}

export function parseWorkbook(wb: XLSX.WorkBook, map: ColumnMap): ParseResult {
  const sheetName = wb.SheetNames[0];
  if (!sheetName) {
    return { rows: [], headerErrors: ['Workbook has no sheets'], unknownColumns: [] };
  }
  const sheet = wb.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

  const headerSet = new Set<string>();
  for (const row of json) {
    for (const k of Object.keys(row)) headerSet.add(k);
  }

  const expected = new Set([
    ...map.fields.map(f => f.excelColumn),
    ...map.mediaColumns.map(m => m.excelColumn),
  ]);
  const required = map.fields.filter(f => f.required).map(f => f.excelColumn);

  const headerErrors: string[] = [];
  for (const col of required) {
    if (!headerSet.has(col)) headerErrors.push(`Missing required column: "${col}"`);
  }
  const unknownColumns: string[] = [];
  for (const col of headerSet) {
    if (!expected.has(col)) unknownColumns.push(col);
  }

  const rows: RawRow[] = json.map((raw, i) => ({
    rowIndex: i + 2,
    raw,
  }));

  return { rows, headerErrors, unknownColumns };
}

export async function parseExcelFile(file: File, map: ColumnMap): Promise<ParseResult> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  return parseWorkbook(wb, map);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- src/lib/bulkImport/__tests__/parser.test.ts
```
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/bulkImport/parser.ts src/lib/bulkImport/__tests__/parser.test.ts
git commit -m "bulkImport: workbook parser with header validation"
```

---

### Task 9: Row validators (TDD)

**Files:**
- Create: `src/lib/bulkImport/validators.ts`
- Create: `src/lib/bulkImport/__tests__/validators.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/bulkImport/__tests__/validators.test.ts
import { describe, expect, it } from 'vitest';
import { validateRows } from '../validators';
import { componentsColumnMap } from '../columnMaps/components';

describe('validateRows', () => {
  const baseRow = {
    sku: 'BRK-001', name: 'Bracket', type: 'body',
    normal_price: 10, merchant_price: 8,
    image_1: 'https://drive.google.com/file/d/ID1/view',
    image_2: '', image_3: '', image_4: '', image_5: '', video_url: '',
  };

  it('accepts a valid row', () => {
    const summary = validateRows([{ rowIndex: 2, raw: baseRow }], componentsColumnMap);
    expect(summary.rows[0].errors).toEqual([]);
    expect(summary.rows[0].fields.component_sku).toBe('BRK-001');
    expect(summary.rows[0].mediaUrls.default).toContain('uc?export=download&id=ID1');
    expect(summary.validRows).toBe(1);
  });

  it('flags missing required fields', () => {
    const row = { ...baseRow, name: '' };
    const summary = validateRows([{ rowIndex: 2, raw: row }], componentsColumnMap);
    expect(summary.rows[0].errors.some(e => e.toLowerCase().includes('name'))).toBe(true);
    expect(summary.errorRows).toBe(1);
  });

  it('flags bad SKU pattern', () => {
    const row = { ...baseRow, sku: 'bad sku with spaces!!' };
    const summary = validateRows([{ rowIndex: 2, raw: row }], componentsColumnMap);
    expect(summary.rows[0].errors.some(e => e.toLowerCase().includes('sku'))).toBe(true);
  });

  it('flags duplicate SKUs within file', () => {
    const summary = validateRows([
      { rowIndex: 2, raw: baseRow },
      { rowIndex: 3, raw: { ...baseRow } },
    ], componentsColumnMap);
    const dupErrors = summary.rows.filter(r => r.errors.some(e => e.toLowerCase().includes('duplicate')));
    expect(dupErrors.length).toBeGreaterThan(0);
  });

  it('emits warning when merchant_price > normal_price', () => {
    const row = { ...baseRow, normal_price: 5, merchant_price: 10 };
    const summary = validateRows([{ rowIndex: 2, raw: row }], componentsColumnMap);
    expect(summary.rows[0].warnings.length).toBeGreaterThan(0);
    expect(summary.rows[0].errors).toEqual([]);
  });

  it('coerces booleans and numbers', () => {
    const row = { ...baseRow, is_active: 'yes', stock_level: '15' };
    const summary = validateRows([{ rowIndex: 2, raw: row }], componentsColumnMap);
    expect(summary.rows[0].fields.is_active).toBe(true);
    expect(summary.rows[0].fields.stock_level).toBe(15);
  });

  it('normalizes Drive URLs in media columns', () => {
    const row = { ...baseRow, image_2: 'https://drive.google.com/file/d/ID2/view' };
    const summary = validateRows([{ rowIndex: 2, raw: row }], componentsColumnMap);
    expect(summary.rows[0].mediaUrls.gallery[0]).toContain('uc?export=download&id=ID2');
  });

  it('rejects invalid URLs in media columns with a row error', () => {
    const row = { ...baseRow, image_1: 'not a url' };
    const summary = validateRows([{ rowIndex: 2, raw: row }], componentsColumnMap);
    expect(summary.rows[0].errors.some(e => e.toLowerCase().includes('image_1'))).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- src/lib/bulkImport/__tests__/validators.test.ts
```
Expected: fails — module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/bulkImport/validators.ts
import type { ColumnMap, FieldDef, ParsedRow, RawRow, ValidationSummary } from './types';
import { coerceText, coerceNumber, coerceInteger, coerceBoolean, coerceUuid } from './coerce';
import { normalizeMediaUrl } from './driveUrl';

function coerceField(value: unknown, field: FieldDef) {
  switch (field.type) {
    case 'text':    return coerceText(value);
    case 'number':  return coerceNumber(value, { min: field.min, max: field.max });
    case 'integer': return coerceInteger(value, { min: field.min, max: field.max });
    case 'boolean': return coerceBoolean(value);
    case 'uuid':    return coerceUuid(value);
    case 'url':     return coerceText(value);
  }
}

export function validateRows(raws: RawRow[], map: ColumnMap): ValidationSummary {
  const seenSkus = new Map<string, number>();
  const rows: ParsedRow[] = [];

  for (const raw of raws) {
    const errors: string[] = [];
    const warnings: string[] = [];
    const fields: Record<string, unknown> = {};

    for (const field of map.fields) {
      const inputValue = raw.raw[field.excelColumn];
      const result = coerceField(inputValue, field);
      if (!result.ok) {
        errors.push(`${field.excelColumn}: ${result.error}`);
        continue;
      }
      if (result.value === null) {
        if (field.required) {
          errors.push(`${field.excelColumn}: required`);
        }
        continue;
      }
      if (field.type === 'text' && field.pattern && typeof result.value === 'string') {
        if (!field.pattern.test(result.value)) {
          errors.push(`${field.excelColumn}: invalid format ("${result.value}")`);
          continue;
        }
      }
      if (field.type === 'text' && field.max && typeof result.value === 'string') {
        if (result.value.length > field.max) {
          errors.push(`${field.excelColumn}: too long (max ${field.max})`);
          continue;
        }
      }
      fields[field.dbColumn] = result.value;
    }

    const skuValue = fields[map.uniqueKey];
    if (typeof skuValue === 'string') {
      if (seenSkus.has(skuValue)) {
        errors.push(`duplicate SKU in file (first seen at row ${seenSkus.get(skuValue)})`);
      } else {
        seenSkus.set(skuValue, raw.rowIndex);
      }
    }

    const normal = fields['normal_price'] ?? fields['price_regular'];
    const merchant = fields['merchant_price'] ?? fields['price_merchant'];
    if (typeof normal === 'number' && typeof merchant === 'number' && merchant > normal) {
      warnings.push(`merchant_price (${merchant}) > normal_price (${normal})`);
    }

    const mediaUrls = {
      default: null as string | null,
      gallery: [] as string[],
      video: null as string | null,
    };
    for (const col of map.mediaColumns) {
      const raw_url = raw.raw[col.excelColumn];
      if (raw_url === null || raw_url === undefined || raw_url === '') continue;
      const normalized = normalizeMediaUrl(String(raw_url));
      if (!normalized) {
        errors.push(`${col.excelColumn}: invalid URL ("${raw_url}")`);
        continue;
      }
      if (col.role === 'default_image') mediaUrls.default = normalized;
      else if (col.role === 'gallery') mediaUrls.gallery.push(normalized);
      else if (col.role === 'video') mediaUrls.video = normalized;
    }

    rows.push({ rowIndex: raw.rowIndex, fields, mediaUrls, errors, warnings });
  }

  const validRows = rows.filter(r => r.errors.length === 0).length;
  const errorRows = rows.filter(r => r.errors.length > 0).length;
  const warningRows = rows.filter(r => r.errors.length === 0 && r.warnings.length > 0).length;

  return {
    rows,
    totalRows: rows.length,
    validRows,
    errorRows,
    warningRows,
    headerErrors: [],
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- src/lib/bulkImport/__tests__/validators.test.ts
```
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/bulkImport/validators.ts src/lib/bulkImport/__tests__/validators.test.ts
git commit -m "bulkImport: row validators with coercion + URL normalization"
```

---

### Task 10: Excel template generator script

**Files:**
- Create: `scripts/generate-import-templates.ts`
- Create: `public/templates/components-import-template.xlsx` (output)

- [ ] **Step 1: Write the generator**

```ts
// scripts/generate-import-templates.ts
// Run: npx tsx scripts/generate-import-templates.ts
// Generates downloadable .xlsx templates from the column maps.

import * as XLSX from 'xlsx';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { componentsColumnMap } from '../src/lib/bulkImport/columnMaps/components';
import type { ColumnMap } from '../src/lib/bulkImport/types';

const OUT_DIR = resolve(__dirname, '..', 'public', 'templates');

function buildTemplate(map: ColumnMap, sheetName: string, exampleRow: Record<string, unknown>) {
  const headers = [
    ...map.fields.map(f => f.excelColumn),
    ...map.mediaColumns.map(m => m.excelColumn),
  ];

  const wb = XLSX.utils.book_new();

  const data = [headers, headers.map(h => exampleRow[h] ?? '')];
  const sheet = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, sheet, sheetName);

  const instructions = [
    ['Column', 'Required?', 'Type', 'Notes'],
    ...map.fields.map(f => [f.excelColumn, f.required ? 'YES' : 'no', f.type,
      f.pattern ? `pattern: ${f.pattern}` :
      f.min !== undefined ? `min: ${f.min}` : '']),
    ...map.mediaColumns.map(m => [m.excelColumn, 'no', 'url',
      m.role === 'video' ? 'YouTube/Vimeo/Drive — stored as-is' :
      'Drive share URL or any https URL — re-hosted on import']),
    [],
    ['Drive sharing required', '', '', 'Right-click folder → Share → "Anyone with the link"'],
    ['Image size cap', '', '', 'Keep files under 25 MB to avoid Drive virus-scan interstitial'],
    ['Boolean values', '', '', 'TRUE / FALSE / yes / no / 1 / 0 all accepted'],
  ];
  const instSheet = XLSX.utils.aoa_to_sheet(instructions);
  XLSX.utils.book_append_sheet(wb, instSheet, 'Instructions');

  return wb;
}

const componentsExample = {
  sku: 'BRK-001',
  name: 'Universal Door Bracket',
  type: 'body',
  value: 'M8',
  description: 'Heavy-duty stainless steel bracket',
  normal_price: 12.50,
  merchant_price: 9.80,
  stock_level: 25,
  min_stock_level: 10,
  reorder_point: 15,
  warehouse_location: 'A1-03',
  is_active: 'TRUE',
  vendor_id: '',
  image_1: 'https://drive.google.com/file/d/EXAMPLE_FILE_ID/view',
  image_2: '', image_3: '', image_4: '', image_5: '',
  video_url: '',
};

mkdirSync(OUT_DIR, { recursive: true });
XLSX.writeFile(
  buildTemplate(componentsColumnMap, 'Components', componentsExample),
  resolve(OUT_DIR, 'components-import-template.xlsx')
);
console.log('Wrote components-import-template.xlsx');
```

- [ ] **Step 2: Install `tsx` if missing**

```bash
npx tsx --version
```
If error: `npm install --save-dev tsx`

- [ ] **Step 3: Run the generator**

```bash
npx tsx scripts/generate-import-templates.ts
```
Expected: `Wrote components-import-template.xlsx`. File exists at `public/templates/components-import-template.xlsx`.

- [ ] **Step 4: Verify file**

```bash
ls -la public/templates/
```
Expected: `components-import-template.xlsx` present, size > 5 KB.

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-import-templates.ts public/templates/components-import-template.xlsx package.json package-lock.json
git commit -m "bulkImport: template generator + components template"
```

---

## Phase 3: Edge Function

### Task 11: Edge function — auth helper

**Files:**
- Create: `supabase/functions/bulk-import-processor/auth.ts`

- [ ] **Step 1: Write the auth helper**

```ts
// supabase/functions/bulk-import-processor/auth.ts
// Verifies the requester is a real, active admin. Mirrors the pattern used by
// admin-create-vendor / admin-delete-vendor.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function verifyAdmin(
  supabase: SupabaseClient,
  admin_id: string | undefined
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  if (!admin_id) {
    return { ok: false, status: 400, message: 'admin_id required' };
  }
  const { data: admin, error } = await supabase
    .from('admin_profiles')
    .select('id, is_active')
    .eq('id', admin_id)
    .maybeSingle();
  if (error || !admin) {
    return { ok: false, status: 403, message: 'Unauthorized — admin profile not found.' };
  }
  if ((admin as any).is_active === false) {
    return { ok: false, status: 403, message: 'Admin account is inactive.' };
  }
  return { ok: true };
}
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/bulk-import-processor/auth.ts
git commit -m "bulkImport: edge function admin auth helper"
```

---

### Task 12: Edge function — Drive URL helper (duplicated)

**Files:**
- Create: `supabase/functions/bulk-import-processor/driveUrl.ts`

- [ ] **Step 1: Duplicate the client-side helper (Deno can't import from src)**

```ts
// supabase/functions/bulk-import-processor/driveUrl.ts
// Mirror of src/lib/bulkImport/driveUrl.ts. Keep in sync.

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
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/bulk-import-processor/driveUrl.ts
git commit -m "bulkImport: edge-function-side drive URL helper"
```

---

### Task 13: Edge function — image processor

**Files:**
- Create: `supabase/functions/bulk-import-processor/imageProcessor.ts`

- [ ] **Step 1: Write the image processor**

```ts
// supabase/functions/bulk-import-processor/imageProcessor.ts
// Downloads a public image URL, resizes to max 1920px, encodes JPEG @ 85,
// and uploads to bucket "product-images". Returns the public URL.
//
// JPEG (not WebP): imagescript supports encodeJPEG with quality control;
// WebP encoding requires a different lib that needs Deno --allow-ffi. JPEG
// gives equivalent compression for photos and is universally supported.

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
  destinationFolder: string,   // e.g. "imports/admin/20260518"
  filenameBase: string         // e.g. "BRK-001-1"
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
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/bulk-import-processor/imageProcessor.ts
git commit -m "bulkImport: edge function image download + resize + upload"
```

---

### Task 14: Edge function — DB writer

**Files:**
- Create: `supabase/functions/bulk-import-processor/dbWriter.ts`

- [ ] **Step 1: Write the DB writer**

```ts
// supabase/functions/bulk-import-processor/dbWriter.ts

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type Mode = 'insert' | 'update' | 'upsert';

export interface WriteInput {
  table: string;
  uniqueKey: string;
  mode: Mode;
  fields: Record<string, unknown>;
  defaultImageUrl: string | null;
  galleryUrls: string[];
  videoUrl: string | null;
}

export interface WriteResult {
  status: 'inserted' | 'updated' | 'skipped';
  recordId: string;
}

export async function writeRow(
  supabase: SupabaseClient,
  input: WriteInput
): Promise<WriteResult> {
  const skuValue = input.fields[input.uniqueKey];
  const { data: existing } = await supabase
    .from(input.table)
    .select('id')
    .eq(input.uniqueKey, skuValue as string)
    .maybeSingle();

  const payload: Record<string, unknown> = { ...input.fields };
  if (input.defaultImageUrl !== null) payload['default_image_url'] = input.defaultImageUrl;
  if (input.videoUrl !== null) payload['video_url'] = input.videoUrl;

  if (existing) {
    if (input.mode === 'insert') {
      return { status: 'skipped', recordId: (existing as any).id };
    }
    const { data: updated, error } = await supabase
      .from(input.table)
      .update(payload)
      .eq('id', (existing as any).id)
      .select('id')
      .single();
    if (error) throw error;
    await writeGallery(supabase, (updated as any).id, input.galleryUrls, /*replace=*/true);
    return { status: 'updated', recordId: (updated as any).id };
  } else {
    if (input.mode === 'update') {
      throw new Error(`SKU not found and mode=update: ${skuValue}`);
    }
    const { data: inserted, error } = await supabase
      .from(input.table)
      .insert(payload)
      .select('id')
      .single();
    if (error) throw error;
    await writeGallery(supabase, (inserted as any).id, input.galleryUrls, /*replace=*/false);
    return { status: 'inserted', recordId: (inserted as any).id };
  }
}

async function writeGallery(
  supabase: SupabaseClient,
  componentId: string,
  urls: string[],
  replace: boolean
) {
  if (replace) {
    await supabase.from('component_images').delete().eq('component_id', componentId);
  }
  if (urls.length === 0) return;
  const rows = urls.map((url, idx) => ({
    component_id: componentId,
    url,
    is_primary: false,
    sort_order: idx + 2,
    alt_text: null,
  }));
  const { error } = await supabase.from('component_images').insert(rows);
  if (error) throw error;
}
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/bulk-import-processor/dbWriter.ts
git commit -m "bulkImport: edge function DB writer (insert/update/upsert)"
```

---

### Task 15: Edge function — main handler

**Files:**
- Create: `supabase/functions/bulk-import-processor/index.ts`

- [ ] **Step 1: Write the handler**

```ts
// supabase/functions/bulk-import-processor/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAdmin } from "./auth.ts";
import { processImageUrl } from "./imageProcessor.ts";
import { writeRow, type Mode } from "./dbWriter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RowPayload {
  rowIndex: number;
  fields: Record<string, unknown>;
  mediaUrls: { default: string | null; gallery: string[]; video: string | null };
}

interface Payload {
  entity: 'component' | 'product';
  mode: Mode;
  admin_id: string;
  rows: RowPayload[];
}

interface RowResult {
  rowIndex: number;
  status: 'inserted' | 'updated' | 'skipped' | 'error';
  sku: string;
  recordId?: string;
  error?: string;
  mediaErrors?: string[];
}

const TABLE_BY_ENTITY: Record<string, { table: string; uniqueKey: string }> = {
  component: { table: 'component_library', uniqueKey: 'component_sku' },
  product:   { table: 'products_new',      uniqueKey: 'sku' },
};

async function processWithLimit<T>(items: T[], limit: number, fn: (t: T) => Promise<RowResult>): Promise<RowResult[]> {
  const results: RowResult[] = new Array(items.length);
  let i = 0;
  const workers = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      results[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return results;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = (await req.json()) as Payload;
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const adminCheck = await verifyAdmin(supabase, body.admin_id);
    if (!adminCheck.ok) {
      return new Response(JSON.stringify({ error: adminCheck.message }), {
        status: adminCheck.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const entityCfg = TABLE_BY_ENTITY[body.entity];
    if (!entityCfg) {
      return new Response(JSON.stringify({ error: `unknown entity: ${body.entity}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const dateFolder = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const folder = `imports/admin/${dateFolder}`;

    const results = await processWithLimit(body.rows, 5, async (row) => {
      const sku = String(row.fields[entityCfg.uniqueKey] ?? '');
      const mediaErrors: string[] = [];

      let defaultImg: string | null = null;
      if (row.mediaUrls.default) {
        const r = await processImageUrl(supabase, row.mediaUrls.default, folder, `${sku}-1`);
        if (r.ok) defaultImg = r.publicUrl;
        else mediaErrors.push(`image_1: ${r.error}`);
      }

      const gallery: string[] = [];
      for (let i = 0; i < row.mediaUrls.gallery.length; i++) {
        const url = row.mediaUrls.gallery[i];
        const r = await processImageUrl(supabase, url, folder, `${sku}-${i + 2}`);
        if (r.ok) gallery.push(r.publicUrl);
        else mediaErrors.push(`image_${i + 2}: ${r.error}`);
      }

      try {
        const w = await writeRow(supabase, {
          table: entityCfg.table,
          uniqueKey: entityCfg.uniqueKey,
          mode: body.mode,
          fields: row.fields,
          defaultImageUrl: defaultImg,
          galleryUrls: gallery,
          videoUrl: row.mediaUrls.video,
        });
        return {
          rowIndex: row.rowIndex,
          status: w.status,
          sku,
          recordId: w.recordId,
          mediaErrors: mediaErrors.length ? mediaErrors : undefined,
        };
      } catch (e) {
        return {
          rowIndex: row.rowIndex,
          status: 'error',
          sku,
          error: (e as Error).message,
          mediaErrors: mediaErrors.length ? mediaErrors : undefined,
        };
      }
    });

    const succeeded = results.filter(r => r.status !== 'error').length;
    const failed = results.filter(r => r.status === 'error').length;
    await supabase.from('bulk_import_logs').insert({
      admin_id: body.admin_id,
      entity: body.entity,
      mode: body.mode,
      total_rows: results.length,
      succeeded,
      failed,
      result_json: results as any,
    });

    return new Response(JSON.stringify({ results }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

- [ ] **Step 2: Deploy via Supabase MCP**

Use `mcp__supabase__deploy_edge_function` with `name=bulk-import-processor` and the full source assembled from the four files (`index.ts`, `auth.ts`, `driveUrl.ts`, `imageProcessor.ts`, `dbWriter.ts`).

The MCP `deploy_edge_function` tool expects the function as a single source. If it supports multi-file deploys, pass all 5 files. If not, the agent should pass an `index.ts` that inlines all helpers (concatenate them with the `import { ... } from "./X.ts"` lines removed and duplicate-export lines removed).

Expected: deploy succeeds, function appears in `mcp__supabase__list_edge_functions`.

- [ ] **Step 3: Smoke test**

```bash
curl -X POST "$SUPABASE_URL/functions/v1/bulk-import-processor" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"entity":"component","mode":"insert","admin_id":"00000000-0000-0000-0000-000000000000","rows":[]}'
```
Expected: `{"error":"Unauthorized — admin profile not found."}` with HTTP 403 (proves auth gate works).

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/bulk-import-processor/index.ts
git commit -m "bulkImport: edge function handler with admin gate + audit log"
```

---

### Task 16: `get-bulk-import-logs` read function

**Files:**
- Create: `supabase/functions/get-bulk-import-logs/index.ts`

- [ ] **Step 1: Write the function**

```ts
// supabase/functions/get-bulk-import-logs/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json() as { admin_id: string; limit?: number };
    if (!body.admin_id) {
      return new Response(JSON.stringify({ error: 'admin_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: admin } = await supabase
      .from('admin_profiles')
      .select('id, is_active')
      .eq('id', body.admin_id)
      .maybeSingle();
    if (!admin || (admin as any).is_active === false) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data, error } = await supabase
      .from('bulk_import_logs')
      .select('*')
      .order('run_at', { ascending: false })
      .limit(body.limit ?? 50);
    if (error) throw error;
    return new Response(JSON.stringify({ logs: data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
```

- [ ] **Step 2: Deploy**

`mcp__supabase__deploy_edge_function` with `name=get-bulk-import-logs`.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/get-bulk-import-logs/index.ts
git commit -m "bulkImport: get-bulk-import-logs read function"
```

---

## Phase 4: Admin UI

### Task 17: API client (client → edge function wrapper)

**Files:**
- Create: `src/lib/bulkImport/api.ts`

- [ ] **Step 1: Write the client**

```ts
// src/lib/bulkImport/api.ts
import { supabase } from '@/lib/supabase';
import type { ImportRequest, BatchResult, ParsedRow, ImportMode, Entity } from './types';

const BATCH_SIZE = 20;

export interface RunImportOpts {
  entity: Entity;
  mode: ImportMode;
  adminId: string;
  rows: ParsedRow[];
  onBatchComplete?: (done: number, total: number, results: BatchResult[]) => void;
}

export async function runImport(opts: RunImportOpts): Promise<BatchResult[]> {
  const all: BatchResult[] = [];
  const valid = opts.rows.filter(r => r.errors.length === 0);
  let done = 0;

  for (let i = 0; i < valid.length; i += BATCH_SIZE) {
    const batch = valid.slice(i, i + BATCH_SIZE);
    const payload: ImportRequest = {
      entity: opts.entity,
      mode: opts.mode,
      admin_id: opts.adminId,
      rows: batch.map(r => ({
        rowIndex: r.rowIndex,
        fields: r.fields,
        mediaUrls: r.mediaUrls,
      })),
    };
    const { data, error } = await supabase.functions.invoke<{ results: BatchResult[] }>(
      'bulk-import-processor', { body: payload }
    );
    if (error || !data) {
      throw new Error(`Batch ${i / BATCH_SIZE + 1} failed: ${error?.message ?? 'unknown'}`);
    }
    all.push(...data.results);
    done += batch.length;
    opts.onBatchComplete?.(done, valid.length, data.results);
  }
  return all;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/bulkImport/api.ts
git commit -m "bulkImport: client API with batched edge function calls"
```

---

### Task 18: Admin page shell + entity picker + template download

**Files:**
- Create: `src/pages/admin/BulkImport.tsx`
- Create: `src/components/admin/bulkImport/EntityPicker.tsx`
- Create: `src/components/admin/bulkImport/TemplateDownloader.tsx`

- [ ] **Step 1: Write EntityPicker**

```tsx
// src/components/admin/bulkImport/EntityPicker.tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { Entity } from '@/lib/bulkImport/types';

interface Props {
  value: Entity;
  onChange: (v: Entity) => void;
  productsEnabled: boolean;
}

export function EntityPicker({ value, onChange, productsEnabled }: Props) {
  return (
    <div className="space-y-2">
      <Label htmlFor="entity">Import what?</Label>
      <Select value={value} onValueChange={(v) => onChange(v as Entity)}>
        <SelectTrigger id="entity" className="w-64">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="component">Components</SelectItem>
          <SelectItem value="product" disabled={!productsEnabled}>
            Products {productsEnabled ? '' : '(coming soon)'}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
```

- [ ] **Step 2: Write TemplateDownloader**

```tsx
// src/components/admin/bulkImport/TemplateDownloader.tsx
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import type { Entity } from '@/lib/bulkImport/types';

const TEMPLATES: Record<Entity, string> = {
  component: '/templates/components-import-template.xlsx',
  product: '/templates/products-import-template.xlsx',
};

export function TemplateDownloader({ entity }: { entity: Entity }) {
  return (
    <Button variant="outline" asChild>
      <a href={TEMPLATES[entity]} download>
        <Download className="h-4 w-4 mr-2" />
        Download {entity} template
      </a>
    </Button>
  );
}
```

- [ ] **Step 3: Write BulkImport page shell**

```tsx
// src/pages/admin/BulkImport.tsx
import { useState } from 'react';
import { EntityPicker } from '@/components/admin/bulkImport/EntityPicker';
import { TemplateDownloader } from '@/components/admin/bulkImport/TemplateDownloader';
import type { Entity } from '@/lib/bulkImport/types';

export default function BulkImport() {
  const [entity, setEntity] = useState<Entity>('component');
  const productsEnabled = false;

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bulk Import</h1>
        <p className="text-sm text-muted-foreground">
          Upload a filled Excel template to create components in bulk.
          Google Drive image URLs are downloaded and re-hosted automatically.
        </p>
      </div>

      <div className="flex items-end gap-4">
        <EntityPicker value={entity} onChange={setEntity} productsEnabled={productsEnabled} />
        <TemplateDownloader entity={entity} />
      </div>

      <div className="border-2 border-dashed rounded-lg p-12 text-center text-muted-foreground">
        File upload + preview (next task)
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Type-check**

```bash
npm run type-check
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/BulkImport.tsx src/components/admin/bulkImport/EntityPicker.tsx src/components/admin/bulkImport/TemplateDownloader.tsx
git commit -m "bulkImport: admin page shell + entity picker + template download"
```

---

### Task 19: Register route + admin nav link

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/admin/AdminLayout.tsx`

- [ ] **Step 1: Add route in App.tsx**

Find the admin `<Route path="/admin/*">` block. Inside its nested routes (where other admin pages like `products` are registered), add:

```tsx
import BulkImport from '@/pages/admin/BulkImport';
// ...
<Route path="bulk-import" element={<BulkImport />} />
```

- [ ] **Step 2: Add nav link in AdminLayout.tsx**

In the `navigation` array, inside the appropriate group (Products group makes most sense), add to its `items`:

```tsx
{ name: 'Bulk Import', href: '/admin/bulk-import', icon: Upload },
```

Add `Upload` to the lucide-react import at the top of the file.

- [ ] **Step 3: Verify route loads**

```bash
npm run dev
```
Navigate to `http://localhost:5173/admin/bulk-import` (after admin login). Confirm page loads, entity picker shows, template download link visible.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/components/admin/AdminLayout.tsx
git commit -m "bulkImport: register /admin/bulk-import route + nav link"
```

---

### Task 20: File dropzone with client-side parse & validate

**Files:**
- Create: `src/components/admin/bulkImport/FileDropzone.tsx`
- Modify: `src/pages/admin/BulkImport.tsx`

- [ ] **Step 1: Write FileDropzone**

```tsx
// src/components/admin/bulkImport/FileDropzone.tsx
import { useState, useCallback } from 'react';
import { Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  onFile: (file: File) => void;
  disabled?: boolean;
}

export function FileDropzone({ onFile, disabled }: Props) {
  const [over, setOver] = useState(false);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setOver(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }, [disabled, onFile]);

  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={cn(
        'border-2 border-dashed rounded-lg p-12 text-center cursor-pointer block',
        over ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
      <p className="font-medium">Drop the filled Excel file here</p>
      <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
      <input
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        disabled={disabled}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
      />
    </label>
  );
}
```

- [ ] **Step 2: Wire dropzone into BulkImport page**

Replace the placeholder div in `src/pages/admin/BulkImport.tsx` with file handling. New full file:

```tsx
// src/pages/admin/BulkImport.tsx
import { useState } from 'react';
import { EntityPicker } from '@/components/admin/bulkImport/EntityPicker';
import { TemplateDownloader } from '@/components/admin/bulkImport/TemplateDownloader';
import { FileDropzone } from '@/components/admin/bulkImport/FileDropzone';
import { parseExcelFile } from '@/lib/bulkImport/parser';
import { validateRows } from '@/lib/bulkImport/validators';
import { getColumnMap } from '@/lib/bulkImport/columnMaps';
import type { Entity, ValidationSummary } from '@/lib/bulkImport/types';
import { useToast } from '@/hooks/use-toast';

export default function BulkImport() {
  const [entity, setEntity] = useState<Entity>('component');
  const [summary, setSummary] = useState<ValidationSummary | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const { toast } = useToast();
  const productsEnabled = false;

  const handleFile = async (file: File) => {
    try {
      const map = getColumnMap(entity);
      const parsed = await parseExcelFile(file, map);
      if (parsed.headerErrors.length > 0) {
        toast({
          title: 'Header errors',
          description: parsed.headerErrors.join('; '),
          variant: 'destructive',
        });
        return;
      }
      const v = validateRows(parsed.rows, map);
      v.headerErrors = parsed.headerErrors;
      setSummary(v);
      setFileName(file.name);
    } catch (e) {
      toast({ title: 'Parse failed', description: (e as Error).message, variant: 'destructive' });
    }
  };

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bulk Import</h1>
        <p className="text-sm text-muted-foreground">
          Upload a filled Excel template to create components in bulk.
          Google Drive image URLs are downloaded and re-hosted automatically.
        </p>
      </div>

      <div className="flex items-end gap-4">
        <EntityPicker value={entity} onChange={setEntity} productsEnabled={productsEnabled} />
        <TemplateDownloader entity={entity} />
      </div>

      {!summary && <FileDropzone onFile={handleFile} />}
      {summary && (
        <div className="space-y-2 p-4 border rounded-lg">
          <p className="text-sm">{fileName}</p>
          <p className="text-sm">
            ✓ {summary.validRows} valid · ✗ {summary.errorRows} errors · ⚠ {summary.warningRows} warnings
          </p>
          <button className="text-sm underline" onClick={() => setSummary(null)}>Choose a different file</button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify in browser**

```bash
npm run dev
```
Drop a small valid .xlsx file → see counts displayed.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/bulkImport/FileDropzone.tsx src/pages/admin/BulkImport.tsx
git commit -m "bulkImport: file dropzone + client-side parse & validate"
```

---

### Task 21: Preview table

**Files:**
- Create: `src/components/admin/bulkImport/PreviewTable.tsx`
- Modify: `src/pages/admin/BulkImport.tsx`

- [ ] **Step 1: Write PreviewTable**

```tsx
// src/components/admin/bulkImport/PreviewTable.tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ValidationSummary } from '@/lib/bulkImport/types';

interface Props {
  summary: ValidationSummary;
}

export function PreviewTable({ summary }: Props) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">Row</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Normal</TableHead>
            <TableHead className="text-right">Merchant</TableHead>
            <TableHead className="text-right">Imgs</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {summary.rows.map((r) => {
            const sku = (r.fields['component_sku'] ?? r.fields['sku']) as string;
            const name = r.fields['name'] as string;
            const type = (r.fields['component_type'] ?? r.fields['brand']) as string;
            const np = r.fields['normal_price'] ?? r.fields['price_regular'];
            const mp = r.fields['merchant_price'] ?? r.fields['price_merchant'];
            const imgCount = (r.mediaUrls.default ? 1 : 0) + r.mediaUrls.gallery.length;
            const hasErr = r.errors.length > 0;
            const hasWarn = r.warnings.length > 0;
            return (
              <TableRow
                key={r.rowIndex}
                className={cn(hasErr && 'bg-red-50 dark:bg-red-950/30',
                              !hasErr && hasWarn && 'bg-yellow-50 dark:bg-yellow-950/30')}
              >
                <TableCell className="font-mono text-xs">{r.rowIndex}</TableCell>
                <TableCell className="font-mono text-xs">{sku ?? '—'}</TableCell>
                <TableCell>{name ?? '—'}</TableCell>
                <TableCell>{type ?? '—'}</TableCell>
                <TableCell className="text-right">{typeof np === 'number' ? np.toFixed(2) : '—'}</TableCell>
                <TableCell className="text-right">{typeof mp === 'number' ? mp.toFixed(2) : '—'}</TableCell>
                <TableCell className="text-right">{imgCount}</TableCell>
                <TableCell className="text-xs">
                  {hasErr ? (
                    <div className="space-y-0.5">
                      {r.errors.map((e, i) => <Badge key={i} variant="destructive" className="mr-1">{e}</Badge>)}
                    </div>
                  ) : hasWarn ? (
                    <Badge variant="outline" className="border-yellow-500 text-yellow-700">{r.warnings.join('; ')}</Badge>
                  ) : (
                    <Badge variant="outline" className="border-green-500 text-green-700">Ready</Badge>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 2: Render PreviewTable in BulkImport page**

In `src/pages/admin/BulkImport.tsx`, after the summary line, add:

```tsx
import { PreviewTable } from '@/components/admin/bulkImport/PreviewTable';
// ...
{summary && <PreviewTable summary={summary} />}
```

- [ ] **Step 3: Verify in browser**

Drop a file with mixed valid/error rows → confirm color-coded preview.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/bulkImport/PreviewTable.tsx src/pages/admin/BulkImport.tsx
git commit -m "bulkImport: preview table with error highlighting"
```

---

### Task 22: Mode selector + import progress + result summary

**Files:**
- Create: `src/components/admin/bulkImport/ModeSelector.tsx`
- Create: `src/components/admin/bulkImport/ImportProgress.tsx`
- Create: `src/components/admin/bulkImport/ResultSummary.tsx`
- Modify: `src/pages/admin/BulkImport.tsx`

- [ ] **Step 1: Write ModeSelector**

```tsx
// src/components/admin/bulkImport/ModeSelector.tsx
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import type { ImportMode } from '@/lib/bulkImport/types';

interface Props {
  value: ImportMode;
  onChange: (v: ImportMode) => void;
}

export function ModeSelector({ value, onChange }: Props) {
  return (
    <div className="space-y-2">
      <Label>Mode</Label>
      <RadioGroup value={value} onValueChange={(v) => onChange(v as ImportMode)}>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="insert" id="m-insert" />
          <Label htmlFor="m-insert" className="font-normal">Insert new only (skip existing SKUs)</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="update" id="m-update" />
          <Label htmlFor="m-update" className="font-normal">Update existing only (skip new SKUs)</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="upsert" id="m-upsert" />
          <Label htmlFor="m-upsert" className="font-normal">Upsert (insert new + update existing)</Label>
        </div>
      </RadioGroup>
    </div>
  );
}
```

- [ ] **Step 2: Write ImportProgress**

```tsx
// src/components/admin/bulkImport/ImportProgress.tsx
import { Progress } from '@/components/ui/progress';

interface Props {
  done: number;
  total: number;
}

export function ImportProgress({ done, total }: Props) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>Importing…</span>
        <span className="font-mono">{done} / {total} ({pct}%)</span>
      </div>
      <Progress value={pct} />
    </div>
  );
}
```

- [ ] **Step 3: Write ResultSummary**

```tsx
// src/components/admin/bulkImport/ResultSummary.tsx
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, SkipForward } from 'lucide-react';
import type { BatchResult } from '@/lib/bulkImport/types';

interface Props {
  results: BatchResult[];
  onReset: () => void;
}

export function ResultSummary({ results, onReset }: Props) {
  const inserted = results.filter(r => r.status === 'inserted').length;
  const updated  = results.filter(r => r.status === 'updated').length;
  const skipped  = results.filter(r => r.status === 'skipped').length;
  const errors   = results.filter(r => r.status === 'error');

  return (
    <div className="space-y-4">
      <div className="flex gap-3 text-sm">
        <Badge variant="outline" className="border-green-500 text-green-700">
          <CheckCircle2 className="h-3 w-3 mr-1" /> {inserted} inserted
        </Badge>
        <Badge variant="outline" className="border-blue-500 text-blue-700">
          <CheckCircle2 className="h-3 w-3 mr-1" /> {updated} updated
        </Badge>
        <Badge variant="outline" className="border-yellow-500 text-yellow-700">
          <SkipForward className="h-3 w-3 mr-1" /> {skipped} skipped
        </Badge>
        {errors.length > 0 && (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" /> {errors.length} errors
          </Badge>
        )}
      </div>
      {errors.length > 0 && (
        <div className="border rounded p-3 text-sm space-y-1 max-h-64 overflow-y-auto">
          <div className="font-semibold">Errors:</div>
          {errors.map(r => (
            <div key={r.rowIndex} className="font-mono text-xs">
              Row {r.rowIndex} ({r.sku}): {r.error ?? 'unknown'}
              {r.mediaErrors && r.mediaErrors.length > 0 &&
                <span className="text-muted-foreground"> · {r.mediaErrors.join('; ')}</span>}
            </div>
          ))}
        </div>
      )}
      <button onClick={onReset} className="text-sm underline">Import another file</button>
    </div>
  );
}
```

- [ ] **Step 4: Wire confirm flow into BulkImport page**

Full file rewrite of `src/pages/admin/BulkImport.tsx`:

```tsx
// src/pages/admin/BulkImport.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { EntityPicker } from '@/components/admin/bulkImport/EntityPicker';
import { TemplateDownloader } from '@/components/admin/bulkImport/TemplateDownloader';
import { FileDropzone } from '@/components/admin/bulkImport/FileDropzone';
import { PreviewTable } from '@/components/admin/bulkImport/PreviewTable';
import { ModeSelector } from '@/components/admin/bulkImport/ModeSelector';
import { ImportProgress } from '@/components/admin/bulkImport/ImportProgress';
import { ResultSummary } from '@/components/admin/bulkImport/ResultSummary';
import { parseExcelFile } from '@/lib/bulkImport/parser';
import { validateRows } from '@/lib/bulkImport/validators';
import { getColumnMap } from '@/lib/bulkImport/columnMaps';
import { runImport } from '@/lib/bulkImport/api';
import type { Entity, ValidationSummary, ImportMode, BatchResult } from '@/lib/bulkImport/types';
import { useToast } from '@/hooks/use-toast';

type Phase = 'pick' | 'preview' | 'running' | 'done';

function getAdminId(): string | null {
  const raw = localStorage.getItem('admin_user');
  if (!raw) return null;
  try { return (JSON.parse(raw) as { id?: string }).id ?? null; } catch { return null; }
}

export default function BulkImport() {
  const [phase, setPhase] = useState<Phase>('pick');
  const [entity, setEntity] = useState<Entity>('component');
  const [mode, setMode] = useState<ImportMode>('upsert');
  const [summary, setSummary] = useState<ValidationSummary | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<BatchResult[]>([]);
  const { toast } = useToast();
  const productsEnabled = false;

  const reset = () => {
    setPhase('pick'); setSummary(null); setFileName(''); setResults([]); setProgress({ done: 0, total: 0 });
  };

  const handleFile = async (file: File) => {
    try {
      const map = getColumnMap(entity);
      const parsed = await parseExcelFile(file, map);
      if (parsed.headerErrors.length > 0) {
        toast({ title: 'Header errors', description: parsed.headerErrors.join('; '), variant: 'destructive' });
        return;
      }
      const v = validateRows(parsed.rows, map);
      setSummary(v); setFileName(file.name); setPhase('preview');
    } catch (e) {
      toast({ title: 'Parse failed', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const handleConfirm = async () => {
    if (!summary) return;
    const adminId = getAdminId();
    if (!adminId) { toast({ title: 'Not signed in', variant: 'destructive' }); return; }
    setPhase('running');
    setProgress({ done: 0, total: summary.validRows });
    try {
      const out = await runImport({
        entity, mode, adminId, rows: summary.rows,
        onBatchComplete: (done, total) => setProgress({ done, total }),
      });
      setResults(out); setPhase('done');
    } catch (e) {
      toast({ title: 'Import failed', description: (e as Error).message, variant: 'destructive' });
      setPhase('preview');
    }
  };

  return (
    <div className="p-6 max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bulk Import</h1>
        <p className="text-sm text-muted-foreground">
          Upload a filled Excel template to create components in bulk.
          Google Drive image URLs are downloaded and re-hosted automatically.
        </p>
      </div>

      <div className="flex items-end gap-4">
        <EntityPicker value={entity} onChange={setEntity} productsEnabled={productsEnabled} />
        <TemplateDownloader entity={entity} />
      </div>

      {phase === 'pick' && <FileDropzone onFile={handleFile} />}

      {phase === 'preview' && summary && (
        <div className="space-y-4">
          <div className="p-4 border rounded-lg flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{fileName}</p>
              <p className="text-sm">
                ✓ {summary.validRows} valid · ✗ {summary.errorRows} errors · ⚠ {summary.warningRows} warnings
              </p>
            </div>
            <button className="text-sm underline" onClick={reset}>Choose a different file</button>
          </div>
          <PreviewTable summary={summary} />
          <ModeSelector value={mode} onChange={setMode} />
          <Button
            onClick={handleConfirm}
            disabled={summary.validRows === 0}
          >
            Confirm import: {summary.validRows} rows
          </Button>
        </div>
      )}

      {phase === 'running' && <ImportProgress done={progress.done} total={progress.total} />}

      {phase === 'done' && <ResultSummary results={results} onReset={reset} />}
    </div>
  );
}
```

- [ ] **Step 5: Verify end-to-end in browser**

```bash
npm run dev
```
- Navigate to `/admin/bulk-import`
- Download template
- Fill 2-3 rows with real Drive URLs from a public folder
- Upload → preview shows
- Click "Confirm" → progress bar → result summary
- Verify rows in `component_library` via Supabase MCP `execute_sql`

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/bulkImport/ModeSelector.tsx src/components/admin/bulkImport/ImportProgress.tsx src/components/admin/bulkImport/ResultSummary.tsx src/pages/admin/BulkImport.tsx
git commit -m "bulkImport: full UI flow with mode selector, progress, results"
```

---

## Phase 5: Products Column Map

### Task 23: Products column map + template

**Files:**
- Create: `src/lib/bulkImport/columnMaps/products.ts`
- Modify: `src/lib/bulkImport/columnMaps/index.ts`
- Modify: `scripts/generate-import-templates.ts`

- [ ] **Step 1: Inspect products_new schema first**

```sql
-- Run via mcp__supabase__execute_sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'products_new'
ORDER BY ordinal_position;
```

Use the returned columns to confirm field names match what's in the column map below. If `screen_size`, `year_from`, `year_to`, etc. don't exist, drop them from the map.

- [ ] **Step 2: Write products column map**

```ts
// src/lib/bulkImport/columnMaps/products.ts
import type { ColumnMap } from '../types';

export const productsColumnMap: ColumnMap = {
  entity: 'product',
  table: 'products_new',
  uniqueKey: 'sku',
  fields: [
    { excelColumn: 'sku', dbColumn: 'sku', required: true, type: 'text', pattern: /^[A-Z0-9-]{3,40}$/i },
    { excelColumn: 'name', dbColumn: 'name', required: true, type: 'text', max: 200 },
    { excelColumn: 'description', dbColumn: 'description', required: false, type: 'text' },
    { excelColumn: 'brand', dbColumn: 'brand', required: false, type: 'text' },
    { excelColumn: 'model', dbColumn: 'model', required: false, type: 'text' },
    { excelColumn: 'year_from', dbColumn: 'year_from', required: false, type: 'integer', min: 1900, max: 2100 },
    { excelColumn: 'year_to', dbColumn: 'year_to', required: false, type: 'integer', min: 1900, max: 2100 },
    { excelColumn: 'normal_price', dbColumn: 'price_regular', required: true, type: 'number', min: 0 },
    { excelColumn: 'merchant_price', dbColumn: 'price_merchant', required: true, type: 'number', min: 0 },
    { excelColumn: 'stock_on_hand', dbColumn: 'stock_on_hand', required: false, type: 'integer', min: 0 },
    { excelColumn: 'is_active', dbColumn: 'is_active', required: false, type: 'boolean' },
    { excelColumn: 'vendor_id', dbColumn: 'vendor_id', required: false, type: 'uuid' },
  ],
  mediaColumns: [
    { excelColumn: 'image_1', role: 'default_image' },
    { excelColumn: 'image_2', role: 'gallery', sortOrder: 2 },
    { excelColumn: 'image_3', role: 'gallery', sortOrder: 3 },
    { excelColumn: 'image_4', role: 'gallery', sortOrder: 4 },
    { excelColumn: 'image_5', role: 'gallery', sortOrder: 5 },
    { excelColumn: 'video_url', role: 'video' },
  ],
};
```

If Step 1 revealed missing fields, remove them from this map before continuing.

- [ ] **Step 3: Register in index**

```ts
// src/lib/bulkImport/columnMaps/index.ts
import type { ColumnMap, Entity } from '../types';
import { componentsColumnMap } from './components';
import { productsColumnMap } from './products';

const maps: Record<Entity, ColumnMap> = {
  component: componentsColumnMap,
  product: productsColumnMap,
};

export function getColumnMap(entity: Entity): ColumnMap {
  return maps[entity];
}

export { componentsColumnMap, productsColumnMap };
```

- [ ] **Step 4: Generate product template**

Add to bottom of `scripts/generate-import-templates.ts`:

```ts
import { productsColumnMap } from '../src/lib/bulkImport/columnMaps/products';

const productsExample = {
  sku: 'PRD-001',
  name: 'Android Head Unit 10"',
  description: '10-inch Android car head unit with GPS and Bluetooth',
  brand: 'Honda',
  model: 'Civic',
  year_from: 2018,
  year_to: 2022,
  normal_price: 599.00,
  merchant_price: 449.00,
  stock_on_hand: 12,
  is_active: 'TRUE',
  vendor_id: '',
  image_1: 'https://drive.google.com/file/d/EXAMPLE_FILE_ID/view',
  image_2: '', image_3: '', image_4: '', image_5: '',
  video_url: 'https://www.youtube.com/watch?v=EXAMPLE',
};

XLSX.writeFile(
  buildTemplate(productsColumnMap, 'Products', productsExample),
  resolve(OUT_DIR, 'products-import-template.xlsx')
);
console.log('Wrote products-import-template.xlsx');
```

- [ ] **Step 5: Regenerate templates**

```bash
npx tsx scripts/generate-import-templates.ts
```
Expected: both `.xlsx` files written.

- [ ] **Step 6: Enable products in UI**

In `src/pages/admin/BulkImport.tsx`, change:
```tsx
const productsEnabled = false;
```
to:
```tsx
const productsEnabled = true;
```

- [ ] **Step 7: Verify in browser**

`npm run dev` → `/admin/bulk-import` → switch entity to "Products" → download template → fill a row → upload → confirm → check `products_new` row exists.

- [ ] **Step 8: Commit**

```bash
git add src/lib/bulkImport/columnMaps/products.ts src/lib/bulkImport/columnMaps/index.ts scripts/generate-import-templates.ts public/templates/products-import-template.xlsx src/pages/admin/BulkImport.tsx
git commit -m "bulkImport: products column map + template + UI enablement"
```

---

## Phase 6: E2E + final polish

### Task 24: E2E test for happy path

**Files:**
- Create: `src/e2e/bulk-import.spec.ts`
- Create: `src/test/fixtures/bulk-import/components-valid-2.xlsx` (generated)

- [ ] **Step 1: Generate fixture file**

Add a fixture generation block to `scripts/generate-test-fixtures.ts`:

```ts
// scripts/generate-test-fixtures.ts
// Run: npx tsx scripts/generate-test-fixtures.ts
import * as XLSX from 'xlsx';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const OUT_DIR = resolve(__dirname, '..', 'src', 'test', 'fixtures', 'bulk-import');
mkdirSync(OUT_DIR, { recursive: true });

const headers = [
  'sku','name','type','value','description','normal_price','merchant_price',
  'stock_level','min_stock_level','reorder_point','warehouse_location','is_active',
  'vendor_id','image_1','image_2','image_3','image_4','image_5','video_url',
];

const validRow = (sku: string, name: string) => [
  sku, name, 'body', '', '', 10, 8, 5, 10, 15, '', 'TRUE', '',
  '', '', '', '', '', '',  // no images so E2E doesn't depend on external network
];

function writeXlsx(filename: string, sheetName: string, rows: unknown[][]) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([headers, ...rows]), sheetName);
  XLSX.writeFile(wb, resolve(OUT_DIR, filename));
  console.log('Wrote', filename);
}

writeXlsx('components-valid-2.xlsx', 'Components', [
  validRow('E2E-001', 'E2E Bracket 1'),
  validRow('E2E-002', 'E2E Bracket 2'),
]);
```

Run:
```bash
npx tsx scripts/generate-test-fixtures.ts
```

- [ ] **Step 2: Write Playwright spec**

```ts
// src/e2e/bulk-import.spec.ts
import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';

const ADMIN_USERNAME = process.env.E2E_ADMIN_USERNAME ?? 'admin';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'admin';

test('admin bulk-imports 2 components from .xlsx', async ({ page }) => {
  // Sign in as admin (adjust selectors to match the project's admin login form)
  await page.goto('/admin/login');
  await page.getByLabel(/username/i).fill(ADMIN_USERNAME);
  await page.getByLabel(/password/i).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();

  await page.goto('/admin/bulk-import');
  await expect(page.getByRole('heading', { name: /bulk import/i })).toBeVisible();

  const file = resolve(__dirname, '..', 'test', 'fixtures', 'bulk-import', 'components-valid-2.xlsx');
  await page.setInputFiles('input[type="file"]', file);

  await expect(page.getByText(/2 valid/)).toBeVisible();

  await page.getByLabel(/insert new only/i).check();
  await page.getByRole('button', { name: /confirm import: 2 rows/i }).click();

  await expect(page.getByText(/2 inserted/i)).toBeVisible({ timeout: 30_000 });
});
```

- [ ] **Step 3: Run E2E**

```bash
npm run test:e2e -- bulk-import.spec.ts
```
Expected: PASS (after setting `E2E_ADMIN_USERNAME` / `E2E_ADMIN_PASSWORD` env vars to a valid admin account on the dev DB).

If the test fails because of selector mismatches, inspect the admin login page and update the selectors.

- [ ] **Step 4: Commit**

```bash
git add src/e2e/bulk-import.spec.ts scripts/generate-test-fixtures.ts src/test/fixtures/bulk-import/components-valid-2.xlsx
git commit -m "bulkImport: e2e happy-path test"
```

---

### Task 25: Final type-check + lint pass

- [ ] **Step 1: Run all checks**

```bash
npm run type-check
```
Expected: 0 errors.

```bash
npm run lint
```
Expected: 0 errors (warnings OK).

```bash
npm test
```
Expected: all unit tests PASS (driveUrl, coerce, parser, validators).

- [ ] **Step 2: Fix any issues found**

If type-check or lint reports issues introduced by this feature (other unrelated issues in the dirty tree should be ignored), fix them in the relevant files.

- [ ] **Step 3: Commit any fixes**

```bash
git add -p   # stage only fixes related to this feature
git commit -m "bulkImport: fix type-check / lint issues"
```
(Skip this commit if nothing changed.)

---

### Task 26: Push to remote

- [ ] **Step 1: Push**

```bash
git push origin main
```
Expected: success.

---

## Summary

After all tasks: `/admin/bulk-import` is live for admins; components and products can be bulk-created from Excel; Drive image URLs auto-re-host; full audit log in `bulk_import_logs`; tests cover all engine logic + one E2E happy path.

**Out of scope (covered in spec but not in this plan):**
- Feature-flag gating (recommended in spec but kept simple here — `productsEnabled` boolean in the page is the only gate)
- "Deep check" optional pre-confirm HEAD-pinging of every URL — current flow validates URL shape client-side, fetches on commit
- `get-bulk-import-logs` UI consumption — function is deployed (Task 16), but no admin-visible "past imports" page in this plan (a follow-up)
