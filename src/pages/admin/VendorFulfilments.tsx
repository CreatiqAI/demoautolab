import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Truck, CheckCircle2, Clock, PlayCircle, XCircle, Package, Search, Loader2,
  AlertTriangle, ExternalLink, RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type FulfilmentStatus = 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

interface FulfilmentRow {
  id: string;
  order_id: string;
  vendor_id: string;
  status: FulfilmentStatus;
  tracking_number: string | null;
  tracking_provider: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  created_at: string;
  vendors: { id: string; business_name: string } | null;
  orders: {
    id: string;
    order_no: string | null;
    customer_name: string | null;
    customer_phone: string | null;
    created_at: string;
  } | null;
  // hydrated client-side from order_items
  item_count?: number;
  subtotal?: number;
}

// Display labels mirror admin's order pipeline so customers/vendors/admins
// all see the same terminology. DB enum stays as-is — only labels rename:
//   PENDING (DB)    → "Processing"  (just received, vendor action needed)
//   PROCESSING (DB) → "Packing"     (vendor actively preparing)
const STATUS_META: Record<FulfilmentStatus, { label: string; classes: string; Icon: typeof Clock }> = {
  PENDING: { label: 'Processing', classes: 'bg-amber-100 text-amber-800 border-amber-200', Icon: Clock },
  PROCESSING: { label: 'Packing', classes: 'bg-blue-100 text-blue-800 border-blue-200', Icon: PlayCircle },
  SHIPPED: { label: 'Shipped', classes: 'bg-lime-100 text-lime-800 border-lime-200', Icon: Truck },
  DELIVERED: { label: 'Delivered', classes: 'bg-green-100 text-green-800 border-green-200', Icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelled', classes: 'bg-gray-100 text-gray-700 border-gray-200', Icon: XCircle },
};

const formatRM = (n: number) =>
  new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(n ?? 0);

const formatRelative = (s: string | null | undefined): string => {
  if (!s) return '—';
  const d = new Date(s).getTime();
  const diff = Math.max(0, Date.now() - d);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(s).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
};

// Time elapsed since created_at, used as the SLA timer for un-shipped fulfilments.
const hoursSince = (s: string | null | undefined): number => {
  if (!s) return 0;
  return (Date.now() - new Date(s).getTime()) / (1000 * 60 * 60);
};

const formatHoursLag = (hrs: number): string => {
  if (hrs < 1) return `${Math.round(hrs * 60)}m`;
  if (hrs < 24) return `${hrs.toFixed(1)}h`;
  return `${Math.floor(hrs / 24)}d ${Math.round(hrs % 24)}h`;
};

function StatusBadge({ status }: { status: FulfilmentStatus }) {
  const meta = STATUS_META[status];
  const Icon = meta.Icon;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium', meta.classes)}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

export default function VendorFulfilments() {
  const { toast } = useToast();
  const [rows, setRows] = useState<FulfilmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | FulfilmentStatus>('ALL');
  const [vendorFilter, setVendorFilter] = useState<string>('all');
  const [stuckThreshold, setStuckThreshold] = useState<'off' | '24' | '72' | '168'>('off');
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Live tick to keep relative times honest
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vendor_fulfilments' as any)
        .select(`
          *,
          vendors:vendor_id (id, business_name),
          orders:order_id (id, order_no, customer_name, customer_phone, created_at)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;

      let list = ((data as any[] | null) ?? []) as FulfilmentRow[];

      // Hydrate item count + subtotal per fulfilment by querying order_items in
      // a single batch. Each fulfilment's slice = items in the same order with
      // matching vendor_id.
      const orderIds = Array.from(new Set(list.map((r) => r.order_id))).filter(Boolean);
      if (orderIds.length > 0) {
        const { data: items } = await supabase
          .from('order_items' as any)
          .select('order_id, vendor_id, quantity, total_price')
          .in('order_id', orderIds);
        const byKey = new Map<string, { count: number; subtotal: number }>();
        for (const it of ((items as any[] | null) ?? [])) {
          if (!it.vendor_id) continue;
          const key = `${it.order_id}|${it.vendor_id}`;
          const cur = byKey.get(key) ?? { count: 0, subtotal: 0 };
          cur.count += Number(it.quantity ?? 0);
          cur.subtotal += Number(it.total_price ?? 0);
          byKey.set(key, cur);
        }
        list = list.map((r) => {
          const slice = byKey.get(`${r.order_id}|${r.vendor_id}`);
          return slice ? { ...r, item_count: slice.count, subtotal: slice.subtotal } : r;
        });
      }

      setRows(list);
      setLastRefreshed(new Date());
    } catch (err: any) {
      toast({ title: 'Failed to load fulfilments', description: err?.message ?? '', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Stats
  const stats = useMemo(() => {
    const byStatus: Record<FulfilmentStatus, number> = {
      PENDING: 0, PROCESSING: 0, SHIPPED: 0, DELIVERED: 0, CANCELLED: 0,
    };
    let stuck = 0;
    for (const r of rows) {
      byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
      if (r.status === 'PENDING' && hoursSince(r.created_at) > 72) stuck += 1;
    }
    return { ...byStatus, stuck, total: rows.length };
  }, [rows]);

  // Vendor list (only vendors that have fulfilments)
  const vendorOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) {
      if (r.vendor_id && r.vendors) map.set(r.vendor_id, r.vendors.business_name);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  // Filtered list
  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (vendorFilter !== 'all' && r.vendor_id !== vendorFilter) return false;
      if (stuckThreshold !== 'off') {
        const hrs = Number(stuckThreshold);
        if (!(r.status === 'PENDING' || r.status === 'PROCESSING')) return false;
        if (hoursSince(r.created_at) < hrs) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesOrder = r.orders?.order_no?.toLowerCase().includes(q) || r.order_id.toLowerCase().includes(q);
        const matchesCustomer = r.orders?.customer_name?.toLowerCase().includes(q) || r.orders?.customer_phone?.toLowerCase().includes(q);
        const matchesVendor = r.vendors?.business_name?.toLowerCase().includes(q);
        const matchesTracking = r.tracking_number?.toLowerCase().includes(q);
        if (!matchesOrder && !matchesCustomer && !matchesVendor && !matchesTracking) return false;
      }
      return true;
    });
  }, [rows, statusFilter, vendorFilter, stuckThreshold, search]);

  const isStuck = (r: FulfilmentRow): boolean =>
    (r.status === 'PENDING' || r.status === 'PROCESSING') && hoursSince(r.created_at) > 72;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Truck className="h-6 w-6" />
            Vendor Fulfilments
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Cross-vendor monitor of every shipment vendors are responsible for. Use the Stuck filter to surface SLA breaches.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Updated {formatRelative(lastRefreshed.toISOString())}</span>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Processing" value={stats.PENDING} Icon={Clock} highlight={stats.stuck > 0 ? 'amber' : undefined} />
        <StatCard label="Packing" value={stats.PROCESSING} Icon={PlayCircle} />
        <StatCard label="Shipped" value={stats.SHIPPED} Icon={Truck} />
        <StatCard label="Delivered" value={stats.DELIVERED} Icon={CheckCircle2} />
        <StatCard label="Stuck >72h" value={stats.stuck} Icon={AlertTriangle} highlight={stats.stuck > 0 ? 'red' : undefined} />
      </div>

      {/* Filters + Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All fulfilments</CardTitle>
          <CardDescription>
            One row per vendor's shipment. SLA = time since the fulfilment was created until shipped (or now if still pending).
          </CardDescription>
          <div className="flex flex-col sm:flex-row gap-2 mt-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search order #, customer, vendor, tracking…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-full sm:w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="PENDING">Processing</SelectItem>
                <SelectItem value="PROCESSING">Packing</SelectItem>
                <SelectItem value="SHIPPED">Shipped</SelectItem>
                <SelectItem value="DELIVERED">Delivered</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={vendorFilter} onValueChange={setVendorFilter}>
              <SelectTrigger className="w-full sm:w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All vendors</SelectItem>
                {vendorOptions.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={stuckThreshold} onValueChange={(v) => setStuckThreshold(v as any)}>
              <SelectTrigger className="w-full sm:w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="off">Any age</SelectItem>
                <SelectItem value="24">Stuck &gt;24h</SelectItem>
                <SelectItem value="72">Stuck &gt;72h</SelectItem>
                <SelectItem value="168">Stuck &gt;7d</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {loading ? (
            <div className="py-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="py-14 text-center px-6">
              <Package className="h-10 w-10 mx-auto text-gray-400 mb-2" />
              <p className="font-medium text-gray-900">No fulfilments match these filters</p>
              <p className="text-xs text-muted-foreground mt-1">
                {rows.length === 0 ? 'When customers buy vendor items, fulfilment rows will appear here.' : 'Loosen the filters to see more.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead className="text-right">Slice total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>SLA</TableHead>
                    <TableHead>Tracking</TableHead>
                    <TableHead className="text-right">Open</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => {
                    const stuck = isStuck(r);
                    const lagHrs = r.shipped_at
                      ? (new Date(r.shipped_at).getTime() - new Date(r.created_at).getTime()) / (1000 * 60 * 60)
                      : hoursSince(r.created_at);
                    return (
                      <TableRow key={r.id} className={stuck ? 'bg-amber-50/40' : undefined}>
                        <TableCell className="whitespace-nowrap">
                          <div className="font-mono text-xs">{r.orders?.order_no ?? r.order_id.slice(0, 8)}</div>
                          <div className="text-[10px] text-muted-foreground">{formatRelative(r.created_at)}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-lime-50 text-lime-800 border-lime-300 max-w-[160px] truncate">
                            {r.vendors?.business_name ?? '—'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="truncate max-w-[180px]">{r.orders?.customer_name ?? '—'}</div>
                          <div className="text-xs text-muted-foreground">{r.orders?.customer_phone ?? ''}</div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">{r.item_count ?? '—'}</TableCell>
                        <TableCell className="text-right tabular-nums text-sm">{r.subtotal != null ? formatRM(r.subtotal) : '—'}</TableCell>
                        <TableCell><StatusBadge status={r.status} /></TableCell>
                        <TableCell className="whitespace-nowrap">
                          {r.shipped_at ? (
                            <span className="text-xs text-muted-foreground" title="Time from created → shipped">
                              {formatHoursLag(lagHrs)}
                            </span>
                          ) : r.status === 'CANCELLED' ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            <span className={cn('text-xs', stuck ? 'text-red-700 font-medium' : 'text-muted-foreground')} title="Time elapsed since fulfilment was created">
                              {formatHoursLag(lagHrs)}
                              {stuck && <AlertTriangle className="inline h-3 w-3 ml-1" />}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {r.tracking_number ? (
                            <div className="text-xs">
                              <div className="font-mono">{r.tracking_number}</div>
                              {r.tracking_provider && <div className="text-[10px] text-muted-foreground">{r.tracking_provider}</div>}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild size="sm" variant="ghost" className="h-8 w-8 p-0" title="Open in Orders">
                            <Link to={`/admin/orders?expand=${r.order_id}`}>
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label, value, Icon, highlight,
}: { label: string; value: number; Icon: typeof Clock; highlight?: 'amber' | 'red' }) {
  return (
    <Card className={cn(highlight === 'red' && 'border-red-200', highlight === 'amber' && 'border-amber-200')}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <Icon className={cn(
          'h-4 w-4',
          highlight === 'red' ? 'text-red-600' : highlight === 'amber' ? 'text-amber-600' : 'text-muted-foreground'
        )} />
      </CardHeader>
      <CardContent>
        <div className={cn(
          'text-2xl font-bold tabular-nums',
          highlight === 'red' && 'text-red-700',
          highlight === 'amber' && 'text-amber-700'
        )}>{value}</div>
      </CardContent>
    </Card>
  );
}
