// Database monitoring utilities for AUTO LABS
// Use these functions to monitor database performance and health

import { supabase } from '@/lib/supabase';

interface DatabaseStats {
  productCount: number;
  orderCount: number;
  userCount: number;
  todayOrders: number;
  monthlyOrders: number;
  averageOrderValue: number;
  topSellingProducts: Array<{
    name: string;
    sales: number;
  }>;
}

interface PerformanceMetrics {
  avgQueryTime: number;
  slowQueries: Array<{
    query: string;
    duration: number;
  }>;
  errorRate: number;
}

export class DatabaseMonitor {
  
  // Get basic database statistics
  static async getDatabaseStats(): Promise<DatabaseStats | null> {
    try {
      // Get counts in parallel for better performance
      const [
        { count: productCount },
        { count: orderCount },
        { count: userCount }
      ] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true })
      ]);

      // Get today's orders
      const today = new Date().toISOString().split('T')[0];
      const { count: todayOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today);

      // Get this month's orders
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const { count: monthlyOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', monthStart);

      // Get average order value
      const { data: avgData } = await supabase
        .from('orders')
        .select('total')
        .gte('created_at', monthStart);

      const averageOrderValue = avgData?.length 
        ? avgData.reduce((sum, order) => sum + (order.total || 0), 0) / avgData.length
        : 0;

      // Get top selling products (simplified version)
      const { data: topProducts } = await supabase
        .from('order_items')
        .select(`
          component_name,
          quantity
        `)
        .gte('created_at', monthStart);

      const productSales = topProducts?.reduce((acc: Record<string, number>, item) => {
        acc[item.component_name] = (acc[item.component_name] || 0) + item.quantity;
        return acc;
      }, {}) || {};

      const topSellingProducts = Object.entries(productSales)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([name, sales]) => ({ name, sales }));

      return {
        productCount: productCount || 0,
        orderCount: orderCount || 0,
        userCount: userCount || 0,
        todayOrders: todayOrders || 0,
        monthlyOrders: monthlyOrders || 0,
        averageOrderValue,
        topSellingProducts
      };

    } catch (error) {
      console.error('Failed to fetch database stats:', error);
      return null;
    }
  }

  // Check database connection health
  static async checkDatabaseHealth(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('categories')
        .select('count')
        .limit(1);
      
      return !error;
    } catch {
      return false;
    }
  }

  // Monitor query performance (basic version)
  static async testQueryPerformance(): Promise<PerformanceMetrics> {
    const metrics: PerformanceMetrics = {
      avgQueryTime: 0,
      slowQueries: [],
      errorRate: 0
    };

    const queries = [
      {
        name: 'Product Listing',
        query: () => supabase.from('products').select('id, name, price').eq('active', true).limit(20)
      },
      {
        name: 'Order Dashboard',
        query: () => supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(10)
      },
      {
        name: 'Category Listing',
        query: () => supabase.from('categories').select('*').eq('active', true)
      }
    ];

    let totalTime = 0;
    let errorCount = 0;

    for (const test of queries) {
      const startTime = performance.now();
      try {
        await test.query();
        const duration = performance.now() - startTime;
        totalTime += duration;
        
        if (duration > 1000) { // Slow queries > 1 second
          metrics.slowQueries.push({
            query: test.name,
            duration
          });
        }
      } catch (error) {
        errorCount++;
        console.error(`Query failed: ${test.name}`, error);
      }
    }

    metrics.avgQueryTime = totalTime / queries.length;
    metrics.errorRate = errorCount / queries.length;

    return metrics;
  }

  // Check storage usage (estimation)
  static async getStorageEstimate(): Promise<{
    estimatedSize: number;
    breakdown: Record<string, number>;
  }> {
    try {
      const stats = await this.getDatabaseStats();
      if (!stats) return { estimatedSize: 0, breakdown: {} };

      // Rough size estimates based on typical record sizes
      const breakdown = {
        products: stats.productCount * 2, // ~2KB per product
        orders: stats.orderCount * 1, // ~1KB per order
        users: stats.userCount * 0.5, // ~0.5KB per user
        orderItems: stats.orderCount * 3 * 0.5, // ~3 items per order, 0.5KB each
        other: 10 // Other tables
      };

      const estimatedSize = Object.values(breakdown).reduce((sum, size) => sum + size, 0);

      return {
        estimatedSize, // in KB
        breakdown
      };
    } catch (error) {
      console.error('Failed to estimate storage:', error);
      return { estimatedSize: 0, breakdown: {} };
    }
  }

  // Alert thresholds
  static checkAlerts(stats: DatabaseStats, performance: PerformanceMetrics): Array<{
    type: 'warning' | 'critical';
    message: string;
  }> {
    const alerts = [];

    // Performance alerts
    if (performance.avgQueryTime > 2000) {
      alerts.push({
        type: 'critical' as const,
        message: `Average query time is ${performance.avgQueryTime.toFixed(0)}ms (threshold: 2000ms)`
      });
    }

    if (performance.errorRate > 0.1) {
      alerts.push({
        type: 'critical' as const,
        message: `High error rate: ${(performance.errorRate * 100).toFixed(1)}%`
      });
    }

    // Volume alerts
    if (stats.monthlyOrders > 800) {
      alerts.push({
        type: 'warning' as const,
        message: `Monthly orders (${stats.monthlyOrders}) approaching 1000 limit`
      });
    }

    if (stats.productCount > 800) {
      alerts.push({
        type: 'warning' as const,
        message: `Product count (${stats.productCount}) approaching 1000 limit`
      });
    }

    return alerts;
  }
}

// Hook for React components
export function useDatabaseMonitoring() {
  const [stats, setStats] = React.useState<DatabaseStats | null>(null);
  const [performance, setPerformance] = React.useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = React.useState(true);

  const refreshData = async () => {
    setLoading(true);
    try {
      const [statsData, perfData] = await Promise.all([
        DatabaseMonitor.getDatabaseStats(),
        DatabaseMonitor.testQueryPerformance()
      ]);
      setStats(statsData);
      setPerformance(perfData);
    } catch (error) {
      console.error('Failed to refresh monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    refreshData();
    // Refresh every 5 minutes
    const interval = setInterval(refreshData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return {
    stats,
    performance,
    loading,
    refreshData,
    alerts: stats && performance ? DatabaseMonitor.checkAlerts(stats, performance) : []
  };
}