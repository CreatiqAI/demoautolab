---
name: supabase-crud
description: Generate complete Supabase CRUD operations (create, read, update, delete) for a database table with TypeScript types, error handling, and toast notifications
user-invocable: true
disable-model-invocation: false
---

Generate Supabase CRUD operations for the AutoLab project.

Table/feature: $ARGUMENTS

## Requirements

1. First, check the table schema in `src/integrations/supabase/types.ts` to understand the Row, Insert, and Update types
2. If the table is not yet in the types file, check `database/` migration files for the SQL schema
3. Generate operations following the patterns in `src/pages/admin/Products.tsx` and `src/hooks/useReturns.ts`

## Pattern for CRUD Operations

### Import Pattern
```tsx
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

// If the table is in the generated types:
type MyEntity = Tables<'table_name'>;

// If the table is NOT in generated types (recently added), define manually:
interface MyEntity {
  id: string;
  // ... fields matching the database schema
  created_at: string;
  updated_at: string;
}
```

### Fetch (READ) - with search, filter, pagination
```tsx
const fetchItems = async (searchTerm?: string, filter?: string) => {
  try {
    let query = supabase
      .from('table_name')
      .select('*, related_table(field)')  // Include joins as needed
      .order('created_at', { ascending: false });

    if (searchTerm) {
      query = query.or(`name.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%`);
    }
    if (filter && filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    toast({ title: "Error", description: "Failed to fetch items", variant: "destructive" });
    return [];
  }
};
```

### Create (INSERT)
```tsx
const createItem = async (formData: Partial<MyEntity>) => {
  try {
    const { data, error } = await supabase
      .from('table_name')
      .insert(formData)
      .select()
      .single();

    if (error) throw error;
    toast({ title: "Success", description: "Item created successfully" });
    return data;
  } catch (error: any) {
    toast({ title: "Error", description: error.message || "Failed to create item", variant: "destructive" });
    return null;
  }
};
```

### Update (UPDATE)
```tsx
const updateItem = async (id: string, updates: Partial<MyEntity>) => {
  try {
    const { error } = await supabase
      .from('table_name')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    toast({ title: "Success", description: "Item updated successfully" });
    return true;
  } catch (error: any) {
    toast({ title: "Error", description: error.message || "Failed to update item", variant: "destructive" });
    return false;
  }
};
```

### Delete (DELETE)
```tsx
const deleteItem = async (id: string) => {
  try {
    const { error } = await supabase
      .from('table_name')
      .delete()
      .eq('id', id);

    if (error) throw error;
    toast({ title: "Success", description: "Item deleted successfully" });
    return true;
  } catch (error: any) {
    toast({ title: "Error", description: error.message || "Failed to delete item", variant: "destructive" });
    return false;
  }
};
```

### RPC Functions (for complex operations)
```tsx
const callRpcFunction = async (params: Record<string, any>) => {
  const { data, error } = await (supabase.rpc as any)('function_name', params);
  if (error) throw error;
  return data;
};
```

## Important Notes
- For tables not yet in generated types, cast with `as any`: `.from('table_name' as any)`
- Always refresh the data list after create/update/delete
- Use `.select()` after `.insert()` or `.update()` when you need the returned data
- Use `.single()` when expecting exactly one row
- Use `.maybeSingle()` when the row may or may not exist (avoids 406 errors)
- For file uploads, use `supabase.storage.from('bucket').upload(path, file)`
- RLS policies may restrict access -- if you get permission errors, check the RLS policies in the migration files under `database/`
