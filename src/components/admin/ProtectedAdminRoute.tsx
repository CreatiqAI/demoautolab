import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/index';
import type { Enums } from '@/integrations/supabase/types';

interface ProtectedAdminRouteProps {
  children: React.ReactNode;
  allowedRoles?: Enums<'user_role'>[];
}

export default function ProtectedAdminRoute({ 
  children, 
  allowedRoles = ['admin', 'staff'] 
}: ProtectedAdminRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const [userRole, setUserRole] = useState<Enums<'user_role'> | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<any>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      // Check for admin user in localStorage first
      const storedAdminUser = localStorage.getItem('admin_user');
      if (storedAdminUser) {
        try {
          const adminData = JSON.parse(storedAdminUser);
          setAdminUser(adminData);
          setUserRole(adminData.role as Enums<'user_role'>);
          setRoleLoading(false);
          return;
        } catch (error) {
          console.error('Error parsing stored admin user:', error);
          localStorage.removeItem('admin_user');
        }
      }

      // Fallback to regular Supabase auth
      if (!user) {
        setRoleLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user role:', error);
          setUserRole(null);
        } else {
          setUserRole(data?.role || null);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        setUserRole(null);
      } finally {
        setRoleLoading(false);
      }
    };

    fetchUserRole();
  }, [user]);

  // Show loading spinner while auth or role is loading
  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to auth if not authenticated (check both regular user and admin user)
  if (!user && !adminUser) {
    return <Navigate to="/auth" replace />;
  }

  // Redirect to home if user doesn't have required role
  if (!userRole || !allowedRoles.includes(userRole)) {
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