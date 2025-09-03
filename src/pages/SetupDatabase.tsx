import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

const SetupDatabase = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<Array<{step: string, status: 'success' | 'error' | 'pending', message: string}>>([]);

  const addResult = (step: string, status: 'success' | 'error' | 'pending', message: string) => {
    setResults(prev => [...prev, { step, status, message }]);
  };

  const setupDatabase = async () => {
    setIsLoading(true);
    setResults([]);

    try {
      // Step 1: Add pricing columns to products_new
      addResult('Adding Columns', 'pending', 'Adding pricing columns to products_new table...');
      
      try {
        const { error: alterError } = await supabase.rpc('sql', {
          query: `
            ALTER TABLE public.products_new 
            ADD COLUMN IF NOT EXISTS normal_price NUMERIC(12,2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS merchant_price NUMERIC(12,2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS screen_size TEXT[] DEFAULT '{}';
          `
        });

        if (alterError) throw alterError;
        addResult('Adding Columns', 'success', 'Pricing columns added successfully');
      } catch (error: any) {
        addResult('Adding Columns', 'error', `Error: ${error.message}`);
      }

      // Step 2: Create the pricing function
      addResult('Creating Function', 'pending', 'Creating get_products_with_pricing function...');
      
      try {
        const { error: funcError } = await supabase.rpc('sql', {
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
          `
        });

        if (funcError) throw funcError;
        addResult('Creating Function', 'success', 'Function created successfully');
      } catch (error: any) {
        addResult('Creating Function', 'error', `Error: ${error.message}`);
      }

      // Step 3: Grant permissions
      addResult('Setting Permissions', 'pending', 'Granting function permissions...');
      
      try {
        const { error: grantError } = await supabase.rpc('sql', {
          query: `GRANT EXECUTE ON FUNCTION get_products_with_pricing(UUID) TO authenticated, anon;`
        });

        if (grantError) throw grantError;
        addResult('Setting Permissions', 'success', 'Permissions granted successfully');
      } catch (error: any) {
        addResult('Setting Permissions', 'error', `Error: ${error.message}`);
      }

      // Step 4: Update sample products with pricing
      addResult('Updating Products', 'pending', 'Adding sample pricing to products...');
      
      try {
        const { error: updateError } = await supabase.rpc('sql', {
          query: `
            UPDATE public.products_new 
            SET 
                normal_price = CASE 
                  WHEN random() > 0.5 THEN 299.00 
                  ELSE 199.00 
                END,
                merchant_price = CASE 
                  WHEN random() > 0.5 THEN 249.00 
                  ELSE 149.00 
                END
            WHERE (normal_price = 0 OR normal_price IS NULL);
          `
        });

        if (updateError) throw updateError;
        addResult('Updating Products', 'success', 'Sample pricing added to all products');
      } catch (error: any) {
        addResult('Updating Products', 'error', `Error: ${error.message}`);
      }

    } catch (error: any) {
      addResult('General Error', 'error', `Unexpected error: ${error.message}`);
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              Database Setup for B2B/B2C Pricing
            </CardTitle>
            <p className="text-center text-muted-foreground">
              Run this setup to enable B2B pricing functionality on the catalog page
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="text-center">
              <Button 
                onClick={setupDatabase} 
                disabled={isLoading}
                className="w-full max-w-md"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting up database...
                  </>
                ) : (
                  'Setup Database for B2B Pricing'
                )}
              </Button>
            </div>

            {results.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Setup Progress:</h3>
                <div className="space-y-3">
                  {results.map((result, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      {result.status === 'success' && (
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                      )}
                      {result.status === 'error' && (
                        <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                      )}
                      {result.status === 'pending' && (
                        <Loader2 className="h-5 w-5 text-blue-600 animate-spin flex-shrink-0" />
                      )}
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{result.step}</span>
                          <Badge variant={
                            result.status === 'success' ? 'default' : 
                            result.status === 'error' ? 'destructive' : 
                            'secondary'
                          }>
                            {result.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {result.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {!isLoading && results.every(r => r.status !== 'pending') && (
                  <div className="text-center mt-6 p-4 bg-blue-50 rounded-lg">
                    <p className="text-blue-800 font-medium">
                      Setup complete! You can now visit the catalog page to test B2B pricing.
                    </p>
                    <Button 
                      className="mt-3"
                      onClick={() => window.location.href = '/catalog'}
                    >
                      Go to Catalog
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SetupDatabase;