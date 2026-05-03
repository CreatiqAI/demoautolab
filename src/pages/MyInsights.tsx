import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, TrendingUp, ShoppingBag, Wallet, Package, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OrderRow {
  id: string;
  order_no: string;
  created_at: string;
  status: string;
  subtotal: number;
  total: number;
  customer_profile_id: string;
  order_items: Array<{
    component_sku: string;
    component_name: string;
    component_image: string | null;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
}

interface ComponentRef {
  component_sku: string;
  name: string;
  normal_price: number;
  merchant_price: number | null;
  default_image_url: string | null;
}

const formatRM = (n: number) =>
  new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(n);

export default function MyInsights() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [components, setComponents] = useState<Map<string, ComponentRef>>(new Map());
  const [period, setPeriod] = useState<string>('all'); // 'all' | 'YYYY' | 'YYYY-MM'
  const [customerType, setCustomerType] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const load = async () => {
    setLoading(true);
    try {
      // Customer profile id + type
      const { data: profile } = await supabase
        .from('customer_profiles' as any)
        .select('id, customer_type')
        .eq('user_id', user!.id)
        .maybeSingle();
      const profileId = (profile as any)?.id;
      setCustomerType((profile as any)?.customer_type ?? null);
      if (!profileId) {
        setOrders([]);
        return;
      }

      const { data: orderRows } = await supabase
        .from('orders' as any)
        .select(`
          id, order_no, created_at, status, subtotal, total, customer_profile_id,
          order_items (component_sku, component_name, component_image, quantity, unit_price, total_price)
        `)
        .eq('customer_profile_id', profileId)
        .neq('status', 'CANCELLED')
        .order('created_at', { ascending: false });
      const list = (orderRows as any[] | null) ?? [];
      setOrders(list);

      // Pull current normal/merchant prices for "you saved" calc
      const skus = Array.from(new Set(list.flatMap(o => (o.order_items || []).map((i: any) => i.component_sku))));
      if (skus.length > 0) {
        const { data: comps } = await supabase
          .from('component_library' as any)
          .select('component_sku, name, normal_price, merchant_price, default_image_url')
          .in('component_sku', skus);
        const map = new Map<string, ComponentRef>();
        for (const c of (comps as any[] | null) ?? []) {
          map.set(c.component_sku, c as ComponentRef);
        }
        setComponents(map);
      }
    } finally {
      setLoading(false);
    }
  };

  // Period filter
  const filteredOrders = orders.filter(o => {
    if (period === 'all') return true;
    if (period.length === 4) return o.created_at.slice(0, 4) === period;
    return o.created_at.slice(0, 7) === period;
  });

  // Build period options from data
  const periodOptions = (() => {
    const months = new Set<string>();
    const years = new Set<string>();
    for (const o of orders) {
      months.add(o.created_at.slice(0, 7));
      years.add(o.created_at.slice(0, 4));
    }
    return {
      years: Array.from(years).sort((a, b) => (a < b ? 1 : -1)),
      months: Array.from(months).sort((a, b) => (a < b ? 1 : -1)),
    };
  })();

  const totalOrders = filteredOrders.length;
  const totalSpent = filteredOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);

  // Savings: for each item, compare what they paid (unit_price) vs current
  // normal_price. If normal_price > unit_price, that's the per-unit savings.
  const totalSaved = filteredOrders.reduce((sum, o) => {
    for (const item of o.order_items || []) {
      const c = components.get(item.component_sku);
      const normal = Number(c?.normal_price) || 0;
      const paid = Number(item.unit_price) || 0;
      if (normal > paid) sum += (normal - paid) * (Number(item.quantity) || 0);
    }
    return sum;
  }, 0);

  // Top products by total spent
  const topProducts = (() => {
    const map = new Map<string, { sku: string; name: string; image: string | null; qty: number; spent: number }>();
    for (const o of filteredOrders) {
      for (const item of o.order_items || []) {
        const key = item.component_sku;
        const existing = map.get(key) ?? {
          sku: key,
          name: item.component_name,
          image: item.component_image ?? components.get(key)?.default_image_url ?? null,
          qty: 0,
          spent: 0,
        };
        existing.qty += Number(item.quantity) || 0;
        existing.spent += Number(item.total_price) || 0;
        map.set(key, existing);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.spent - a.spent).slice(0, 5);
  })();

  // Monthly spend (last 12 months in current view)
  const monthlySpend = (() => {
    const map = new Map<string, number>();
    for (const o of filteredOrders) {
      const ym = o.created_at.slice(0, 7);
      map.set(ym, (map.get(ym) ?? 0) + (Number(o.total) || 0));
    }
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .slice(-12);
  })();
  const maxMonthly = monthlySpend.reduce((m, [, v]) => Math.max(m, v), 0);

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 p-8 text-center text-muted-foreground">Please log in to view your insights.</main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="container mx-auto px-3 sm:px-6 lg:px-8 py-6 md:py-8 min-h-[calc(100vh-80px)] space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/my-orders')}>
            <ArrowLeft className="h-4 w-4 mr-1" />Back to orders
          </Button>
        </div>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <TrendingUp className="h-6 w-6" />My Insights
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {customerType === 'merchant'
                ? 'Your spending patterns and merchant-pricing savings.'
                : 'Your spending patterns and order trends.'}
            </p>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All time</SelectItem>
              {periodOptions.years.length > 0 && (
                <>
                  <div className="px-2 py-1 text-[10px] uppercase font-semibold text-muted-foreground">Year</div>
                  {periodOptions.years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </>
              )}
              {periodOptions.months.length > 0 && (
                <>
                  <div className="px-2 py-1 text-[10px] uppercase font-semibold text-muted-foreground">Month</div>
                  {periodOptions.months.map(m => (
                    <SelectItem key={m} value={m}>
                      {new Date(`${m}-01T00:00:00`).toLocaleDateString('en-MY', { year: 'numeric', month: 'long' })}
                    </SelectItem>
                  ))}
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />Loading insights...
          </div>
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No orders yet — once you start ordering, your spending breakdown will appear here.
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-1.5"><ShoppingBag className="h-3.5 w-3.5" />Orders</CardDescription>
                  <CardTitle className="text-3xl">{totalOrders}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-1.5"><Wallet className="h-3.5 w-3.5" />Total spent</CardDescription>
                  <CardTitle className="text-3xl">{formatRM(totalSpent)}</CardTitle>
                </CardHeader>
              </Card>
              <Card className={customerType === 'merchant' ? 'bg-green-50 border-green-200' : ''}>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    {customerType === 'merchant' ? 'You saved with merchant pricing' : 'Discount earned'}
                  </CardDescription>
                  <CardTitle className={`text-3xl ${customerType === 'merchant' ? 'text-green-700' : ''}`}>
                    {formatRM(totalSaved)}
                  </CardTitle>
                </CardHeader>
                {customerType === 'merchant' && totalSaved > 0 && (
                  <CardContent className="pt-0">
                    <p className="text-xs text-green-700">
                      That's {((totalSaved / Math.max(totalSpent + totalSaved, 1)) * 100).toFixed(1)}% off retail prices.
                    </p>
                  </CardContent>
                )}
              </Card>
            </div>

            {/* Top products */}
            {topProducts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Package className="h-5 w-5" />Top 5 products</CardTitle>
                  <CardDescription>What you order most by total spend.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {topProducts.map((p, idx) => (
                      <div key={p.sku} className="flex items-center gap-3">
                        <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center font-mono text-xs flex-shrink-0">
                          {idx + 1}
                        </Badge>
                        {p.image ? (
                          <img src={p.image} alt={p.name} className="w-12 h-12 rounded border object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <Package className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{p.name}</div>
                          <div className="text-xs text-muted-foreground">{p.sku} · {p.qty} units</div>
                        </div>
                        <div className="text-sm font-semibold flex-shrink-0">{formatRM(p.spent)}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Monthly spend bars */}
            {monthlySpend.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Monthly spend</CardTitle>
                  <CardDescription>Last {monthlySpend.length} month{monthlySpend.length === 1 ? '' : 's'} with orders.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {monthlySpend.map(([ym, val]) => (
                      <div key={ym} className="flex items-center gap-3">
                        <div className="text-xs text-muted-foreground w-20 flex-shrink-0">
                          {new Date(`${ym}-01T00:00:00`).toLocaleDateString('en-MY', { year: 'numeric', month: 'short' })}
                        </div>
                        <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
                          <div
                            className="h-full bg-primary rounded transition-all"
                            style={{ width: maxMonthly > 0 ? `${(val / maxMonthly) * 100}%` : '0%' }}
                          />
                        </div>
                        <div className="text-sm font-medium w-24 text-right flex-shrink-0">{formatRM(val)}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
