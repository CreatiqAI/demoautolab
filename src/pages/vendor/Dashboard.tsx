import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useCurrentVendor } from '@/lib/vendorAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Package,
  ShoppingBag,
  Wallet,
  TrendingUp,
  CheckCircle2,
  Clock,
  Loader2,
  ArrowRight,
} from 'lucide-react';

interface DashboardStats {
  approvedProducts: number;
  pendingProducts: number;
  pendingFulfilments: number;
  shippedFulfilments: number;
  pendingPayoutBalance: number;
  last30Sales: number;
}

const formatRM = (n: number) =>
  new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(n);

export default function VendorDashboard() {
  const { vendor } = useCurrentVendor();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    approvedProducts: 0,
    pendingProducts: 0,
    pendingFulfilments: 0,
    shippedFulfilments: 0,
    pendingPayoutBalance: 0,
    last30Sales: 0,
  });

  useEffect(() => {
    if (!vendor?.id) return;
    void loadStats(vendor.id);
  }, [vendor?.id]);

  const loadStats = async (vendorId: string) => {
    setLoading(true);
    try {
      // Products
      const { data: products } = await supabase
        .from('products_new' as any)
        .select('id, approval_status')
        .eq('vendor_id', vendorId);
      const approvedProducts = ((products as any[] | null) ?? []).filter(p => p.approval_status === 'APPROVED').length;
      const pendingProducts = ((products as any[] | null) ?? []).filter(p => p.approval_status === 'PENDING').length;

      // Fulfilments
      const { data: fulfilments } = await supabase
        .from('vendor_fulfilments' as any)
        .select('id, status')
        .eq('vendor_id', vendorId);
      const fulRows = (fulfilments as any[] | null) ?? [];
      const pendingFulfilments = fulRows.filter(f => f.status === 'PENDING' || f.status === 'PROCESSING').length;
      const shippedFulfilments = fulRows.filter(f => f.status === 'SHIPPED').length;

      // Sales last 30 days (uses order_items totals where vendor_id = us)
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const { data: items } = await supabase
        .from('order_items' as any)
        .select('total_price, created_at')
        .eq('vendor_id', vendorId)
        .gte('created_at', since.toISOString());
      const last30Sales = ((items as any[] | null) ?? []).reduce(
        (sum, i) => sum + (Number(i.total_price) || 0),
        0
      );
      // Pending payout estimate: gross sales * (1 - commission_rate). Phase 6 will
      // replace this with the real ledger; for now show an estimate.
      const pendingPayoutBalance = last30Sales * (1 - (vendor?.commission_rate ?? 8) / 100);

      setStats({
        approvedProducts,
        pendingProducts,
        pendingFulfilments,
        shippedFulfilments,
        pendingPayoutBalance,
        last30Sales,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading dashboard…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Welcome, {vendor?.business_name}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your products, fulfil orders, and track your earnings.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={Package}
          label="Active products"
          value={stats.approvedProducts.toString()}
          hint={stats.pendingProducts > 0 ? `${stats.pendingProducts} pending review` : 'All approved'}
        />
        <StatCard
          icon={ShoppingBag}
          label="Awaiting shipment"
          value={stats.pendingFulfilments.toString()}
          hint={stats.shippedFulfilments > 0 ? `${stats.shippedFulfilments} shipped lifetime` : 'No pending'}
          highlight={stats.pendingFulfilments > 0}
        />
        <StatCard
          icon={TrendingUp}
          label="Sales (30 days)"
          value={formatRM(stats.last30Sales)}
        />
        <StatCard
          icon={Wallet}
          label="Pending payout"
          value={formatRM(stats.pendingPayoutBalance)}
          hint={`Net of ${vendor?.commission_rate ?? 8}% platform fee`}
        />
      </div>

      {/* Pending product warning */}
      {stats.pendingProducts > 0 && (
        <Card className="border-amber-200 bg-amber-50/60">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-amber-900 mb-1">
                  {stats.pendingProducts} product{stats.pendingProducts === 1 ? '' : 's'} awaiting admin review
                </h3>
                <p className="text-sm text-amber-700">
                  AutoLab admins typically review new listings within 1–2 business days. You'll be notified once approved.
                </p>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link to="/vendor/products">View products</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <QuickAction
          to="/vendor/products"
          icon={Package}
          title="Manage your catalog"
          description="Add new products, edit listings, and check approval status."
        />
        <QuickAction
          to="/vendor/orders"
          icon={ShoppingBag}
          title="Fulfil orders"
          description="Mark as shipped, add tracking numbers, manage your pipeline."
        />
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  highlight,
}: {
  icon: any;
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? 'border-amber-200 bg-amber-50/40' : ''}>
      <CardHeader className="pb-2">
        <CardDescription className="text-xs flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </CardDescription>
        <CardTitle className="text-xl sm:text-2xl">{value}</CardTitle>
      </CardHeader>
      {hint && (
        <CardContent className="pt-0">
          <p className="text-xs text-gray-500">{hint}</p>
        </CardContent>
      )}
    </Card>
  );
}

function QuickAction({
  to,
  icon: Icon,
  title,
  description,
}: {
  to: string;
  icon: any;
  title: string;
  description: string;
}) {
  return (
    <Link to={to} className="block group">
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="pt-6 flex items-start gap-3">
          <div className="w-10 h-10 rounded-md bg-lime-50 flex items-center justify-center flex-shrink-0">
            <Icon className="h-5 w-5 text-lime-700" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-gray-900 group-hover:text-lime-700 flex items-center gap-1">
              {title}
              <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{description}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
