import type { ColumnMap } from '../types';

// Products in this codebase are assembled from existing components — they
// don't carry their own SKU, price, or stock. The Excel template captures:
//   * Basic product info (name, category, brand, model, screen_size, years, description)
//   * 1-5 component SKU references (must exist in component_library)
//   * Up to 15 media URLs (mix of images + videos; slot 1 becomes the primary)
//
// `dbColumn` is used as the key in the parsed fields payload sent to the
// edge function — many of these are NOT real columns on products_new
// (category gets resolved to category_id, screen_size gets wrapped in an
// array, component_sku_* drives product_components inserts, slug is
// auto-generated from name). The edge function's product-writer is where
// the actual table mapping happens.
export const productsColumnMap: ColumnMap = {
  entity: 'product',
  table: 'products_new',
  uniqueKey: 'name',  // dedupe by name within the file (slug is auto-generated server-side)
  fields: [
    { excelColumn: 'name', dbColumn: 'name', required: true, type: 'text', max: 200 },
    { excelColumn: 'category', dbColumn: 'category', required: false, type: 'text' },
    { excelColumn: 'brand', dbColumn: 'brand', required: false, type: 'text' },
    { excelColumn: 'model', dbColumn: 'model', required: false, type: 'text' },
    { excelColumn: 'screen_size', dbColumn: 'screen_size', required: false, type: 'text' },
    { excelColumn: 'year_from', dbColumn: 'year_from', required: false, type: 'integer', min: 1900, max: 2100 },
    { excelColumn: 'year_to', dbColumn: 'year_to', required: false, type: 'integer', min: 1900, max: 2100 },
    { excelColumn: 'description', dbColumn: 'description', required: false, type: 'text' },
    { excelColumn: 'active', dbColumn: 'active', required: false, type: 'boolean' },
    { excelColumn: 'component_sku_1', dbColumn: 'component_sku_1', required: true, type: 'text' },
    { excelColumn: 'component_sku_2', dbColumn: 'component_sku_2', required: false, type: 'text' },
    { excelColumn: 'component_sku_3', dbColumn: 'component_sku_3', required: false, type: 'text' },
    { excelColumn: 'component_sku_4', dbColumn: 'component_sku_4', required: false, type: 'text' },
    { excelColumn: 'component_sku_5', dbColumn: 'component_sku_5', required: false, type: 'text' },
  ],
  mediaColumns: [
    { excelColumn: 'media_1',  role: 'default_image' },
    { excelColumn: 'media_2',  role: 'gallery', sortOrder: 2 },
    { excelColumn: 'media_3',  role: 'gallery', sortOrder: 3 },
    { excelColumn: 'media_4',  role: 'gallery', sortOrder: 4 },
    { excelColumn: 'media_5',  role: 'gallery', sortOrder: 5 },
    { excelColumn: 'media_6',  role: 'gallery', sortOrder: 6 },
    { excelColumn: 'media_7',  role: 'gallery', sortOrder: 7 },
    { excelColumn: 'media_8',  role: 'gallery', sortOrder: 8 },
    { excelColumn: 'media_9',  role: 'gallery', sortOrder: 9 },
    { excelColumn: 'media_10', role: 'gallery', sortOrder: 10 },
    { excelColumn: 'media_11', role: 'gallery', sortOrder: 11 },
    { excelColumn: 'media_12', role: 'gallery', sortOrder: 12 },
    { excelColumn: 'media_13', role: 'gallery', sortOrder: 13 },
    { excelColumn: 'media_14', role: 'gallery', sortOrder: 14 },
    { excelColumn: 'media_15', role: 'gallery', sortOrder: 15 },
  ],
};
