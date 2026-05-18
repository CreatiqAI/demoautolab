# Bulk Excel Import for Components & Products — Design Spec

**Date:** 2026-05-18
**Author:** Brainstormed with Claude
**Status:** Approved for implementation planning

---

## 1. Problem & Goals

### Problem
AutoLab admins currently create components one-by-one in [src/pages/vendor/Components.tsx](../../../src/pages/vendor/Components.tsx). The catalog has 501 component rows; growing it further by manual entry is slow and error-prone. Admins already organize their source data (SKU, name, price, images) in spreadsheets and Google Drive folders — the platform should accept that workflow directly.

### Goals
- Let admins bulk-create components (and, in phase 2, products) by uploading a filled Excel template.
- Accept Google Drive sharing URLs for images. The system handles re-hosting to Supabase Storage automatically.
- Show a preview of every row with errors flagged before any DB writes happen.
- Support three modes: insert-only, update-only, upsert.
- Build a reusable import engine so products can ship next without rebuilding.

### Non-goals (v1)
- Vendor self-service import (admin only; vendor flow is a separate spec).
- Editing `product_components` junction rows (component-to-product relationships) via Excel.
- Auto-creating categories from `category_slug` (must pre-exist).
- OAuth-based access to private Drive files or files >25 MB.
- Import undo / rollback (admins use the audit log to manually clean up).
- Async/queued imports for >1,000 rows (synchronous batched flow is sufficient at current scale).

---

## 2. Architecture

### Approach: hybrid client+server

| Concern | Where it runs | Why |
|---|---|---|
| Excel parsing | Browser (`xlsx` lib) | Instant preview, no upload round-trip. ~200ms for 500 rows. |
| Client-side validation | Browser | Required fields, types, URL shape, in-file SKU uniqueness. |
| Server-side validation | Edge function (on confirm) | DB lookups (SKU exists?), image URL HEAD checks. |
| Drive URL re-hosting | Edge function | Browsers can't fetch Drive URLs (CORS); Deno `fetch` can. |
| DB writes | Edge function | Service-role key, RLS bypass with admin gate. |

### Flow

```
┌─────────────────────────────────────────────────────────────┐
│ /admin/bulk-import (new page, ProtectedAdminRoute)          │
│                                                             │
│  1. Entity picker      [Components ▼]                       │
│  2. Template download  [📥 components-template.xlsx]        │
│  3. File drop          [📤 drag .xlsx here]                 │
│  4. Preview table      ✓ 487 valid / ✗ 13 errors            │
│  5. Mode               (•) Upsert  ( ) Insert  ( ) Update   │
│  6. [Confirm import]   → live progress bar                  │
└─────────────────────────────────────────────────────────────┘
              │
              │ Client chunks rows into batches of 20
              │ Calls edge function once per batch
              ▼
┌─────────────────────────────────────────────────────────────┐
│ Edge Function: bulk-import-processor                        │
│  1. Auth check (admin session)                              │
│  2. For each row (parallel ×5):                             │
│     - SKU lookup → decide insert/update/skip                │
│     - Media: download Drive URL → resize WebP → upload      │
│       to Supabase Storage bucket "product-images"           │
│     - Write component_library row + component_images rows   │
│  3. Return per-row result                                   │
│  4. Append to bulk_import_logs audit row                    │
└─────────────────────────────────────────────────────────────┘
```

### Reusable engine: `ColumnMap` config

The page, validator, edge function, and preview UI all read from a single config so adding products = one new map + one new template, no engine changes.

```ts
type ColumnMap = {
  entity: 'component' | 'product';
  table: 'component_library' | 'products_new';
  uniqueKey: string;              // 'component_sku' | 'sku'
  fields: Array<{
    excelColumn: string;
    dbColumn: string;
    required: boolean;
    type: 'text' | 'number' | 'boolean' | 'url' | 'uuid';
    coerce?: (raw: unknown) => unknown;
    validate?: (val: unknown, row: Row) => string | null; // error message or null
  }>;
  mediaColumns: Array<{
    excelColumn: string;          // 'image_1' .. 'image_5' | 'video_url'
    role: 'default_image' | 'gallery' | 'video';
    sortOrder?: number;           // for gallery slots
  }>;
}
```

---

## 3. Excel Templates

### Components template — `components-import-template.xlsx`

**Sheet 1: "Components"**

| Column | DB field | Required | Type | Validation |
|---|---|---|---|---|
| `sku` | `component_sku` | ✅ | text | `[A-Z0-9-]{3,40}`; unique within file |
| `name` | `name` | ✅ | text | 1-200 chars |
| `type` | `component_type` | ✅ | text | Free text (new types auto-allowed) |
| `value` | `component_value` | ⬜ | text | |
| `description` | `description` | ⬜ | text | |
| `normal_price` | `normal_price` | ✅ | number | ≥ 0, max 2 decimals; accepts `RM 12.50`, `12,500` |
| `merchant_price` | `merchant_price` | ✅ | number | ≥ 0; warning if > normal_price |
| `stock_level` | `stock_level` | ⬜ | number | Integer ≥ 0; default 0 |
| `min_stock_level` | `min_stock_level` | ⬜ | number | Integer ≥ 0; default 10 |
| `reorder_point` | `reorder_point` | ⬜ | number | Integer ≥ 0; default 15 |
| `warehouse_location` | `warehouse_location` | ⬜ | text | |
| `is_active` | `is_active` | ⬜ | boolean | TRUE/FALSE/yes/no/1/0; default TRUE |
| `vendor_id` | `vendor_id` | ⬜ | uuid | Must exist in `vendors`; blank = admin-owned |
| `image_1` | `default_image_url` (after upload) | ⬜ | url | Drive share / direct URL |
| `image_2` .. `image_5` | `component_images` row | ⬜ | url | Same; sort_order = slot number |
| `video_url` | `component_library.video_url` (new col) | ⬜ | url | YouTube/Vimeo/Drive — stored as-is |

**Sheet 2: "Instructions"** — read-only, explains each column with examples and Drive sharing tips.

### Products template — `products-import-template.xlsx` (phase 2)

Maps to `products_new`. Same shape, different columns:

| Excel column | DB column |
|---|---|
| `sku` | `sku` |
| `name` | `name` |
| `description` | `description` |
| `brand` | `brand` |
| `model` | `model` |
| `category_slug` | resolved to `category_id` |
| `year_from`, `year_to` | year range |
| `normal_price` | `price_regular` |
| `merchant_price` | `price_merchant` |
| `stock_on_hand` | `stock_on_hand` |
| `screen_size` | parsed as comma list to array |
| `image_1` .. `image_5` | `product_images` |
| `video_url` | product video field |

---

## 4. Validation Rules

### Phase A — client-side (in browser, runs immediately on file drop)
1. Header row matches template (no missing required columns, no unknown columns flagged as warnings).
2. Required fields present per row.
3. Types coerce correctly (numbers parse, booleans coerce, URLs are well-formed).
4. SKU regex match.
5. SKU uniqueness within the file.
6. Warnings (non-blocking): `merchant_price > normal_price`.

### Phase B — server-side (runs on confirm or via optional "Deep check" button)
1. SKU existence check against DB → drives insert/update/skip per chosen mode.
2. `HEAD` request on each image URL (after Drive URL normalization) → confirms reachable + Content-Type starts with `image/`.
3. `vendor_id` (if provided) exists in `vendors`.

### Preview table semantics

- `✓` rows are inserted/updated.
- `✗` rows have blocking errors and are skipped.
- `⚠` rows have warnings (price logic) and are imported unless admin unchecks them in the preview.
- Per-row inline error messages (e.g. "merchant_price > normal_price", "image_3: content-type was text/html").

---

## 5. Drive URL Handling

### URLs accepted

All these forms are normalized to `https://drive.google.com/uc?export=download&id={ID}` before fetch:
- `https://drive.google.com/file/d/{ID}/view?...`
- `https://drive.google.com/file/d/{ID}/preview`
- `https://drive.google.com/open?id={ID}`
- `https://drive.google.com/uc?id={ID}` (already direct)

Other URL types passed through as-is:
- Direct image URLs (`https://cdn.example.com/foo.jpg`)
- Dropbox links (rewrite `?dl=0` → `?dl=1`)
- Imgur direct image links

### URLs rejected with a clear error
- Private Drive links → "Image not accessible — set Drive sharing to 'Anyone with link'"
- HTML pages (mistakenly pasted) → "Not an image: content-type was text/html"
- Files >10 MB → "Image too large (>10 MB) — please reduce size and re-share"

### Drive folder requirement
Admin must set the source folder to **"Anyone with the link → Viewer"**. No OAuth flow is needed. Files >25 MB trigger Google's virus-scan interstitial and are not supported in v1 — guidance in the Instructions sheet tells admins to keep images under 25 MB (WebP compression handles the rest).

### Video URLs
Video URLs are **not re-hosted**. They are stored as-is (Drive, YouTube, Vimeo all acceptable). Embedding/display is handled by existing product detail page video logic.

---

## 6. Edge Function: `bulk-import-processor`

### Request

```ts
POST /functions/v1/bulk-import-processor
Authorization: Bearer <admin session token>

{
  entity: 'component' | 'product',
  mode: 'insert' | 'update' | 'upsert',
  rows: Array<{
    rowIndex: number,
    fields: Record<string, any>,
    mediaUrls: {
      default: string | null,
      gallery: string[],
      video: string | null
    }
  }>
}
```

### Per-row processing
1. **SKU lookup**: `SELECT id FROM <table> WHERE <uniqueKey> = $1`. Combined with `mode`, decides insert / update / skip / error.
2. **Media processing** (parallel for the row's URLs):
   - Normalize Drive URL.
   - `fetch()` with 30s timeout, follow redirects.
   - Validate `content-type` starts with `image/` and size < 10 MB.
   - Resize to max 1920px, encode WebP @ 85% using `imagescript` (Deno-native, no native deps).
   - Upload to `product-images/imports/{vendor_id|admin}/{yyyymmdd}/{sku}-{slot}.webp`.
   - Get public URL.
3. **DB write**:
   - INSERT or UPDATE the main row (`default_image_url` = uploaded URL #1).
   - INSERT `component_images` rows for slots 2..5 (with `is_primary = false`, `sort_order` = slot number).
   - Store `video_url` as-is if present.
4. **Return** per-row `{ rowIndex, status, sku, componentId?, error?, mediaErrors? }`.

### Concurrency
- Client batch size: **20 rows per call**.
- Inside the function: **5 rows in parallel** (Promise.all with concurrency limit).
- Within each row: media URLs fetched in parallel.
- Worst case: 5 × 6 = 30 simultaneous Drive fetches, well under Google's ~100 req / 100s / user quota.

### Performance budget
- 500-row import: ~25 batch calls × ~3-5s each = ~90s total with live progress.
- 100-row import: ~5 batch calls = ~15-20s.

### Failure handling
- Each batch is its own transaction. Completed batches stay in DB if browser closes.
- Recovery: re-run the same Excel with mode = "Insert new only" — already-imported SKUs are skipped.
- All attempts logged to `bulk_import_logs.result_json` for audit.

---

## 7. Security & Access

### v1: admin only
- Page mounted at `/admin/bulk-import`, wrapped in `<ProtectedAdminRoute>` (existing localStorage admin gate).
- Edge function validates admin session via same path used by `admin-create-vendor` and `admin-delete-vendor` functions.
- Vendor self-service import is explicitly out of scope for v1.

### Vendor ownership
- Excel row with no `vendor_id` → saved with `vendor_id = NULL`, `approval_status = 'APPROVED'` (admin-owned catalog item, matches current admin-created behavior).
- Excel row with `vendor_id` → admin importing on behalf of a vendor; validated against `vendors` table; saved with `approval_status = 'APPROVED'` (admin trust).

### RLS
- `component_library` and `products_new` already have admin-write RLS — no policy changes.
- New `bulk_import_logs` table: RLS enabled but **no public policies**. All reads and writes go through edge functions (`bulk-import-processor` for inserts, a small `get-bulk-import-logs` function for the admin "View past imports" UI) using the service-role key. This matches the existing admin auth pattern in this codebase (custom localStorage session, not Supabase JWT roles), where direct client → DB access is not used for admin features.
- Both edge functions gate on the same admin session check used by `admin-create-vendor` and `admin-delete-vendor`.

---

## 8. Schema Additions

```sql
-- Migration 1: video URL field for components
ALTER TABLE component_library
  ADD COLUMN video_url TEXT;

-- Migration 2: audit log for import runs
CREATE TABLE bulk_import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  admin_id UUID,
  entity TEXT NOT NULL,                  -- 'component' | 'product'
  mode TEXT NOT NULL,                    -- 'insert' | 'update' | 'upsert'
  total_rows INT NOT NULL,
  succeeded INT NOT NULL,
  failed INT NOT NULL,
  result_json JSONB NOT NULL             -- full per-row result for audit
);

-- RLS enabled with no public policies. Access is via edge functions using
-- the service-role key, gated by the existing admin session check (matching
-- admin-create-vendor / admin-delete-vendor pattern).
ALTER TABLE bulk_import_logs ENABLE ROW LEVEL SECURITY;
```

---

## 9. Dependencies

### npm (frontend)
```json
{ "dependencies": { "xlsx": "^0.18.5" } }
```

### Edge function (Deno) — no install needed
- `https://deno.land/x/imagescript@1.2.17/mod.ts` — WebP resize/compress
- Built-in `fetch` — Drive download
- Existing `@supabase/supabase-js` — DB + Storage

---

## 10. File Layout

```
src/
├── pages/admin/
│   └── BulkImport.tsx                     # new admin page
├── lib/bulkImport/
│   ├── parser.ts                          # parseExcel(file) → rows
│   ├── validators.ts                      # validateRow, coerceNumber, coerceBoolean
│   ├── columnMaps/
│   │   ├── components.ts                  # ColumnMap for component_library
│   │   └── products.ts                    # ColumnMap for products_new
│   ├── driveUrl.ts                        # normalizeDriveUrl
│   └── types.ts
├── components/admin/bulkImport/
│   ├── PreviewTable.tsx                   # preview UI with error highlighting
│   ├── ImportProgress.tsx                 # live progress bar
│   └── TemplateDownloader.tsx
├── test/fixtures/bulk-import/
│   ├── components-valid-5.xlsx
│   ├── components-with-errors.xlsx
│   └── components-large-100.xlsx
└── e2e/bulk-import.spec.ts

supabase/functions/
├── bulk-import-processor/
│   ├── index.ts
│   ├── driveUrl.ts                        # duplicated from src/lib/bulkImport/
│   ├── imageProcessor.ts                  # download → resize → upload
│   └── dbWriter.ts                        # insert/update by mode
└── get-bulk-import-logs/
    └── index.ts                           # admin-gated read of bulk_import_logs

database/
├── 20260518100000_bulk-import-video-url.sql
└── 20260518100001_bulk-import-audit-log.sql

public/templates/
├── components-import-template.xlsx
└── products-import-template.xlsx          # phase 2

docs/superpowers/specs/
└── 2026-05-18-bulk-excel-import-design.md
```

---

## 11. Testing Strategy

### Unit (Vitest)
- `parseExcel(file)` → returns rows + header errors
- `validateRow(row, columnMap)` → returns errors + warnings
- `normalizeDriveUrl(url)` → handles all 4 Drive URL shapes
- `coerceBoolean('yes' | 'TRUE' | '1' | ...)` → boolean
- `coerceNumber('RM 12.50' | '12,500' | ...)` → number or error

### Integration (Vitest + Supabase test project)
- Insert mode: 3 new → 3 inserted, 1 log row
- Update mode: 2 existing + 1 new → 2 updated, 1 skipped
- Upsert mode: mix → all written
- Duplicate SKUs in file → blocking error pre-write
- Bad image URL → row succeeds with `default_image_url = NULL`, error logged

### E2E (Playwright) — one happy path
Admin logs in → goes to `/admin/bulk-import` → uploads 5-row fixture with 1 Drive image URL → preview shows 5 ✓ → confirms upsert → asserts 5 rows in `component_library` and 1 file in Storage.

---

## 12. Rollout Plan

| PR | Scope | Ship behind flag? |
|---|---|---|
| 1 | Migrations: `bulk_import_logs` + `component_library.video_url` | n/a |
| 2 | Engine core: `src/lib/bulkImport/` + unit tests | n/a |
| 3 | Edge function: `bulk-import-processor` deployed + curl-tested | n/a |
| 4 | Admin UI: `/admin/bulk-import` with Components wired up, E2E test | Yes — env var `BULK_IMPORT_ENABLED=true` or admin email allowlist |
| 5 | Products column map + template | Same flag |
| Sunset | Remove flag after 2 weeks of stable usage | — |

---

## 13. Open Questions / Future Work

- **Vendor self-service import**: separate spec needed; requires approval workflow, per-vendor rate limits.
- **Linking components to products via Excel**: editing `product_components` junction is risky; may warrant its own template.
- **Import undo / rollback**: out of scope; admins use `bulk_import_logs.result_json` and manual deletes if needed.
- **Async queueing for very large imports**: only relevant if a single import exceeds ~1,000 rows; current synchronous flow is fine at present scale.
- **Drive OAuth for >25 MB files or private folders**: not needed at current scale; would unlock larger media if ever required.
