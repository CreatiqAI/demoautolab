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

// Media URL after client-side re-hosting via the rehost-media-url edge function.
// YouTube/Vimeo URLs pass through with their original URL; everything else has
// been downloaded and re-uploaded to Supabase Storage by this point.
export interface ResolvedMedia {
  url: string;
  mediaType: 'image' | 'video';
  isPrimary: boolean;
  sortOrder: number;
}

export interface ImportRequest {
  entity: Entity;
  mode: ImportMode;
  admin_id: string;
  rows: Array<{
    rowIndex: number;
    fields: Record<string, unknown>;
    resolvedMedia: ResolvedMedia[];
    mediaErrors?: string[];
  }>;
}

export interface ImportResponse {
  results: BatchResult[];
}
