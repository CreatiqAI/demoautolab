import type { ColumnMap } from '../types';

// NOTE: products_new has no `sku`, `price_regular`, `price_merchant`, or
// `stock_on_hand` columns. Pricing and stock live on component_library and
// flow up through product_components. The unique row identifier on
// products_new is `slug`. We therefore map the excel `sku` column to the
// `slug` dbColumn so the bulk import engine's uniqueKey/dedupe logic still
// works, and use `active` (the actual column) instead of `is_active`.
export const productsColumnMap: ColumnMap = {
  entity: 'product',
  table: 'products_new',
  uniqueKey: 'slug',
  fields: [
    { excelColumn: 'sku', dbColumn: 'slug', required: true, type: 'text', pattern: /^[A-Z0-9-]{3,40}$/i },
    { excelColumn: 'name', dbColumn: 'name', required: true, type: 'text', max: 200 },
    { excelColumn: 'description', dbColumn: 'description', required: false, type: 'text' },
    { excelColumn: 'brand', dbColumn: 'brand', required: false, type: 'text' },
    { excelColumn: 'model', dbColumn: 'model', required: false, type: 'text' },
    { excelColumn: 'year_from', dbColumn: 'year_from', required: false, type: 'integer', min: 1900, max: 2100 },
    { excelColumn: 'year_to', dbColumn: 'year_to', required: false, type: 'integer', min: 1900, max: 2100 },
    { excelColumn: 'is_active', dbColumn: 'active', required: false, type: 'boolean' },
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
