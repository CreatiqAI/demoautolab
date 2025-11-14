import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle } from 'lucide-react';

export default function ReviewsDebug() {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runTest = async (testName: string, testFn: () => Promise<any>) => {
    setLoading(true);
    try {
      const result = await testFn();
      setResults((prev: any) => ({
        ...prev,
        [testName]: { success: true, data: result }
      }));
    } catch (error: any) {
      setResults((prev: any) => ({
        ...prev,
        [testName]: { success: false, error: error.message || String(error) }
      }));
    } finally {
      setLoading(false);
    }
  };

  const testTableExists = async () => {
    const { data, error } = await supabase
      .from('product_reviews')
      .select('count')
      .limit(0);

    if (error) throw error;
    return 'Table exists';
  };

  const testFetchAllReviews = async () => {
    const { data, error } = await supabase
      .from('product_reviews')
      .select('*');

    if (error) throw error;
    return { count: data?.length || 0, reviews: data };
  };

  const testFetchWithProducts = async () => {
    const { data, error } = await supabase
      .from('product_reviews')
      .select(`
        *,
        products_new (name)
      `);

    if (error) throw error;
    return { count: data?.length || 0, reviews: data };
  };

  const testCurrentUser = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return {
      email: user?.email,
      id: user?.id,
      role: user?.role
    };
  };

  const testRLSBypass = async () => {
    // Try to fetch using service role query (if available)
    const { count, error } = await supabase
      .from('product_reviews')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;
    return { total_count: count };
  };

  const testInsertReview = async () => {
    // Get first product
    const { data: products } = await supabase
      .from('products_new')
      .select('id, name')
      .limit(1)
      .single();

    if (!products) throw new Error('No products found');

    // Try to insert a test review
    const { data, error } = await supabase
      .from('product_reviews')
      .insert({
        product_id: products.id,
        customer_name: 'Debug Test User',
        customer_email: 'debug@test.com',
        rating: 5,
        title: 'Debug Test Review',
        comment: 'This is a test review created by the debug tool.',
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;
    return { inserted: true, review: data, product: products };
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Reviews Debug Tool</h2>
        <p className="text-muted-foreground">
          Test database connectivity and review system functionality
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Button onClick={() => runTest('user', testCurrentUser)} disabled={loading}>
          1. Test Current User
        </Button>

        <Button onClick={() => runTest('table', testTableExists)} disabled={loading}>
          2. Test Table Exists
        </Button>

        <Button onClick={() => runTest('reviews', testFetchAllReviews)} disabled={loading}>
          3. Fetch All Reviews
        </Button>

        <Button onClick={() => runTest('withProducts', testFetchWithProducts)} disabled={loading}>
          4. Fetch Reviews with Products
        </Button>

        <Button onClick={() => runTest('rls', testRLSBypass)} disabled={loading}>
          5. Test RLS Count
        </Button>

        <Button onClick={() => runTest('insert', testInsertReview)} disabled={loading}>
          6. Insert Test Review
        </Button>
      </div>

      {loading && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Testing...</AlertTitle>
          <AlertDescription>Running diagnostic test</AlertDescription>
        </Alert>
      )}

      {results && (
        <div className="space-y-4">
          {Object.entries(results).map(([testName, result]: [string, any]) => (
            <Card key={testName}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                  Test: {testName}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {result.success ? (
                  <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                ) : (
                  <Alert variant="destructive">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{result.error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
