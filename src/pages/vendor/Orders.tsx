import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useCurrentVendor } from '@/lib/vendorAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  Loader2,
  Search,
  MapPin,
  Phone,
  User,
  XCircle,
  ChevronRight,
  Inbox,
  RefreshCw,
  Printer,
  X,
  FileDown,
  FileText,
  Receipt,
  AlertTriangle,
  Send,
} from 'lucide-react';
import SellerInvoice from '@/components/invoice/SellerInvoice';
import type { InvoiceSlice } from '@/lib/orderInvoices';

declare global {
  interface Window {
    html2pdf: any;
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FulfilmentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

interface OrderRef {
  id: string;
  order_no: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email?: string | null;
  delivery_address: any;
  delivery_method?: string | null;
  status: string | null;
  payment_state: string | null;
  created_at: string;
}

interface Fulfilment {
  id: string;
  order_id: string;
  vendor_id: string;
  status: FulfilmentStatus;
  tracking_number: string | null;
  tracking_provider: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  shipping_fee: number | null;
  notes: string | null;
  created_at: string;
  orders: OrderRef | null;
}

interface OrderItem {
  id: string;
  order_id: string;
  vendor_id: string | null;
  component_sku: string | null;
  component_name: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COURIERS = [
  'J&T Express',
  'Pos Laju',
  'City-Link',
  'GDex',
  'Lalamove',
  'DHL',
  'Other',
];

const STUCK_THRESHOLD_HOURS = 72;

/**
 * Display labels for the vendor view.
 *
 * IMPORTANT: the underlying `vendor_fulfilments.status` enum is unchanged.
 * We only relabel for the vendor-facing UI:
 *   - PENDING enum → shown as "Processing" (action needed, vendor just received)
 *   - PROCESSING enum → shown as "Packing" (actively preparing)
 */
const STATUS_META: Record<
  FulfilmentStatus,
  { label: string; classes: string; icon: typeof Clock }
> = {
  PENDING: {
    label: 'Processing',
    classes: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: Clock,
  },
  PROCESSING: {
    label: 'Packing',
    classes: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: Package,
  },
  SHIPPED: {
    label: 'Shipped',
    classes: 'bg-lime-50 text-lime-700 border-lime-200',
    icon: Truck,
  },
  DELIVERED: {
    label: 'Delivered',
    classes: 'bg-green-50 text-green-700 border-green-200',
    icon: CheckCircle2,
  },
  CANCELLED: {
    label: 'Cancelled',
    classes: 'bg-gray-100 text-gray-700 border-gray-200',
    icon: XCircle,
  },
};

const STATUS_FILTER_OPTIONS: { value: FulfilmentStatus | 'all' | 'stuck'; label: string }[] = [
  { value: 'all', label: 'All Orders' },
  { value: 'stuck', label: 'Stuck Shipments' },
  { value: 'PENDING', label: STATUS_META.PENDING.label }, // "Processing"
  { value: 'PROCESSING', label: STATUS_META.PROCESSING.label }, // "Packing"
  { value: 'SHIPPED', label: STATUS_META.SHIPPED.label },
  { value: 'DELIVERED', label: STATUS_META.DELIVERED.label },
  { value: 'CANCELLED', label: STATUS_META.CANCELLED.label },
];

const formatRM = (n: number) =>
  new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(n);

const formatDateTime = (s: string) =>
  new Date(s).toLocaleString('en-MY', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const formatDate = (s: string) =>
  new Date(s).toLocaleDateString('en-MY', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

const formatRelative = (s: string | null | undefined): string => {
  if (!s) return '';
  const d = new Date(s).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - d);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return formatDate(s);
};

const formatAddress = (addr: any): string => {
  if (!addr) return '';
  if (typeof addr === 'string') return addr;
  const parts = [addr.address, addr.city, addr.postcode, addr.state].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : '';
};

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: FulfilmentStatus }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        meta.classes,
      )}
    >
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function VendorOrders() {
  const { vendor } = useCurrentVendor();
  const { toast } = useToast();

  const [fulfilments, setFulfilments] = useState<Fulfilment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<FulfilmentStatus | 'all' | 'stuck'>('all');
  const [search, setSearch] = useState('');

  // Drawer state
  const [activeFulfilment, setActiveFulfilment] = useState<Fulfilment | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  // Ship form state (lives inside the drawer)
  const [shipFormOpen, setShipFormOpen] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingProvider, setTrackingProvider] = useState<string>(COURIERS[0]);
  const [shipNotes, setShipNotes] = useState('');
  const [shipSubmitting, setShipSubmitting] = useState(false);

  // For inline (non-drawer) status updates
  const [busyId, setBusyId] = useState<string | null>(null);

  // Invoice preview modal (opened from the drawer)
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  // Last refresh timestamp for the header
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Tick once a minute so the "x ago" label refreshes.
  const [, setNowTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setNowTick((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  // Load html2pdf for the "Download PDF" action on the vendor invoice modal.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ((window as any).html2pdf) return;
    const existing = document.querySelector('script[data-html2pdf]');
    if (existing) return;
    const script = document.createElement('script');
    script.src =
      'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.async = true;
    script.setAttribute('data-html2pdf', 'true');
    document.head.appendChild(script);
  }, []);

  // -------------------------------------------------------------------------
  // Fetching
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!vendor?.id) return;
    void loadFulfilments(vendor.id);
  }, [vendor?.id]);

  const loadFulfilments = async (vendorId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vendor_fulfilments' as any)
        .select(
          `
          *,
          orders:order_id (
            id,
            order_no,
            customer_name,
            customer_phone,
            customer_email,
            delivery_address,
            delivery_method,
            status,
            payment_state,
            created_at
          )
        `,
        )
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFulfilments(((data as unknown) as Fulfilment[]) ?? []);
      setLastRefreshed(new Date());
    } catch (err: any) {
      toast({
        title: 'Failed to load orders',
        description: err?.message ?? 'Unknown error',
        variant: 'destructive',
      });
      setFulfilments([]);
    } finally {
      setLoading(false);
    }
  };

  const loadItems = async (orderId: string, vendorId: string) => {
    setItemsLoading(true);
    try {
      const { data, error } = await supabase
        .from('order_items' as any)
        .select('*')
        .eq('order_id', orderId)
        .eq('vendor_id', vendorId);
      if (error) throw error;
      setItems(((data as unknown) as OrderItem[]) ?? []);
    } catch (err: any) {
      toast({
        title: 'Failed to load items',
        description: err?.message ?? 'Unknown error',
        variant: 'destructive',
      });
      setItems([]);
    } finally {
      setItemsLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // Drawer
  // -------------------------------------------------------------------------

  const openDrawer = (f: Fulfilment) => {
    if (!vendor?.id) return;
    setActiveFulfilment(f);
    setDrawerOpen(true);
    setShipFormOpen(false);
    setTrackingNumber(f.tracking_number ?? '');
    setTrackingProvider(f.tracking_provider ?? COURIERS[0]);
    setShipNotes(f.notes ?? '');
    setItems([]);
    void loadItems(f.order_id, vendor.id);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    // keep active fulfilment briefly so the slide-out animation has data
    setTimeout(() => setActiveFulfilment(null), 200);
  };

  // Open the invoice modal directly from the row without going through the
  // drawer. Loads items first so the slice computation has data.
  const openInvoiceForRow = (f: Fulfilment) => {
    if (!vendor?.id) return;
    setActiveFulfilment(f);
    setItems([]);
    void loadItems(f.order_id, vendor.id);
    setInvoiceOpen(true);
  };

  // -------------------------------------------------------------------------
  // Status mutations (always scoped by vendor_id)
  // -------------------------------------------------------------------------

  const updateStatus = async (
    fulfilment: Fulfilment,
    newStatus: FulfilmentStatus,
    extra: Record<string, any> = {},
  ) => {
    if (!vendor?.id) return false;
    setBusyId(fulfilment.id);
    try {
      const { error } = await supabase
        .from('vendor_fulfilments' as any)
        .update({ status: newStatus, ...extra } as any)
        .eq('id', fulfilment.id)
        .eq('vendor_id', vendor.id); // belt-and-suspenders scoping
      if (error) throw error;

      // Optimistic local merge
      setFulfilments((prev) =>
        prev.map((f) =>
          f.id === fulfilment.id
            ? { ...f, status: newStatus, ...(extra as any) }
            : f,
        ),
      );
      if (activeFulfilment?.id === fulfilment.id) {
        setActiveFulfilment({ ...fulfilment, status: newStatus, ...(extra as any) });
      }
      return true;
    } catch (err: any) {
      toast({
        title: 'Update failed',
        description: err?.message ?? 'Unknown error',
        variant: 'destructive',
      });
      return false;
    } finally {
      setBusyId(null);
    }
  };

  // PENDING ("Processing" label) → PROCESSING ("Packing" label)
  const handleMarkPacking = async (f: Fulfilment) => {
    const ok = await updateStatus(f, 'PROCESSING');
    if (ok) toast({ title: 'Marked as packing', variant: 'success' });
  };

  const handleMarkDelivered = async (f: Fulfilment) => {
    const ok = await updateStatus(f, 'DELIVERED', {
      delivered_at: new Date().toISOString(),
    });
    if (ok) toast({ title: 'Marked as delivered', variant: 'success' });
  };

  const handleCancel = async (f: Fulfilment) => {
    if (!confirm(`Cancel this fulfilment for order #${shortOrderNo(f)}?`)) return;
    const ok = await updateStatus(f, 'CANCELLED');
    if (ok) toast({ title: 'Fulfilment cancelled', variant: 'success' });
  };

  const handleSubmitShipped = async () => {
    if (!activeFulfilment) return;
    if (!trackingNumber.trim()) {
      toast({
        title: 'Tracking number required',
        description: 'Enter a tracking number before marking as shipped.',
        variant: 'destructive',
      });
      return;
    }
    setShipSubmitting(true);
    const ok = await updateStatus(activeFulfilment, 'SHIPPED', {
      tracking_number: trackingNumber.trim(),
      tracking_provider: trackingProvider,
      shipped_at: new Date().toISOString(),
      ...(shipNotes.trim() ? { notes: shipNotes.trim() } : {}),
    });
    setShipSubmitting(false);
    if (ok) {
      toast({ title: 'Marked as shipped', variant: 'success' });
      setShipFormOpen(false);
    }
  };

  // -------------------------------------------------------------------------
  // Derived
  // -------------------------------------------------------------------------

  const isStuck = (f: Fulfilment): boolean => {
    if (f.status !== 'PENDING') return false;
    const ageHours = (Date.now() - new Date(f.created_at).getTime()) / 3600000;
    return ageHours > STUCK_THRESHOLD_HOURS;
  };

  const stuckCount = useMemo(
    () => fulfilments.filter(isStuck).length,
    [fulfilments],
  );

  const countByStatus = useMemo(() => {
    const c: Record<FulfilmentStatus, number> = {
      PENDING: 0, PROCESSING: 0, SHIPPED: 0, DELIVERED: 0, CANCELLED: 0,
    };
    for (const f of fulfilments) c[f.status] = (c[f.status] ?? 0) + 1;
    return c;
  }, [fulfilments]);

  const filtered = useMemo(() => {
    let rows = fulfilments;
    if (statusFilter === 'stuck') {
      rows = rows.filter(isStuck);
    } else if (statusFilter !== 'all') {
      rows = rows.filter((f) => f.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((f) => {
        const orderId = f.order_id?.toLowerCase() ?? '';
        const orderNo = f.orders?.order_no?.toLowerCase() ?? '';
        const name = f.orders?.customer_name?.toLowerCase() ?? '';
        const phone = f.orders?.customer_phone?.toLowerCase() ?? '';
        return (
          orderId.includes(q) ||
          orderId.slice(0, 8).includes(q) ||
          orderNo.includes(q) ||
          name.includes(q) ||
          phone.includes(q)
        );
      });
    }
    return rows;
  }, [fulfilments, statusFilter, search]);

  const itemsTotal = useMemo(
    () => items.reduce((sum, i) => sum + (Number(i.total_price) || 0), 0),
    [items],
  );

  /**
   * The invoice slice for the active fulfilment — vendor-only items, vendor's
   * shipping fee, no platform tax, no voucher. Built directly from the data
   * the page already loaded for the drawer.
   */
  const activeInvoiceSlice = useMemo<InvoiceSlice | null>(() => {
    if (!activeFulfilment || !vendor) return null;
    const sliceItems = items.map((it) => ({
      id: it.id,
      component_sku: it.component_sku ?? '',
      component_name: it.component_name ?? '',
      quantity: Number(it.quantity) || 0,
      unit_price: Number(it.unit_price) || 0,
      total_price: Number(it.total_price) || 0,
      vendor_id: it.vendor_id ?? null,
    }));
    const itemsSubtotal = sliceItems.reduce((s, i) => s + i.total_price, 0);
    const shippingFee = Number(activeFulfilment.shipping_fee ?? 0) || 0;
    return {
      sellerKey: vendor.id,
      sellerName: vendor.business_name,
      isVendor: true,
      items: sliceItems,
      itemsSubtotal: Math.round((itemsSubtotal + Number.EPSILON) * 100) / 100,
      shippingFee: Math.round((shippingFee + Number.EPSILON) * 100) / 100,
      tax: 0,
      voucherDiscount: 0,
      total: Math.round((itemsSubtotal + shippingFee + Number.EPSILON) * 100) / 100,
      fulfilment: activeFulfilment as any,
    };
  }, [activeFulfilment, items, vendor]);

  /** Synthetic order shape passed to <SellerInvoice /> for the vendor's slice. */
  const activeInvoiceOrder = useMemo(() => {
    if (!activeFulfilment) return null;
    const o = activeFulfilment.orders;
    const orderNo =
      o?.order_no ?? `ORD-${activeFulfilment.order_id.slice(0, 8).toUpperCase()}`;
    return {
      order_no: orderNo,
      customer_name: o?.customer_name ?? 'Customer',
      customer_phone: o?.customer_phone ?? null,
      delivery_address: o?.delivery_address ?? null,
      payment_state: o?.payment_state ?? null,
      created_at: o?.created_at ?? activeFulfilment.created_at,
      total: activeInvoiceSlice?.total ?? 0,
      order_items: activeInvoiceSlice?.items ?? [],
    };
  }, [activeFulfilment, activeInvoiceSlice]);

  const printVendorInvoice = () => {
    window.print();
  };

  const downloadVendorInvoicePDF = () => {
    if (!activeInvoiceOrder) return;
    const el = document.getElementById('vendorInvoiceBody');
    const sellerSlug = (vendor?.business_name ?? 'vendor')
      .replace(/\s+/g, '-')
      .toLowerCase();
    const opt = {
      margin: 0.1,
      filename: `invoice-${activeInvoiceOrder.order_no}-${sellerSlug}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
    };
    if (window.html2pdf) {
      window.html2pdf().from(el).set(opt).save();
    } else {
      toast({
        title: 'Error',
        description: 'PDF library not loaded. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (!vendor && !loading) {
    return (
      <div className="text-sm text-muted-foreground py-12 text-center">
        Vendor profile not found.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header — admin-style: title + description on left, refresh + "updated x ago" on right */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-3xl font-bold tracking-tight">Orders</h2>
          <p className="text-muted-foreground mt-1.5">
            Manage shipments to your buyers. Mark items as packing, attach tracking, and
            confirm delivery from here.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Updated {formatRelative(lastRefreshed.toISOString())}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => vendor?.id && void loadFulfilments(vendor.id)}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin sm:mr-1.5" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 sm:mr-1.5" />
            )}
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Status overview — passive stat cards mirroring /admin/warehouse-operations */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {(['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED'] as FulfilmentStatus[]).map((s) => {
          const meta = STATUS_META[s];
          const Icon = meta.icon;
          const isActive = statusFilter === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={cn(
                'text-left rounded-lg border bg-card transition-colors',
                isActive ? 'border-primary ring-2 ring-primary/20' : 'hover:bg-muted/40',
              )}
            >
              <div className="p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <div className={cn('p-2 rounded-lg', meta.classes)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{meta.label}</p>
                    <p className="text-2xl font-bold tabular-nums">{countByStatus[s] ?? 0}</p>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Quick filter tabs — desktop. Mirrors warehouse operations. */}
      <div className="hidden lg:block">
        <div className="grid w-full grid-cols-7 rounded-md bg-muted p-1 text-muted-foreground">
          {STATUS_FILTER_OPTIONS.map((o) => {
            const isActive = statusFilter === o.value;
            const count = o.value === 'all'
              ? fulfilments.length
              : o.value === 'stuck'
                ? stuckCount
                : countByStatus[o.value as FulfilmentStatus] ?? 0;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => setStatusFilter(o.value)}
                className={cn(
                  'text-xs rounded-sm px-2 py-1.5 font-medium transition-colors whitespace-nowrap',
                  isActive ? 'bg-background text-foreground shadow-sm' : 'hover:text-foreground',
                  o.value === 'stuck' && stuckCount > 0 && !isActive && 'text-amber-700',
                )}
              >
                {o.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters + list inside one card to mirror admin layout */}
      <Card>
        <CardContent className="pt-4 pb-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3">
            <div className="relative flex-1 max-w-sm w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by order ID, customer name, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex items-center gap-3">
              {/* Mobile fallback for the desktop quick-filter tabs */}
              <Select
                value={statusFilter}
                onValueChange={(v) =>
                  setStatusFilter(v as FulfilmentStatus | 'all' | 'stuck')
                }
              >
                <SelectTrigger className="w-48 lg:hidden">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_FILTER_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                      {o.value === 'stuck' && stuckCount > 0 ? ` (${stuckCount})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-gray-500">
                {filtered.length} {filtered.length === 1 ? 'order' : 'orders'}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading orders…
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12">
              <EmptyState
                hasAny={fulfilments.length > 0}
                isFiltered={statusFilter !== 'all' || search.trim() !== ''}
              />
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden mb-4">
              <div className="flex items-center gap-4 px-4 py-2 bg-gray-100 border-b text-xs font-medium text-gray-500">
                <div className="flex-1">Order</div>
                <div className="w-40 text-right">Actions</div>
              </div>
              {filtered.map((f) => (
                <FulfilmentRow
                  key={f.id}
                  fulfilment={f}
                  stuck={isStuck(f)}
                  busy={busyId === f.id}
                  onOpen={() => openDrawer(f)}
                  onMarkPacking={() => handleMarkPacking(f)}
                  onMarkDelivered={() => handleMarkDelivered(f)}
                  onPrintInvoice={() => openInvoiceForRow(f)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Drill-down drawer (right-side Sheet, admin-style) */}
      <Sheet
        open={drawerOpen}
        onOpenChange={(open) => {
          if (!open) closeDrawer();
          else setDrawerOpen(true);
        }}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl overflow-y-auto p-0"
        >
          {activeFulfilment && (
            <div className="flex flex-col h-full">
              {/* Drawer header */}
              <div className="px-6 pt-6 pb-4 border-b sticky top-0 bg-background z-10">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                    Order #{shortOrderNo(activeFulfilment)}
                  </SheetTitle>
                  <SheetDescription>
                    Created {formatDateTime(activeFulfilment.created_at)} ·{' '}
                    {formatRelative(activeFulfilment.created_at)}
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <StatusBadge status={activeFulfilment.status} />
                  {isStuck(activeFulfilment) && (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-amber-100 text-amber-800 border border-amber-200">
                      <AlertTriangle className="h-3 w-3" />
                      Stuck &gt; {STUCK_THRESHOLD_HOURS}h
                    </span>
                  )}
                </div>
              </div>

              {/* Drawer body */}
              <div className="flex-1 px-6 py-5 space-y-6">
                {/* Customer */}
                <section className="space-y-2.5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <User className="h-3.5 w-3.5" />
                    Customer
                  </h3>
                  <div className="rounded-md border p-3.5 space-y-1.5 text-sm">
                    <div className="font-semibold">
                      {activeFulfilment.orders?.customer_name ?? 'Customer'}
                    </div>
                    {activeFulfilment.orders?.customer_phone && (
                      <div className="text-muted-foreground flex items-center gap-1.5">
                        <Phone className="h-3 w-3" />
                        <a
                          href={`tel:${activeFulfilment.orders.customer_phone}`}
                          className="hover:text-foreground hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {activeFulfilment.orders.customer_phone}
                        </a>
                      </div>
                    )}
                  </div>
                </section>

                <Separator />

                {/* Delivery */}
                <section className="space-y-2.5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Truck className="h-3.5 w-3.5" />
                    Delivery
                  </h3>
                  <div className="rounded-md border p-3.5 space-y-1.5 text-sm">
                    {activeFulfilment.orders?.delivery_method && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Method</span>
                        <span className="capitalize">
                          {activeFulfilment.orders.delivery_method.replace(/-/g, ' ')}
                        </span>
                      </div>
                    )}
                    {activeFulfilment.shipping_fee != null && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Your shipping fee</span>
                        <span className="tabular-nums">
                          {Number(activeFulfilment.shipping_fee) === 0 ? (
                            <span className="text-green-600">Free</span>
                          ) : (
                            formatRM(Number(activeFulfilment.shipping_fee))
                          )}
                        </span>
                      </div>
                    )}
                    {formatAddress(activeFulfilment.orders?.delivery_address) && (
                      <div className="text-muted-foreground flex items-start gap-1.5 pt-1">
                        <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span>
                          {formatAddress(activeFulfilment.orders?.delivery_address)}
                        </span>
                      </div>
                    )}
                  </div>
                </section>

                <Separator />

                {/* Items */}
                <section className="space-y-2.5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Package className="h-3.5 w-3.5" />
                    Your items in this order ({items.length})
                  </h3>
                  {itemsLoading ? (
                    <div className="flex items-center text-sm text-muted-foreground py-4">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Loading items…
                    </div>
                  ) : items.length === 0 ? (
                    <div className="text-sm text-muted-foreground py-2">
                      No items found for this fulfilment.
                    </div>
                  ) : (
                    <div className="rounded-md border divide-y">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start justify-between gap-3 px-3 py-2.5 text-sm"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-medium truncate">
                              {item.component_name ?? 'Item'}
                            </div>
                            {item.component_sku && (
                              <code className="text-xs text-gray-500">
                                {item.component_sku}
                              </code>
                            )}
                          </div>
                          <div className="text-right text-sm flex-shrink-0">
                            <div className="text-gray-500 tabular-nums">
                              {item.quantity} &times;{' '}
                              {formatRM(Number(item.unit_price) || 0)}
                            </div>
                            <div className="font-medium tabular-nums">
                              {formatRM(Number(item.total_price) || 0)}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div className="flex items-center justify-between px-3 py-2 bg-muted/50 text-sm">
                        <span className="font-medium">Subtotal</span>
                        <span className="font-semibold tabular-nums">
                          {formatRM(itemsTotal)}
                        </span>
                      </div>
                    </div>
                  )}
                </section>

                {/* Tracking info if shipped */}
                {(activeFulfilment.status === 'SHIPPED' ||
                  activeFulfilment.status === 'DELIVERED') &&
                  activeFulfilment.tracking_number && (
                    <>
                      <Separator />
                      <section className="space-y-2.5">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                          <Truck className="h-3.5 w-3.5" />
                          Tracking
                        </h3>
                        <div className="rounded-md border p-3.5 space-y-1.5 text-sm">
                          <div>
                            <span className="text-muted-foreground">Courier: </span>
                            <span className="font-medium">
                              {activeFulfilment.tracking_provider ?? '—'}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Tracking #: </span>
                            <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">
                              {activeFulfilment.tracking_number}
                            </code>
                          </div>
                          {activeFulfilment.shipped_at && (
                            <div className="text-xs text-muted-foreground">
                              Shipped {formatDateTime(activeFulfilment.shipped_at)}
                            </div>
                          )}
                          {activeFulfilment.delivered_at && (
                            <div className="text-xs text-green-700 font-medium flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Delivered {formatDateTime(activeFulfilment.delivered_at)}
                            </div>
                          )}
                        </div>
                      </section>
                    </>
                  )}

                {/* Ship form */}
                {shipFormOpen &&
                  activeFulfilment.status !== 'SHIPPED' &&
                  activeFulfilment.status !== 'DELIVERED' &&
                  activeFulfilment.status !== 'CANCELLED' && (
                    <section className="space-y-3 rounded-md border p-4">
                      <div className="text-sm font-semibold flex items-center gap-1.5">
                        <Truck className="h-3.5 w-3.5" /> Mark as shipped
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="ship-courier">Courier</Label>
                        <Select
                          value={trackingProvider}
                          onValueChange={setTrackingProvider}
                        >
                          <SelectTrigger id="ship-courier">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {COURIERS.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="ship-tracking">Tracking number</Label>
                        <Input
                          id="ship-tracking"
                          placeholder="e.g. JT0123456789"
                          value={trackingNumber}
                          onChange={(e) => setTrackingNumber(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="ship-notes">Notes (optional)</Label>
                        <Textarea
                          id="ship-notes"
                          rows={2}
                          placeholder="e.g. Handed over to courier 3pm"
                          value={shipNotes}
                          onChange={(e) => setShipNotes(e.target.value)}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShipFormOpen(false)}
                          disabled={shipSubmitting}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSubmitShipped}
                          disabled={shipSubmitting}
                        >
                          {shipSubmitting ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Truck className="h-4 w-4 mr-2" />
                          )}
                          Confirm shipped
                        </Button>
                      </div>
                    </section>
                  )}
              </div>

              {/* Sticky drawer footer with actions */}
              <div className="sticky bottom-0 bg-background border-t p-4 flex flex-wrap gap-2 justify-end">
                <Button
                  size="sm"
                  onClick={() => setInvoiceOpen(true)}
                  variant="outline"
                  disabled={!activeInvoiceOrder || items.length === 0}
                  title="Print invoice for your slice of this order"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Invoice
                </Button>
                {activeFulfilment.status === 'PENDING' && (
                  <Button
                    size="sm"
                    onClick={() => handleMarkPacking(activeFulfilment)}
                    disabled={busyId === activeFulfilment.id}
                    variant="outline"
                  >
                    {busyId === activeFulfilment.id ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Package className="h-4 w-4 mr-2" />
                    )}
                    Mark Packing
                  </Button>
                )}
                {(activeFulfilment.status === 'PENDING' ||
                  activeFulfilment.status === 'PROCESSING') && (
                  <Button
                    size="sm"
                    onClick={() => setShipFormOpen(true)}
                    disabled={shipFormOpen}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Ship
                  </Button>
                )}
                {activeFulfilment.status === 'SHIPPED' && (
                  <Button
                    size="sm"
                    onClick={() => handleMarkDelivered(activeFulfilment)}
                    disabled={busyId === activeFulfilment.id}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {busyId === activeFulfilment.id ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    )}
                    Mark Delivered
                  </Button>
                )}
                {(activeFulfilment.status === 'PENDING' ||
                  activeFulfilment.status === 'PROCESSING') && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => handleCancel(activeFulfilment)}
                    disabled={busyId === activeFulfilment.id}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Vendor invoice modal — vendor's slice of the order only */}
      {invoiceOpen && activeInvoiceOrder && activeInvoiceSlice && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setInvoiceOpen(false);
          }}
        >
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto shadow-xl">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
              <h2 className="text-base font-semibold">
                Invoice Preview
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  · {activeInvoiceSlice.sellerName}
                </span>
              </h2>
              <button
                onClick={() => setInvoiceOpen(false)}
                className="text-gray-400 hover:text-gray-600"
                type="button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div id="vendor-invoice-content">
              <div id="vendorInvoiceBody" className="p-3 sm:p-5 bg-white">
                <SellerInvoice
                  order={activeInvoiceOrder as any}
                  slice={activeInvoiceSlice}
                />
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t p-3 sm:p-4 flex flex-wrap justify-center gap-2 sm:gap-3">
              <Button onClick={printVendorInvoice}>
                <Printer className="h-4 w-4 mr-2" />
                Print Invoice
              </Button>
              <Button onClick={downloadVendorInvoicePDF} variant="outline">
                <FileDown className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <Button onClick={() => setInvoiceOpen(false)} variant="outline">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Print-only CSS — hide everything except the invoice modal contents */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          body * { visibility: hidden; }
          #vendor-invoice-content, #vendor-invoice-content * { visibility: visible; }
          #vendor-invoice-content { position: absolute; left: 0; top: 0; width: 100%; height: 100%; margin: 0; padding: 0; background: white; }
          .sticky { display: none; }
        }
      `,
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers + sub-components
// ---------------------------------------------------------------------------

function shortOrderNo(f: Fulfilment): string {
  return f.orders?.order_no ?? f.order_id.slice(0, 8).toUpperCase();
}

function FulfilmentRow({
  fulfilment,
  stuck,
  busy,
  onOpen,
  onMarkPacking,
  onMarkDelivered,
  onPrintInvoice,
}: {
  fulfilment: Fulfilment;
  stuck: boolean;
  busy: boolean;
  onOpen: () => void;
  onMarkPacking: () => void;
  onMarkDelivered: () => void;
  onPrintInvoice: () => void;
}) {
  const o = fulfilment.orders;
  const orderNo = o?.order_no ?? fulfilment.order_id.slice(0, 8).toUpperCase();
  return (
    <div
      className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 transition-colors"
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-semibold text-sm">#{orderNo}</span>
          <span className="text-sm text-gray-600">
            {o?.customer_name ?? 'Customer'}
          </span>
          <StatusBadge status={fulfilment.status} />
          {stuck && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-amber-100 text-amber-800 border border-amber-200"
              title={`Pending for >${STUCK_THRESHOLD_HOURS}h since order created`}
            >
              <AlertTriangle className="h-3 w-3" />
              Stuck
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
          <span title={formatDateTime(fulfilment.created_at)}>
            {formatDate(fulfilment.created_at)}
          </span>
          {o?.customer_phone && <span>{o.customer_phone}</span>}
          {o?.delivery_method && (
            <span className="capitalize">{o.delivery_method.replace(/-/g, ' ')}</span>
          )}
          {fulfilment.shipping_fee != null && Number(fulfilment.shipping_fee) > 0 && (
            <span className="tabular-nums">
              {formatRM(Number(fulfilment.shipping_fee))} ship
            </span>
          )}
          {fulfilment.tracking_number && (
            <span className="font-mono text-blue-600">
              {fulfilment.tracking_provider
                ? `${fulfilment.tracking_provider} · `
                : ''}
              {fulfilment.tracking_number}
            </span>
          )}
        </div>
      </div>

      <div
        className="flex items-center gap-1 flex-shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {fulfilment.status === 'PENDING' && (
          <Button
            size="sm"
            variant="outline"
            onClick={onMarkPacking}
            disabled={busy}
            title="Mark as packing"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Package className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline ml-1.5">Packing</span>
          </Button>
        )}
        {(fulfilment.status === 'PENDING' ||
          fulfilment.status === 'PROCESSING') && (
          <Button
            size="sm"
            variant="outline"
            onClick={onOpen}
            title="Mark as shipped"
          >
            <Send className="h-3.5 w-3.5" />
            <span className="hidden sm:inline ml-1.5">Ship</span>
          </Button>
        )}
        {fulfilment.status === 'SHIPPED' && (
          <Button
            size="sm"
            variant="outline"
            onClick={onMarkDelivered}
            disabled={busy}
            title="Mark as delivered"
            className="text-green-700"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline ml-1.5">Delivered</span>
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={onPrintInvoice}
          title="Print invoice for your slice"
        >
          <FileText className="h-3.5 w-3.5" />
          <span className="hidden sm:inline ml-1.5">Invoice</span>
        </Button>
        <ChevronRight className="h-4 w-4 text-gray-400 ml-0.5" />
      </div>
    </div>
  );
}

function EmptyState({
  hasAny,
  isFiltered,
}: {
  hasAny: boolean;
  isFiltered: boolean;
}) {
  if (hasAny && isFiltered) {
    return (
      <div className="text-center">
        <Inbox className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm font-medium">No orders match your filters.</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Try clearing the search or status filter.
        </p>
      </div>
    );
  }
  return (
    <div className="text-center">
      <Package className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
      <p className="text-base font-semibold">No orders yet</p>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
        When a customer buys one of your listed products, the shipment will appear
        here. From this page you can mark items as packing, attach tracking
        numbers, and confirm delivery.
      </p>
    </div>
  );
}
