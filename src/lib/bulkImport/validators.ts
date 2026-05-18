import type { ColumnMap, FieldDef, ParsedRow, RawRow, ValidationSummary } from './types';
import { coerceText, coerceNumber, coerceInteger, coerceBoolean, coerceUuid } from './coerce';
import { normalizeMediaUrl } from './driveUrl';

function coerceField(value: unknown, field: FieldDef) {
  switch (field.type) {
    case 'text':    return coerceText(value);
    case 'number':  return coerceNumber(value, { min: field.min, max: field.max });
    case 'integer': return coerceInteger(value, { min: field.min, max: field.max });
    case 'boolean': return coerceBoolean(value);
    case 'uuid':    return coerceUuid(value);
    case 'url':     return coerceText(value);
  }
}

export function validateRows(raws: RawRow[], map: ColumnMap): ValidationSummary {
  const seenSkus = new Map<string, number>();
  const rows: ParsedRow[] = [];

  for (const raw of raws) {
    const errors: string[] = [];
    const warnings: string[] = [];
    const fields: Record<string, unknown> = {};

    for (const field of map.fields) {
      const inputValue = raw.raw[field.excelColumn];
      const result = coerceField(inputValue, field);
      if (!result.ok) {
        errors.push(`${field.excelColumn}: ${result.error}`);
        continue;
      }
      if (result.value === null) {
        if (field.required) {
          errors.push(`${field.excelColumn}: required`);
        }
        continue;
      }
      if (field.type === 'text' && field.pattern && typeof result.value === 'string') {
        if (!field.pattern.test(result.value)) {
          errors.push(`${field.excelColumn}: invalid format ("${result.value}")`);
          continue;
        }
      }
      if (field.type === 'text' && field.max && typeof result.value === 'string') {
        if (result.value.length > field.max) {
          errors.push(`${field.excelColumn}: too long (max ${field.max})`);
          continue;
        }
      }
      fields[field.dbColumn] = result.value;
    }

    const skuValue = fields[map.uniqueKey];
    if (typeof skuValue === 'string') {
      if (seenSkus.has(skuValue)) {
        errors.push(`duplicate SKU in file (first seen at row ${seenSkus.get(skuValue)})`);
      } else {
        seenSkus.set(skuValue, raw.rowIndex);
      }
    }

    const normal = fields['normal_price'] ?? fields['price_regular'];
    const merchant = fields['merchant_price'] ?? fields['price_merchant'];
    if (typeof normal === 'number' && typeof merchant === 'number' && merchant > normal) {
      warnings.push(`merchant_price (${merchant}) > normal_price (${normal})`);
    }

    const mediaUrls = {
      default: null as string | null,
      gallery: [] as string[],
      video: null as string | null,
    };
    for (const col of map.mediaColumns) {
      const raw_url = raw.raw[col.excelColumn];
      if (raw_url === null || raw_url === undefined || raw_url === '') continue;
      const normalized = normalizeMediaUrl(String(raw_url));
      if (!normalized) {
        errors.push(`${col.excelColumn}: invalid URL ("${raw_url}")`);
        continue;
      }
      if (col.role === 'default_image') mediaUrls.default = normalized;
      else if (col.role === 'gallery') mediaUrls.gallery.push(normalized);
      else if (col.role === 'video') mediaUrls.video = normalized;
    }

    rows.push({ rowIndex: raw.rowIndex, fields, mediaUrls, errors, warnings });
  }

  const validRows = rows.filter(r => r.errors.length === 0).length;
  const errorRows = rows.filter(r => r.errors.length > 0).length;
  const warningRows = rows.filter(r => r.errors.length === 0 && r.warnings.length > 0).length;

  return {
    rows,
    totalRows: rows.length,
    validRows,
    errorRows,
    warningRows,
    headerErrors: [],
  };
}
