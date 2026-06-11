import type { ColumnMap } from '../types';

export const componentsColumnMap: ColumnMap = {
  entity: 'component',
  table: 'component_library',
  uniqueKey: 'component_sku',
  fields: [
    { excelColumn: 'sku', dbColumn: 'component_sku', required: true, type: 'text',
      // Allow letters, digits, and common SKU punctuation: - # / ( ) . and spaces
      pattern: /^[A-Z0-9 #/().-]{3,60}$/i },
    { excelColumn: 'name', dbColumn: 'name', required: true, type: 'text', max: 200 },
    { excelColumn: 'type', dbColumn: 'component_type', required: true, type: 'text' },
    { excelColumn: 'description', dbColumn: 'description', required: false, type: 'text' },
    { excelColumn: 'normal_price', dbColumn: 'normal_price', required: true, type: 'number', min: 0 },
    { excelColumn: 'merchant_price', dbColumn: 'merchant_price', required: true, type: 'number', min: 0 },
    { excelColumn: 'stock_level', dbColumn: 'stock_level', required: false, type: 'integer', min: 0 },
    { excelColumn: 'is_active', dbColumn: 'is_active', required: false, type: 'boolean' },
  ],
  mediaColumns: [
    { excelColumn: 'image_url', role: 'default_image' },
  ],
};
