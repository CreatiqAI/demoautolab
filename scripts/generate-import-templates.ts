// scripts/generate-import-templates.ts
// Run: npx tsx scripts/generate-import-templates.ts
// Generates downloadable .xlsx templates from the column maps.

import * as XLSX from 'xlsx';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { componentsColumnMap } from '../src/lib/bulkImport/columnMaps/components';
import type { ColumnMap } from '../src/lib/bulkImport/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
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
