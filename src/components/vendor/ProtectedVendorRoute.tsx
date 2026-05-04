import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentVendor } from '@/lib/vendorAuth';
import { Loader2, Clock, AlertTriangle, Ban } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ProtectedVendorRouteProps {
  children: React.ReactNode;
}

/**
 * Gate for vendor-only pages (/vendor/*).
 *
 * Three cases beyond the standard "is signed in" check:
 *   - User has NO vendor row -> redirect to /vendor/apply (they're not a vendor)
 *   - Vendor status PENDING / SUSPENDED / REJECTED -> show a status page, not
 *     the dashboard. Avoids the awkward "logged in but everything 404s" feeling.
 *   - APPROVED -> render the protected children.
 */
export default function ProtectedVendorRoute({ children }: ProtectedVendorRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { vendor, loading: vendorLoading } = useCurrentVendor();

  if (authLoading || vendorLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-lime-600" />
          <p className="text-sm text-muted-foreground">Loading vendor console…</p>
        </div>
      </div>
    );
  }

  // Not signed in -> regular auth flow
  if (!user) {
    return <Navigate to="/auth" replace state={{ from: '/vendor/dashboard' }} />;
  }

  // Signed in but no vendor record -> route them to apply
  if (!vendor) {
    return <Navigate to="/vendor/apply" replace />;
  }

  // Has vendor record but not approved -> status page
  if (vendor.status !== 'APPROVED') {
    return <VendorStatusPage status={vendor.status} reason={vendor.rejection_reason} />;
  }

  return <>{children}</>;
}

function VendorStatusPage({ status, reason }: { status: string; reason: string | null }) {
  const cfg =
    status === 'PENDING'
      ? {
          Icon: Clock,
          color: 'text-amber-600',
          bg: 'bg-amber-50 border-amber-200',
          title: 'Application under review',
          body: 'Thanks for applying! Our team is reviewing your business details. This usually takes 1–2 business days. You will receive an email once approved.',
        }
      : status === 'SUSPENDED'
        ? {
            Icon: AlertTriangle,
            color: 'text-orange-600',
            bg: 'bg-orange-50 border-orange-200',
            title: 'Account suspended',
            body: reason || 'Your vendor account is temporarily suspended. Please contact AutoLab support to resolve this.',
          }
        : {
            Icon: Ban,
            color: 'text-red-600',
            bg: 'bg-red-50 border-red-200',
            title: 'Application rejected',
            body: reason || 'Your vendor application was not approved. Please contact AutoLab support if you believe this is in error.',
          };

  const { Icon } = cfg;
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className={`max-w-md w-full ${cfg.bg}`}>
        <CardContent className="py-10 text-center">
          <div className={`inline-flex items-center justify-center w-14 h-14 rounded-full bg-white shadow-sm mb-4`}>
            <Icon className={`h-7 w-7 ${cfg.color}`} />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">{cfg.title}</h1>
          <p className="text-sm text-gray-700 mb-6">{cfg.body}</p>
          <Button variant="outline" onClick={() => (window.location.href = '/')}>
            Back to home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
