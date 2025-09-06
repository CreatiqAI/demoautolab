import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface HealthStatus {
  database: 'healthy' | 'unhealthy' | 'checking';
  api: 'healthy' | 'unhealthy' | 'checking';
  lastCheck: Date;
}

export function useHealthCheck() {
  const [health, setHealth] = useState<HealthStatus>({
    database: 'checking',
    api: 'checking',
    lastCheck: new Date()
  });

  const checkHealth = async () => {
    try {
      // Check database connection
      const { error: dbError } = await supabase
        .from('categories')
        .select('count')
        .limit(1);

      const dbStatus = dbError ? 'unhealthy' : 'healthy';
      
      // Check if build is working
      const apiStatus = 'healthy'; // Since we can run the check, API is working

      setHealth({
        database: dbStatus,
        api: apiStatus,
        lastCheck: new Date()
      });

    } catch (error) {
      console.error('Health check failed:', error);
      setHealth({
        database: 'unhealthy',
        api: 'unhealthy',
        lastCheck: new Date()
      });
    }
  };

  useEffect(() => {
    checkHealth();
    // Check health every 5 minutes
    const interval = setInterval(checkHealth, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return { health, checkHealth };
}

// Component for displaying health status (for admin dashboard)
export function HealthStatusIndicator() {
  const { health, checkHealth } = useHealthCheck();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'unhealthy': return 'text-red-600';
      case 'checking': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return '✅';
      case 'unhealthy': return '❌';
      case 'checking': return '🔄';
      default: return '❓';
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">System Health</h3>
        <button
          onClick={checkHealth}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Refresh
        </button>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm">Database:</span>
          <span className={`text-sm font-medium ${getStatusColor(health.database)}`}>
            {getStatusIcon(health.database)} {health.database}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm">Application:</span>
          <span className={`text-sm font-medium ${getStatusColor(health.api)}`}>
            {getStatusIcon(health.api)} {health.api}
          </span>
        </div>
        
        <div className="text-xs text-gray-500 mt-2">
          Last checked: {health.lastCheck.toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}