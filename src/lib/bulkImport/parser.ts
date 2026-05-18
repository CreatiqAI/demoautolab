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
