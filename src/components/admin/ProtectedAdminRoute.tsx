import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import type { Enums } from '@/integrations/supabase/types';

interface ProtectedAdminRouteProps {
  children: React.ReactNode;
  allowedRoles?: Enums<'user_role'>[];
}

export default function ProtectedAdminRoute({
  children,
  allowedRoles = ['admin', 'staff', 'manager']
}: ProtectedAdminRouteProps) {
  const [adminUser, setAdminUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminAuth = () => {
      try {
        // Check for admin user in localStorage
        const storedAdminUser = localStorage.getItem('admin_user');
        if (storedAdminUser) {
          const adminData = JSON.parse(storedAdminUser);
          setAdminUser(adminData);
        }
      } catch (error) {
        console.error('Error parsing admin user:', error);
        localStorage.removeItem('admin_user');
      } finally {
        setLoading(false);
      }
    };

    checkAdminAuth();
  }, []);

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to auth if not authenticated
  if (!adminUser) {
    return <Navigate to="/auth" replace />;
  }

  // Redirect to home if user doesn't have required role
  if (!allowedRoles.includes(adminUser.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            You don't have permission to access the admin panel.
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}