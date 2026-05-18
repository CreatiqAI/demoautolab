// src/lib/bulkImport/types.ts

export type Entity = 'component' | 'product';
export type ImportMode = 'insert' | 'update' | 'upsert';

export type FieldType = 'text' | 'number' | 'integer' | 'boolean' | 'url' | 'uuid';

export type MediaRole = 'default_image' | 'gallery' | 'video';

export interface FieldDef {
  excelColumn: string;
  dbColumn: string;
  required: boolean;
  type: FieldType;
  min?: number;
  max?: number;
  pattern?: RegExp;
}

export interface MediaColumnDef {
  excelColumn: string;
  role: MediaRole;
  sortOrder?: number;
}

export interface ColumnMap {
  entity: Entity;
  table: string;
  uniqueKey: string;
  fields: FieldDef[];
  mediaColumns: MediaColumnDef[];
}

export interface RawRow {
  rowIndex: number;
  raw: Record<string, unknown>;
}

export interface ParsedRow {
  rowIndex: number;
  fields: Record<string, unknown>;
  mediaUrls: {
    default: string | null;
    gallery: string[];
    video: string | null;
  };
  errors: string[];
  warnings: string[];
}

export interface ValidationSummary {
  rows: ParsedRow[];
  totalRows: number;
  validRows: number;
  errorRows: number;
  warningRows: number;
  headerErrors: string[];
}

export interface BatchResult {
  rowIndex: number;
  status: 'inserted' | 'updated' | 'skipped' | 'error';
  sku: string;
  recordId?: string;
  error?: string;
  mediaErrors?: string[];
}

export interface ImportRequest {
  entity: Entity;
  mode: ImportMode;
  admin_id: string;
  rows: Array<{
    rowIndex: number;
    fields: Record<string, unknown>;
    mediaUrls: ParsedRow['mediaUrls'];
  }>;
}

export interface ImportResponse {
  results: BatchResult[];
}
