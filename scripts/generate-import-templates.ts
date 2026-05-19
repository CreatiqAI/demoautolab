// scripts/generate-import-templates.ts
// Run: npx tsx scripts/generate-import-templates.ts
// Generates downloadable .xlsx templates from the column maps.

import * as XLSX from 'xlsx';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { componentsColumnMap } from '../src/lib/bulkImport/columnMaps/components';
import { productsColumnMap } from '../src/lib/bulkImport/columnMaps/products';
import type { ColumnMap } from '../src/lib/bulkImport/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const OUT_DIR = resolve(__dirname, '..', 'public', 'templates');

// Per-column human notes shown in the Instructions sheet. Falls back to the
// generic pattern/min hint when no override is given.
const COLUMN_NOTES: Record<string, string> = {
  // shared
  description: 'Optional free-text description shown on the product/component page.',
  // components
  sku: 'Required. Uppercase letters, digits, dashes only (3-40 chars). Must be unique.',
  type: 'Required. Component type, e.g. "body", "trim", "casing". New types are auto-created.',
  normal_price: 'Required. Customer-facing price in RM. Accepts "12.50" or "RM 12.50".',
  merchant_price: 'Required. Merchant/wholesale price in RM. Warning if higher than normal_price.',
  stock_level: 'Optional. Integer >= 0. Defaults to 0.',
  is_active: 'Optional. TRUE/FALSE/yes/no/1/0. Defaults to TRUE.',
  image_url: 'Optional. Drive share URL or any https URL. Downloaded and saved to storage on import.',
  // products
  name: 'Required. Product display name shown to customers.',
  category: 'Optional. Existing category name (case-insensitive match). Leave blank for uncategorised.',
  brand: 'Optional. Vehicle brand, e.g. "Audi", "Honda".',
  model: 'Optional. Vehicle model, e.g. "A4", "Civic".',
  screen_size: 'Optional. One of: 6, 7, 8, 9, 10, 12.5',
  year_from: 'Optional. Earliest model year, e.g. 2018.',
  year_to: 'Optional. Latest model year, e.g. 2022.',
  active: 'Optional. TRUE/FALSE. Defaults to TRUE. Inactive products are hidden from the catalog.',
  component_sku_1: 'REQUIRED. SKU of an existing component from the component library. At least 1 component per product.',
  component_sku_2: 'Optional. Additional component SKU (must exist in component library).',
  component_sku_3: 'Optional. Additional component SKU.',
  component_sku_4: 'Optional. Additional component SKU.',
  component_sku_5: 'Optional. Additional component SKU.',
  media_1: 'Optional but recommended. PRIMARY image/video. Drive image link, direct image URL, YouTube/Vimeo, or Drive video link.',
};

function noteFor(excelColumn: string, f: { pattern?: RegExp; min?: number; max?: number }): string {
  if (COLUMN_NOTES[excelColumn]) return COLUMN_NOTES[excelColumn];
  if (/^media_/.test(excelColumn)) return 'Optional. Gallery slot. Drive/Dropbox/CDN image, YouTube/Vimeo, or direct video URL.';
  if (f.pattern) return `pattern: ${f.pattern}`;
  if (f.min !== undefined && f.max !== undefined) return `${f.min} – ${f.max}`;
  if (f.min !== undefined) return `min: ${f.min}`;
  return '';
}

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
    ...map.fields.map(f => [f.excelColumn, f.required ? 'YES' : 'no', f.type, noteFor(f.excelColumn, f)]),
    ...map.mediaColumns.map(m => [m.excelColumn, 'no', 'url', noteFor(m.excelColumn, {})]),
    [],
    ['Drive sharing', '', '', 'Right-click folder → Share → "Anyone with the link → Viewer"'],
    ['Media size cap', '', '', 'Images: under 25 MB to avoid Drive virus-scan interstitial. Videos: up to 2 GB.'],
    ['Boolean values', '', '', 'TRUE / FALSE / yes / no / 1 / 0 all accepted'],
    ['YouTube/Vimeo', '', '', 'Stored as-is and embedded. No download required.'],
  ];
  const instSheet = XLSX.utils.aoa_to_sheet(instructions);
  XLSX.utils.book_append_sheet(wb, instSheet, 'Instructions');

  return wb;
}

const componentsExample = {
  sku: 'BRK-001',
  name: 'Universal Door Bracket',
  type: 'body',
  description: 'Heavy-duty stainless steel bracket',
  normal_price: 12.50,
  merchant_price: 9.80,
  stock_level: 25,
  is_active: 'TRUE',
  image_url: 'https://drive.google.com/file/d/EXAMPLE_FILE_ID/view',
};

mkdirSync(OUT_DIR, { recursive: true });
XLSX.writeFile(
  buildTemplate(componentsColumnMap, 'Components', componentsExample),
  resolve(OUT_DIR, 'components-import-template.xlsx')
);
console.log('Wrote components-import-template.xlsx');

// products_new has no sku / price / stock columns — pricing & stock live on
// component_library and roll up via product_components. The template captures
// product metadata + 1-5 existing component SKUs + up to 15 media URLs.
const productsExample = {
  name: 'Audi A4 9 Inch Android Head Unit Kit',
  category: 'Android Head Units',
  brand: 'Audi',
  model: 'A4',
  screen_size: '9',
  year_from: 2018,
  year_to: 2022,
  description: '9-inch Android head unit kit for Audi A4 2018-2022. Includes casing, dash kit, and cable harness.',
  active: 'TRUE',
  component_sku_1: 'CASING-A4-9IN-001',
  component_sku_2: 'DASH-AUDI-A4-001',
  component_sku_3: '',
  component_sku_4: '',
  component_sku_5: '',
  media_1: 'https://drive.google.com/file/d/EXAMPLE_PRIMARY_IMAGE_ID/view',
  media_2: 'https://drive.google.com/file/d/EXAMPLE_GALLERY_IMAGE_ID/view',
  media_3: 'https://www.youtube.com/watch?v=EXAMPLE_VIDEO_ID',
  media_4: '', media_5: '', media_6: '', media_7: '', media_8: '',
  media_9: '', media_10: '', media_11: '', media_12: '', media_13: '',
  media_14: '', media_15: '',
};

XLSX.writeFile(
  buildTemplate(productsColumnMap, 'Products', productsExample),
  resolve(OUT_DIR, 'products-import-template.xlsx')
);
console.log('Wrote products-import-template.xlsx');
