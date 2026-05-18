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
    const wb = makeWorkbook([{ sku: 'X', name: 'Y' }]);
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
