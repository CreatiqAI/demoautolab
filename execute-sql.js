// Simple script to execute SQL using supabase client
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://znxtabtksamgdsylagfo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpueHRhYnRrc2FtZ2RzeWxhZ2ZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU4OTY5NjEsImV4cCI6MjA1MTQ3Mjk2MX0.g8dMBkqKWr3HDzjWwO6T5HKCLdCMYjNvJb1yUQKPStg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeSql() {
  console.log('Adding pricing columns to products_new...');
  
  // Add columns
  const { data: alterData, error: alterError } = await supabase
    .rpc('exec_sql', {
      query: `
        ALTER TABLE public.products_new 
        ADD COLUMN IF NOT EXISTS normal_price NUMERIC(12,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS merchant_price NUMERIC(12,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS screen_size TEXT[] DEFAULT '{}';
      `
    });
  
  if (alterError) {
    console.error('Error adding columns:', alterError);
  } else {
    console.log('Columns added successfully');
  }

  // Create function
  console.log('Creating get_products_with_pricing function...');
  
  const { data: funcData, error: funcError } = await supabase
    .rpc('exec_sql', {
      query: `
        CREATE OR REPLACE FUNCTION get_products_with_pricing(
            customer_user_id UUID DEFAULT NULL
        )
        RETURNS TABLE (
            id UUID,
            name TEXT,
            slug TEXT,
            description TEXT,
            brand TEXT,
            model TEXT,
            year_from INTEGER,
            year_to INTEGER,
            screen_size TEXT[],
            active BOOLEAN,
            featured BOOLEAN,
            price NUMERIC,
            normal_price NUMERIC,
            merchant_price NUMERIC,
            customer_type TEXT,
            created_at TIMESTAMPTZ,
            product_images JSONB
        )
        SECURITY DEFINER
        SET search_path = public
        AS $$
        DECLARE
            customer_type_value TEXT := 'normal';
        BEGIN
            -- Get customer type if user_id provided
            IF customer_user_id IS NOT NULL THEN
                SELECT COALESCE(cp.customer_type, 'normal') INTO customer_type_value
                FROM public.customer_profiles cp
                WHERE cp.user_id = customer_user_id AND cp.is_active = true
                LIMIT 1;
            END IF;
            
            RETURN QUERY
            SELECT 
                p.id,
                p.name,
                p.slug,
                p.description,
                p.brand,
                p.model,
                p.year_from,
                p.year_to,
                p.screen_size,
                p.active,
                p.featured,
                -- Return merchant_price for merchants, normal_price for others
                CASE 
                    WHEN customer_type_value = 'merchant' THEN p.merchant_price
                    ELSE p.normal_price
                END AS price,
                p.normal_price,
                p.merchant_price,
                customer_type_value AS customer_type,
                p.created_at,
                -- Get product images as JSONB
                COALESCE(
                    (SELECT jsonb_agg(
                        jsonb_build_object(
                            'url', pi.url,
                            'alt_text', pi.alt_text,
                            'is_primary', pi.is_primary,
                            'sort_order', pi.sort_order
                        ) ORDER BY pi.sort_order, pi.created_at
                    )
                    FROM public.product_images_new pi
                    WHERE pi.product_id = p.id),
                    '[]'::jsonb
                ) AS product_images
            FROM public.products_new p
            WHERE p.active = true
            ORDER BY p.created_at DESC;
        END;
        $$ LANGUAGE plpgsql;
        
        GRANT EXECUTE ON FUNCTION get_products_with_pricing(UUID) TO authenticated, anon;
      `
    });

  if (funcError) {
    console.error('Error creating function:', funcError);
  } else {
    console.log('Function created successfully');
  }

  // Update some sample products with pricing
  console.log('Updating sample products with pricing...');
  
  const { data: updateData, error: updateError } = await supabase
    .rpc('exec_sql', {
      query: `
        UPDATE public.products_new 
        SET 
            normal_price = 299.00,
            merchant_price = 249.00
        WHERE (normal_price = 0 OR normal_price IS NULL)
        AND id IN (SELECT id FROM public.products_new LIMIT 10);
      `
    });

  if (updateError) {
    console.error('Error updating products:', updateError);
  } else {
    console.log('Sample products updated with pricing');
  }
}

executeSql().catch(console.error);