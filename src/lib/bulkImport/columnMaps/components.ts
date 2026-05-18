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
