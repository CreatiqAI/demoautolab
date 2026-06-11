import { describe, expect, it } from 'vitest';
import { validateRows } from '../validators';
import { componentsColumnMap } from '../columnMaps/components';

describe('validateRows', () => {
  const baseRow = {
    sku: 'BRK-001', name: 'Bracket', type: 'body',
    normal_price: 10, merchant_price: 8,
    image_url: 'https://drive.google.com/file/d/ID1/view',
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
    const row = { ...baseRow, sku: 'bad*sku?with!chars' };
    const summary = validateRows([{ rowIndex: 2, raw: row }], componentsColumnMap);
    expect(summary.rows[0].errors.some(e => e.toLowerCase().includes('sku'))).toBe(true);
  });

  it('accepts SKUs with # / ( ) . and spaces', () => {
    const skus = [
      'LHL-1284#EH-800 (LZ)(NTG5.5/6.0)',
      'LHL-272#/BZ01.10',
      'LHL-1382/RZ-SAIC08',
      'CB-14#/RZ-02',
      'LHL-1088#',
    ];
    for (const sku of skus) {
      const summary = validateRows([{ rowIndex: 2, raw: { ...baseRow, sku } }], componentsColumnMap);
      expect(summary.rows[0].errors, `SKU "${sku}" should be valid`).toEqual([]);
    }
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

  it('normalizes Drive URLs in image_url', () => {
    const row = { ...baseRow, image_url: 'https://drive.google.com/file/d/ID2/view' };
    const summary = validateRows([{ rowIndex: 2, raw: row }], componentsColumnMap);
    expect(summary.rows[0].mediaUrls.default).toContain('uc?export=download&id=ID2');
  });

  it('rejects invalid URLs in image_url with a row error', () => {
    const row = { ...baseRow, image_url: 'not a url' };
    const summary = validateRows([{ rowIndex: 2, raw: row }], componentsColumnMap);
    expect(summary.rows[0].errors.some(e => e.toLowerCase().includes('image_url'))).toBe(true);
  });
});
