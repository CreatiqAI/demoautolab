import type { ColumnMap } from '../types';

// products_new has no `sku`, `price_regular`, `price_merchant`, or `stock_on_hand`
// columns — pricing and stock live on component_library and flow up through
// product_components. The unique identifier on products_new is `slug`, so we
// map the excel `sku` column to the `slug` dbColumn. The DB column is `active`,
// not `is_active`.
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
  ],
  mediaColumns: [
    { excelColumn: 'image_url', role: 'default_image' },
  ],
};
