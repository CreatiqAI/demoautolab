// scripts/generate-test-fixtures.ts
// Run: npx tsx scripts/generate-test-fixtures.ts
//
// Generates .xlsx fixtures used by the bulk-import E2E spec.
// Output: src/test/fixtures/bulk-import/*.xlsx
import * as XLSX from 'xlsx';
import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '..', 'src', 'test', 'fixtures', 'bulk-import');
mkdirSync(OUT_DIR, { recursive: true });

const headers = [
  'sku','name','type','value','description','normal_price','merchant_price',
  'stock_level','min_stock_level','reorder_point','warehouse_location','is_active',
  'vendor_id','image_1','image_2','image_3','image_4','image_5','video_url',
];

const validRow = (sku: string, name: string) => [
  sku, name, 'body', '', '', 10, 8, 5, 10, 15, '', 'TRUE', '',
  '', '', '', '', '', '',
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
