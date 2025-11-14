import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function DebugShops() {
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const runTests = async () => {
    setLoading(true);
    const testResults: any = {};

    // Test 1: Check if table exists and has data
    try {
      const { data, error, count } = await supabase
        .from('premium_partnerships' as any)
        .select('*', { count: 'exact' });

      testResults.tableQuery = {
        success: !error,
        error: error?.message,
        count: count,
        data: data,
        hasData: data && data.length > 0
      };
    } catch (err: any) {
      testResults.tableQuery = {
        success: false,
        error: err.message
      };
    }

    // Test 2: Check if function exists
    try {
      const { data, error } = await (supabase.rpc as any)('get_active_partnerships');

      testResults.functionQuery = {
        success: !error,
        error: error?.message,
        data: data,
        count: data?.length || 0
      };
    } catch (err: any) {
      testResults.functionQuery = {
        success: false,
        error: err.message
      };
    }

    // Test 3: Check data with different filters
    try {
      const { data, error } = await supabase
        .from('premium_partnerships' as any)
        .select('id, business_name, subscription_status, admin_approved, subscription_end_date, created_at');

      testResults.detailedData = {
        success: !error,
        error: error?.message,
        data: data
      };
    } catch (err: any) {
      testResults.detailedData = {
        success: false,
        error: err.message
      };
    }

    // Test 4: Check active partnerships with manual filter
    try {
      const { data, error } = await supabase
        .from('premium_partnerships' as any)
        .select('*')
        .eq('subscription_status', 'ACTIVE')
        .eq('admin_approved', true);

      testResults.activePartnerships = {
        success: !error,
        error: error?.message,
        data: data,
        count: data?.length || 0
      };
    } catch (err: any) {
      testResults.activePartnerships = {
        success: false,
        error: err.message
      };
    }

    setResults(testResults);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Debug Premium Partnerships</h1>
          <p className="text-muted-foreground">
            Test database queries to diagnose Find Shops page issues
          </p>
        </div>

        <Button onClick={runTests} disabled={loading}>
          {loading ? 'Running Tests...' : 'Run Diagnostic Tests'}
        </Button>

        {Object.keys(results).length > 0 && (
          <div className="space-y-4">
            {/* Test 1: Table Query */}
            <Card>
              <CardHeader>
                <CardTitle>Test 1: Direct Table Query</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                  {JSON.stringify(results.tableQuery, null, 2)}
                </pre>
              </CardContent>
            </Card>

            {/* Test 2: Function Query */}
            <Card>
              <CardHeader>
                <CardTitle>Test 2: get_active_partnerships() Function</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                  {JSON.stringify(results.functionQuery, null, 2)}
                </pre>
              </CardContent>
            </Card>

            {/* Test 3: Detailed Data */}
            <Card>
              <CardHeader>
                <CardTitle>Test 3: Partnership Details</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                  {JSON.stringify(results.detailedData, null, 2)}
                </pre>
              </CardContent>
            </Card>

            {/* Test 4: Active Partnerships */}
            <Card>
              <CardHeader>
                <CardTitle>Test 4: Manually Filtered Active Partnerships</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                  {JSON.stringify(results.activePartnerships, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </div>
        )}
    </div>
  );
}
