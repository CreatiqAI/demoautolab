import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Search, Trash2, Download, FileText, X, Package, Printer, CheckCircle, Truck, Send, AlertTriangle, Clock, CheckCircle2, ExternalLink, User, MapPin, Phone, Mail, ChevronRight, Receipt, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { STATUS_CONFIG, getStatusLabel, getStatusBadgeClasses } from '@/constants/orderStatuses';
import type { OrderStatus } from '@/constants/orderStatuses';
import ShipmentCreationDialog from '@/components/admin/ShipmentCreationDialog';
import SellerInvoice from '@/components/invoice/SellerInvoice';
import { splitOrderBySeller, type InvoiceSlice } from '@/lib/orderInvoices';
import { transformImage } from '@/lib/imageTransform';

declare global {
  interface Window {
    html2pdf: any;
  }
}

interface Order {
  id: string;
  order_no: string;
  user_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  delivery_method: string;
  delivery_address: any;
  delivery_fee: number;
  payment_method: string;
  payment_state: string;
  subtotal: number;
  tax: number;
  discount: number;
  shipping_fee: number;
  total: number;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  voucher_code: string | null;
  voucher_discount: number | null;
  courier_tracking_number: string | null;
  courier_provider: string | null;
  order_items: Array<{
    id: string;
    component_sku: string;
    component_name: string;
    product_context: string | null;
    quantity: number;
    unit_price: number;
    total_price: number;
    vendor_id?: string | null;
    component_image?: string | null;
  }>;
  vendor_fulfilments?: Array<{
    id: string;
    vendor_id: string;
    status: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
    tracking_number: string | null;
    tracking_provider: string | null;
    shipped_at: string | null;
    delivered_at: string | null;
    shipping_fee?: number | null;
    notes?: string | null;
    vendors?: { id: string; business_name: string } | null;
  }>;
}

type VendorFulfilment = NonNullable<Order['vendor_fulfilments']>[number];

const STUCK_THRESHOLD_HOURS = 72;

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Orders' },
  { value: 'stuck', label: 'Stuck Shipments' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'PACKING', label: 'Packing' },
  { value: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
  { value: 'READY_FOR_COLLECTION', label: 'Ready for Collection' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'PAYMENT_FAILED', label: 'Payment Failed' },
];

export default function Orders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  // Seller filter: 'all' (default), 'autolab' (in-house only), or vendor_id
  const [sellerFilter, setSellerFilter] = useState<string>('all');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState<Order | null>(null);
  // Per-seller slice currently shown in the invoice modal. `null` = combined (all sellers).
  const [invoiceSlice, setInvoiceSlice] = useState<InvoiceSlice | null>(null);
  const [isPickingListModalOpen, setIsPickingListModalOpen] = useState(false);
  const [isShipmentDialogOpen, setIsShipmentDialogOpen] = useState(false);
  const [ordersForShipment, setOrdersForShipment] = useState<Order[]>([]);
  const [confirmAdvanceDialogOpen, setConfirmAdvanceDialogOpen] = useState(false);
  const [ordersToAdvance, setOrdersToAdvance] = useState<Order[]>([]);
  const { toast } = useToast();

  useEffect(() => { fetchOrders(); }, []);

  useEffect(() => {
    const expandOrderId = searchParams.get('expand');
    if (expandOrderId) {
      setSelectedOrderId(expandOrderId);
      searchParams.delete('expand');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.async = true;
    document.head.appendChild(script);
    return () => { if (document.head.contains(script)) document.head.removeChild(script); };
  }, []);

  // Enrich order_items with images by joining against component_library by SKU.
  // Mirrors the approach used in MyOrders.tsx so the admin drawer can show
  // product thumbnails just like the customer & vendor views.
  const enrichWithImages = async (rows: any[]): Promise<any[]> => {
    try {
      const allSkus = rows.flatMap((o: any) => o.order_items || []).map((i: any) => i.component_sku).filter(Boolean);
      if (allSkus.length === 0) return rows;
      const uniqueSkus = Array.from(new Set(allSkus));
      // Fetch only the SKUs present in these orders — avoids pulling the whole
      // component_library (which exceeds Supabase's 1000-row cap and broke thumbnails).
      const { data: components, error } = await supabase
        .from('component_library')
        .select('component_sku, default_image_url')
        .in('component_sku', uniqueSkus);
      if (error || !components) return rows;
      const imageMap = new Map(
        components.map((c: any) => [c.component_sku, c.default_image_url])
      );
      return rows.map((o: any) => ({
        ...o,
        order_items: (o.order_items || []).map((item: any) => ({
          ...item,
          component_image: item.component_image || imageMap.get(item.component_sku) || null,
        })),
      }));
    } catch {
      return rows;
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders' as any)
        .select(`
          *,
          order_items (
            id, component_sku, component_name, product_context,
            quantity, unit_price, total_price, vendor_id
          ),
          vendor_fulfilments (
            id, vendor_id, status, tracking_number, tracking_provider,
            shipped_at, delivered_at, shipping_fee, notes,
            vendors:vendor_id (id, business_name)
          )
        `)
        .not('status', 'eq', 'COMPLETED')
        .order('created_at', { ascending: false });

      if (error) {
        // Fallback 1: try without vendor_fulfilments (older deployments)
        const { data: itemsOnly, error: itemsErr } = await supabase
          .from('orders' as any)
          .select(`*, order_items (id, component_sku, component_name, product_context, quantity, unit_price, total_price, vendor_id)`)
          .not('status', 'eq', 'COMPLETED')
          .order('created_at', { ascending: false });
        if (!itemsErr && itemsOnly) {
          const enriched = await enrichWithImages(itemsOnly);
          setOrders(transformOrders(enriched));
        } else {
          const { data: basic } = await supabase.from('orders' as any).select('*').not('status', 'eq', 'COMPLETED').order('created_at', { ascending: false });
          setOrders(transformOrders((basic || []).map((o: any) => ({ ...o, order_items: [] }))));
        }
      } else {
        const enriched = await enrichWithImages(data || []);
        setOrders(transformOrders(enriched));
      }
    } catch { setOrders([]); }
    finally { setLoading(false); }
  };

  const transformOrders = (data: any[]): Order[] => data.map((o: any) => ({
    id: o.id, order_no: o.order_no || `ORD-${o.id?.slice(0, 8)}`, user_id: o.user_id,
    customer_name: o.customer_name || 'Customer', customer_phone: o.customer_phone || '',
    customer_email: o.customer_email || '', delivery_method: o.delivery_method || 'Standard',
    delivery_address: o.delivery_address || {}, delivery_fee: o.delivery_fee || o.shipping_fee || 0,
    payment_method: o.payment_method || 'Online', payment_state: o.payment_state || 'UNPAID',
    subtotal: o.subtotal || 0, tax: o.tax || 0, discount: o.discount || 0, shipping_fee: o.shipping_fee || 0,
    total: o.total || 0, status: o.status || 'PROCESSING', notes: o.notes || '',
    created_at: o.created_at, updated_at: o.updated_at,
    voucher_code: o.voucher_code || null, voucher_discount: o.voucher_discount || null,
    courier_tracking_number: o.courier_tracking_number || null, courier_provider: o.courier_provider || null,
    order_items: (o.order_items || []).map((it: any) => ({ ...it, component_image: it.component_image ?? null })),
    vendor_fulfilments: o.vendor_fulfilments || []
  }));

  // --- Status helpers ---
  const updateOrderStatuses = async (orderIds: string[], newStatus: string, extra: Record<string, any> = {}) => {
    try {
      const { error } = await supabase.from('orders' as any).update({ status: newStatus, updated_at: new Date().toISOString(), ...extra }).in('id', orderIds);
      if (error) throw error;
      return true;
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      return false;
    }
  };

  // Processing → Packing (after invoice print)
  const handlePrintAndAdvance = (ordersToProcess: Order[]) => {
    if (ordersToProcess.length === 1) {
      setSelectedOrderForInvoice(ordersToProcess[0]);
      setIsInvoiceModalOpen(true);
      setOrdersToAdvance(ordersToProcess);
    } else {
      setOrdersToAdvance(ordersToProcess);
      setSelectedOrderIds(new Set(ordersToProcess.map(o => o.id)));
      setIsPickingListModalOpen(true);
    }
  };

  const handleConfirmAdvanceToPacking = async () => {
    const ids = ordersToAdvance.map(o => o.id);
    const success = await updateOrderStatuses(ids, 'PACKING', { invoice_printed_at: new Date().toISOString() });
    if (success) { toast({ title: 'Moved to Packing', description: `${ids.length} order(s) advanced.` }); fetchOrders(); }
    setConfirmAdvanceDialogOpen(false);
    setOrdersToAdvance([]);
    setSelectedOrderIds(new Set());
  };

  // Packing → Out For Delivery (shipment)
  const handleOpenShipmentDialog = (ordersToShip: Order[]) => { setOrdersForShipment(ordersToShip); setIsShipmentDialogOpen(true); };
  const handleShipmentCreated = () => { setIsShipmentDialogOpen(false); setOrdersForShipment([]); setSelectedOrderIds(new Set()); fetchOrders(); };

  // Out For Delivery → Completed
  const handleMarkCompleted = async (orderIds: string[]) => {
    if (!confirm(`Mark ${orderIds.length} order(s) as completed?`)) return;
    const success = await updateOrderStatuses(orderIds, 'COMPLETED', { completed_at: new Date().toISOString() });
    if (success) { toast({ title: 'Completed', description: `${orderIds.length} order(s) archived.` }); fetchOrders(); }
    setSelectedOrderIds(new Set());
  };

  const handleDeleteOrder = async (order: Order) => {
    if (!confirm(`Delete order #${order.order_no}?`)) return;
    try {
      setLoading(true);
      await supabase.from('voucher_usage' as any).delete().eq('order_id', order.id);
      await supabase.from('order_items' as any).delete().eq('order_id', order.id);
      const { error } = await supabase.from('orders' as any).delete().eq('id', order.id);
      if (error) throw error;
      toast({ title: 'Deleted', description: `Order #${order.order_no} deleted.` });
      fetchOrders();
    } catch (err: any) { toast({ title: 'Error', description: err.message, variant: 'destructive' }); fetchOrders(); }
    finally { setLoading(false); }
  };

  // --- Filtering ---
  const filteredOrders = orders.filter(order => {
    const ageHours = (Date.now() - new Date(order.created_at).getTime()) / 3600000;
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'stuck'
          ? (order.vendor_fulfilments ?? []).some(f => f.status === 'PENDING') && ageHours > STUCK_THRESHOLD_HOURS
          : order.status === statusFilter;

    // Seller filter — show only orders that include items from this seller.
    // 'autolab' means at least one item with vendor_id IS NULL.
    let matchesSeller = true;
    if (sellerFilter === 'autolab') {
      matchesSeller = (order.order_items ?? []).some((it: any) => !it.vendor_id);
    } else if (sellerFilter !== 'all') {
      matchesSeller = (order.order_items ?? []).some((it: any) => it.vendor_id === sellerFilter);
    }

    if (!searchTerm) return matchesStatus && matchesSeller;
    const q = searchTerm.toLowerCase();
    const matchesSearch = order.order_no.toLowerCase().includes(q) || order.customer_name.toLowerCase().includes(q) || order.customer_phone.includes(q);
    return matchesStatus && matchesSeller && matchesSearch;
  });

  // List of distinct vendors that appear on any order, for the Seller filter
  const sellerOptions = (() => {
    const map = new Map<string, string>();
    for (const o of orders) {
      for (const f of (o.vendor_fulfilments ?? [])) {
        if (f.vendor_id && f.vendors?.business_name) map.set(f.vendor_id, f.vendors.business_name);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  })();

  // --- Select ---
  const handleSelectOrder = (id: string, checked: boolean) => {
    setSelectedOrderIds(prev => { const s = new Set(prev); checked ? s.add(id) : s.delete(id); return s; });
  };
  const handleSelectAll = (checked: boolean) => {
    setSelectedOrderIds(checked ? new Set(filteredOrders.map(o => o.id)) : new Set());
  };
  const selectedOrders = filteredOrders.filter(o => selectedOrderIds.has(o.id));

  // --- Format ---
  const formatCurrency = (n: number) => new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(n);
  const formatDate = (s: string) => new Date(s).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const formatAddress = (addr: any): string => {
    if (!addr) return '';
    if (typeof addr === 'string') return addr;
    const parts = [addr.address, addr.city, addr.postcode, addr.state].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : '';
  };

  // --- Multi-vendor helpers ---
  const formatRelative = (s: string | null | undefined) => {
    if (!s) return '';
    const diff = Date.now() - new Date(s).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
  };

  // Returns the count of vendor fulfilments stuck in PENDING > 72h since order created_at
  const countStuckFulfilments = (order: Order): number => {
    const fulfilments = order.vendor_fulfilments ?? [];
    if (fulfilments.length === 0) return 0;
    const ageHours = (Date.now() - new Date(order.created_at).getTime()) / 3600000;
    if (ageHours <= STUCK_THRESHOLD_HOURS) return 0;
    return fulfilments.filter(f => f.status === 'PENDING').length;
  };

  // Display labels mirror admin's order pipeline so customers/vendors/admins
  // all see the same terminology. DB enum values stay as-is.
  const fulfilmentLabel = (status: VendorFulfilment['status']): string => {
    switch (status) {
      case 'PENDING': return 'Processing';
      case 'PROCESSING': return 'Packing';
      case 'SHIPPED': return 'Shipped';
      case 'DELIVERED': return 'Delivered';
      case 'CANCELLED': return 'Cancelled';
      default: return status;
    }
  };

  const fulfilmentBadgeClasses = (status: VendorFulfilment['status']): string => {
    switch (status) {
      case 'PENDING': return 'bg-amber-100 text-amber-800';
      case 'PROCESSING': return 'bg-blue-100 text-blue-800';
      case 'SHIPPED': return 'bg-indigo-100 text-indigo-800';
      case 'DELIVERED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-gray-200 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const fulfilmentIcon = (status: VendorFulfilment['status']) => {
    switch (status) {
      case 'PENDING': return <Clock className="h-3 w-3" />;
      case 'PROCESSING': return <Package className="h-3 w-3" />;
      case 'SHIPPED': return <Truck className="h-3 w-3" />;
      case 'DELIVERED': return <CheckCircle2 className="h-3 w-3" />;
      case 'CANCELLED': return <X className="h-3 w-3" />;
      default: return null;
    }
  };

  // Builds the seller groupings for a given order (mirrors MyOrders logic)
  const buildSellerGroups = (order: Order) => {
    const groups = new Map<string, Order['order_items']>();
    for (const item of order.order_items) {
      const key = item.vendor_id || '__autolab__';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }
    const fulfilmentByVendor = new Map(
      (order.vendor_fulfilments ?? []).map(f => [f.vendor_id, f])
    );
    const sortedKeys = Array.from(groups.keys()).sort((a, b) =>
      a === '__autolab__' ? -1 : b === '__autolab__' ? 1 : 0
    );
    return sortedKeys.map(key => {
      const items = groups.get(key)!;
      const fulfilment = key !== '__autolab__' ? fulfilmentByVendor.get(key) : null;
      const sellerName = key === '__autolab__'
        ? 'AutoLab (in-house)'
        : (fulfilment?.vendors?.business_name || 'Vendor');
      const subtotal = items.reduce((s, i) => s + (i.total_price || 0), 0);
      return { key, items, fulfilment, sellerName, subtotal };
    });
  };

  const convertToWords = (num: number): string => {
    const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
    const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
    if (num === 0) return 'ZERO';
    function conv(n: number): string {
      if (n === 0) return '';
      if (n < 20) return ones[n] || '';
      const d = n % 10, t = Math.floor(n / 10) % 10, h = Math.floor(n / 100);
      let r = ''; if (h > 0) r += (ones[h] || '') + ' HUNDRED ';
      const to = n % 100;
      if (to < 20 && to > 0) r += ones[to] || '';
      else { if (t >= 2) r += (tens[t] || ''); if (d > 0) r += (t >= 2 ? ' ' : '') + (ones[d] || ''); }
      return r.trim();
    }
    const w = Math.round(num); if (w === 0) return 'ZERO';
    const m = Math.floor(w / 1000000), th = Math.floor((w % 1000000) / 1000), rem = w % 1000;
    let r = '';
    if (m > 0) { const p = conv(m); if (p) r += p + ' MILLION '; }
    if (th > 0) { const p = conv(th); if (p) r += p + ' THOUSAND '; }
    if (rem > 0) { const p = conv(rem); if (p) r += p; }
    return r.trim() || 'ZERO';
  };

  // --- Invoice ---
  const generateInvoice = (order: Order, slice: InvoiceSlice | null = null) => {
    setSelectedOrderForInvoice(order);
    setInvoiceSlice(slice);
    setIsInvoiceModalOpen(true);
    setOrdersToAdvance([order]);
  };
  const closeInvoiceModal = () => { setIsInvoiceModalOpen(false); setSelectedOrderForInvoice(null); setInvoiceSlice(null); };
  const printInvoiceAction = () => { window.print(); };
  const downloadInvoicePDF = () => {
    if (!selectedOrderForInvoice) return;
    const el = document.getElementById('invoiceBody');
    const sellerSuffix = invoiceSlice ? `-${invoiceSlice.sellerKey === 'autolab' ? 'autolab' : (invoiceSlice.sellerName.replace(/\s+/g, '-').toLowerCase())}` : '';
    const opt = { margin: 0.1, filename: `invoice-${selectedOrderForInvoice.order_no}${sellerSuffix}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' } };
    if (window.html2pdf) window.html2pdf().from(el).set(opt).save();
    else toast({ title: 'Error', description: 'PDF library not loaded.', variant: 'destructive' });
  };

  // --- Picking List ---
  interface PickingListItem { componentName: string; sku: string; orderQuantities: Array<{ orderId: string; quantity: number }>; }
  const generatePickingListData = (): PickingListItem[] => {
    const sel = orders.filter(o => selectedOrderIds.has(o.id));
    const m = new Map<string, PickingListItem>();
    sel.forEach(o => o.order_items.forEach(item => {
      if (!m.has(item.component_sku)) m.set(item.component_sku, { componentName: item.component_name, sku: item.component_sku, orderQuantities: [] });
      m.get(item.component_sku)!.orderQuantities.push({ orderId: o.order_no, quantity: item.quantity });
    }));
    return Array.from(m.values());
  };
  const printPickingList = () => { window.print(); };
  const downloadPickingListPDF = () => {
    const el = document.getElementById('pickingListBody');
    const opt = { margin: [0.4,0.4,0.4,0.4], filename: `picking-list-${new Date().toISOString().split('T')[0]}.pdf`, image: { type: 'jpeg', quality: 0.95 }, html2canvas: { scale: 1.5, useCORS: true }, jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait', compress: true } };
    if (window.html2pdf) window.html2pdf().from(el).set(opt).save();
    else toast({ title: 'Error', description: 'PDF library not loaded.', variant: 'destructive' });
  };

  // --- Status counts ---
  const statusCounts = orders.reduce((acc, o) => { acc[o.status] = (acc[o.status] || 0) + 1; return acc; }, {} as Record<string, number>);

  // --- Bulk actions ---
  const renderBulkActions = () => {
    if (selectedOrders.length === 0) return null;
    const count = selectedOrders.length;
    const allProcessing = selectedOrders.every(o => o.status === 'PROCESSING');
    const allPacking = selectedOrders.every(o => o.status === 'PACKING');
    const allOutForDelivery = selectedOrders.every(o => o.status === 'OUT_FOR_DELIVERY' || o.status === 'READY_FOR_COLLECTION');

    return (
      <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <span className="text-sm font-medium text-blue-900">{count} selected</span>
        {allProcessing && (
          <Button size="sm" onClick={() => handlePrintAndAdvance(selectedOrders)}>
            <Printer className="h-4 w-4 mr-2" />Print & Move to Packing
          </Button>
        )}
        {allPacking && (() => {
          const deliveryOrders = selectedOrders.filter(o => o.delivery_method !== 'self-pickup');
          const pickupOrders = selectedOrders.filter(o => o.delivery_method === 'self-pickup');
          return (
            <>
              {deliveryOrders.length > 0 && (
                <Button size="sm" onClick={() => handleOpenShipmentDialog(deliveryOrders)}>
                  <Send className="h-4 w-4 mr-2" />Create Shipment ({deliveryOrders.length})
                </Button>
              )}
              {pickupOrders.length > 0 && (
                <Button size="sm" onClick={() => {
                  const ids = pickupOrders.map(o => o.id);
                  updateOrderStatuses(ids, 'READY_FOR_COLLECTION').then(ok => { if (ok) { toast({ title: 'Ready for Collection', description: `${ids.length} self-pickup order(s) ready.` }); fetchOrders(); setSelectedOrderIds(new Set()); } });
                }}>
                  <CheckCircle className="h-4 w-4 mr-2" />Ready for Collection ({pickupOrders.length})
                </Button>
              )}
            </>
          );
        })()}
        {allOutForDelivery && (
          <Button size="sm" onClick={() => handleMarkCompleted(selectedOrders.map(o => o.id))} className="bg-green-600 hover:bg-green-700 text-white">
            <CheckCircle className="h-4 w-4 mr-2" />Mark Completed
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => setSelectedOrderIds(new Set())}>Clear</Button>
      </div>
    );
  };

  // --- Row ---
  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status as OrderStatus];
    if (!config) return <Badge variant="outline">{status}</Badge>;
    return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${config.bgColor} ${config.textColor}`}>{config.label}</span>;
  };

  const renderOrderRow = (order: Order) => {
    const fulfilments = order.vendor_fulfilments ?? [];
    const sellerCount = fulfilments.length + (order.order_items.some(i => !i.vendor_id) ? 1 : 0);
    const stuckCount = countStuckFulfilments(order);
    const shippedCount = fulfilments.filter(f => f.status === 'SHIPPED' || f.status === 'DELIVERED').length;
    const pendingCount = fulfilments.filter(f => f.status === 'PENDING' || f.status === 'PROCESSING').length;
    const isMultiSeller = sellerCount > 1;
    return (
      <div
        key={order.id}
        className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 transition-colors"
        onClick={() => setSelectedOrderId(order.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedOrderId(order.id); } }}
      >
        <div onClick={e => e.stopPropagation()}>
          <Checkbox checked={selectedOrderIds.has(order.id)} onCheckedChange={c => handleSelectOrder(order.id, c as boolean)} />
        </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-semibold text-sm">#{order.order_no}</span>
              <span className="text-sm text-gray-600">{order.customer_name}</span>
              {getStatusBadge(order.status)}
              {stuckCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-amber-100 text-amber-800 border border-amber-200" title={`${stuckCount} vendor fulfilment(s) PENDING for >${STUCK_THRESHOLD_HOURS}h`}>
                  <AlertTriangle className="h-3 w-3" />
                  {stuckCount} stuck
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
              <span>{formatDate(order.created_at)}</span>
              <span className="font-medium text-gray-900">{formatCurrency(order.total)}</span>
              <span className="capitalize">{order.delivery_method}</span>
              {order.courier_tracking_number && <span className="font-mono text-blue-600">{order.courier_tracking_number}</span>}
              {isMultiSeller && (
                <span className="inline-flex items-center gap-1 text-gray-600">
                  <Package className="h-3 w-3" />
                  {sellerCount} sellers
                  {fulfilments.length > 0 && (
                    <span className="text-gray-500">
                      {' · '}
                      {shippedCount > 0 && `${shippedCount} shipped`}
                      {shippedCount > 0 && pendingCount > 0 && ', '}
                      {pendingCount > 0 && `${pendingCount} processing`}
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
            {order.status === 'PROCESSING' && (
              <Button size="sm" variant="outline" onClick={() => handlePrintAndAdvance([order])} title="Print Invoice"><Printer className="h-4 w-4" /></Button>
            )}
            {order.status === 'PACKING' && (
              order.delivery_method === 'self-pickup' ? (
                <Button size="sm" variant="outline" onClick={() => updateOrderStatuses([order.id], 'READY_FOR_COLLECTION').then(ok => { if (ok) { toast({ title: 'Ready', description: `#${order.order_no} ready for collection.` }); fetchOrders(); } })} title="Ready for Collection"><CheckCircle className="h-4 w-4" /></Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => handleOpenShipmentDialog([order])} title="Create Shipment"><Send className="h-4 w-4" /></Button>
              )
            )}
            {(order.status === 'OUT_FOR_DELIVERY' || order.status === 'READY_FOR_COLLECTION') && (
              <Button size="sm" variant="outline" onClick={() => handleMarkCompleted([order.id])} title="Mark Completed"><CheckCircle className="h-4 w-4" /></Button>
            )}
            {order.status !== 'PROCESSING' && (() => {
              const slices = splitOrderBySeller(order as any);
              if (slices.length <= 1) {
                return <Button size="sm" variant="ghost" onClick={() => generateInvoice(order)} title="Invoice" className="text-blue-600 hover:bg-blue-50"><FileText className="h-4 w-4" /></Button>;
              }
              return (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="ghost" title="Invoice (per seller)" className="text-blue-600 hover:bg-blue-50">
                      <FileText className="h-4 w-4" />
                      <ChevronDown className="h-3 w-3 ml-0.5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-1" align="end">
                    <div className="px-2 py-1.5 text-xs text-muted-foreground border-b mb-1">
                      {slices.length} sellers in this order
                    </div>
                    <button
                      type="button"
                      className="w-full flex items-center justify-between gap-2 px-2 py-2 text-sm rounded hover:bg-accent text-left"
                      onClick={() => generateInvoice(order, null)}
                    >
                      <span className="font-medium">All sellers (combined)</span>
                      <span className="text-xs text-muted-foreground">RM {order.total.toFixed(2)}</span>
                    </button>
                    <div className="my-1 border-t" />
                    {slices.map((s) => (
                      <button
                        key={s.sellerKey}
                        type="button"
                        className="w-full flex items-center justify-between gap-2 px-2 py-2 text-sm rounded hover:bg-accent text-left"
                        onClick={() => generateInvoice(order, s)}
                      >
                        <span className="truncate font-medium">{s.sellerName}</span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">RM {s.total.toFixed(2)}</span>
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>
              );
            })()}
            <Button size="sm" variant="ghost" onClick={() => handleDeleteOrder(order)} title="Delete" className="text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>
            <ChevronRight className="h-4 w-4 text-gray-400 ml-0.5" />
          </div>
      </div>
    );
  };

  // The currently-selected order (for the right-side drawer).
  const selectedOrder = selectedOrderId ? orders.find(o => o.id === selectedOrderId) ?? null : null;

  const renderOrderDrawer = () => {
    if (!selectedOrder) return null;
    const order = selectedOrder;
    const sellerGroups = buildSellerGroups(order);
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b sticky top-0 bg-background z-10">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-muted-foreground" />
              Order #{order.order_no}
            </SheetTitle>
            <SheetDescription>
              Created {formatDate(order.created_at)} · {formatRelative(order.created_at)}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {getStatusBadge(order.status)}
            {countStuckFulfilments(order) > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-amber-100 text-amber-800 border border-amber-200">
                <AlertTriangle className="h-3 w-3" />
                {countStuckFulfilments(order)} stuck
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 px-6 py-5 space-y-6">
          {/* Customer */}
          <section className="space-y-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <User className="h-3.5 w-3.5" />
              Customer
            </h3>
            <div className="rounded-md border p-3.5 space-y-1.5 text-sm">
              <div className="font-semibold">{order.customer_name}</div>
              {order.customer_phone && (
                <div className="text-muted-foreground flex items-center gap-1.5">
                  <Phone className="h-3 w-3" />
                  <a href={`tel:${order.customer_phone}`} className="hover:text-foreground hover:underline" onClick={(e) => e.stopPropagation()}>
                    {order.customer_phone}
                  </a>
                </div>
              )}
              {order.customer_email && (
                <div className="text-muted-foreground flex items-center gap-1.5">
                  <Mail className="h-3 w-3" />
                  <a href={`mailto:${order.customer_email}`} className="hover:text-foreground hover:underline" onClick={(e) => e.stopPropagation()}>
                    {order.customer_email}
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
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Method</span>
                <span className="capitalize">{order.delivery_method.replace(/-/g, ' ')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Fee</span>
                <span className="tabular-nums">{order.delivery_fee > 0 ? formatCurrency(order.delivery_fee) : <span className="text-amber-700">Pay on delivery</span>}</span>
              </div>
              {formatAddress(order.delivery_address) && (
                <div className="text-muted-foreground flex items-start gap-1.5 pt-1">
                  <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span>{formatAddress(order.delivery_address)}</span>
                </div>
              )}
              {order.delivery_address?.notes && (
                <div className="text-xs text-muted-foreground pt-1">Note: {order.delivery_address.notes}</div>
              )}
              {order.courier_tracking_number && (
                <div className="pt-1 text-xs">
                  <span className="text-muted-foreground">AutoLab tracking: </span>
                  <code className="font-mono bg-muted px-1.5 py-0.5 rounded">{order.courier_tracking_number}</code>
                  {order.courier_provider && <span className="text-muted-foreground"> · {order.courier_provider}</span>}
                </div>
              )}
            </div>
          </section>

          <Separator />

          {/* Items grouped by seller */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Package className="h-3.5 w-3.5" />
                Items ({order.order_items.length})
              </h3>
              {sellerGroups.length > 1 && (
                <span className="text-xs text-muted-foreground">{sellerGroups.length} sellers</span>
              )}
            </div>
            <div className="space-y-4">
              {sellerGroups.map(({ key, items, fulfilment, sellerName, subtotal }) => {
                const isAutoLab = key === '__autolab__';
                const orderAgeHours = (Date.now() - new Date(order.created_at).getTime()) / 3600000;
                const isStuck = !isAutoLab && fulfilment?.status === 'PENDING' && orderAgeHours > STUCK_THRESHOLD_HOURS;
                return (
                  <div key={key} className={`rounded-md border ${isStuck ? 'border-amber-300' : 'border-gray-200'}`}>
                    {/* Seller header */}
                    <div className="flex items-center justify-between gap-2 px-3 py-2 border-b bg-muted/40 flex-wrap">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Sold by</span>
                        <span className={`text-xs font-semibold truncate ${isAutoLab ? 'text-gray-700' : 'text-lime-800'}`}>{sellerName}</span>
                        {!isAutoLab && fulfilment?.vendor_id && (
                          <Link
                            to={`/admin/vendors?id=${fulfilment.vendor_id}`}
                            className="text-[11px] text-blue-600 hover:text-blue-800 inline-flex items-center gap-0.5"
                            onClick={(e) => e.stopPropagation()}
                            title="View vendor"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        )}
                        {isStuck && (
                          <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-200">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            Stuck
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {isAutoLab ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Package className="h-3 w-3" />
                            In-house
                          </span>
                        ) : fulfilment ? (
                          <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${fulfilmentBadgeClasses(fulfilment.status)}`}>
                            {fulfilmentIcon(fulfilment.status)}
                            {fulfilmentLabel(fulfilment.status)}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">No fulfilment record</span>
                        )}
                      </div>
                    </div>

                    {/* Items */}
                    <div className="divide-y">
                      {items.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 px-3 py-2.5">
                          {item.component_image ? (
                            <img src={transformImage(item.component_image, { width: 120, quality: 70 })} alt={item.component_name} className="w-11 h-11 rounded-md border object-cover flex-shrink-0" loading="lazy" decoding="async" />
                          ) : (
                            <div className="w-11 h-11 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                              <Package className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium leading-tight truncate">{item.component_name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {item.product_context || item.component_sku}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-xs text-muted-foreground tabular-nums">{item.quantity} &times; {formatCurrency(item.unit_price)}</div>
                            <div className="text-sm font-medium tabular-nums">{formatCurrency(item.total_price)}</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Tracking + subtotal footer */}
                    <div className="px-3 py-2 border-t bg-muted/30 text-xs flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3 flex-wrap text-muted-foreground">
                        {fulfilment?.tracking_number ? (
                          <span className="inline-flex items-center gap-1">
                            <Truck className="h-3 w-3" />
                            <code className="font-mono text-blue-700">{fulfilment.tracking_number}</code>
                            {fulfilment.tracking_provider && <span>· {fulfilment.tracking_provider}</span>}
                          </span>
                        ) : !isAutoLab && fulfilment ? (
                          <span className="italic">No tracking yet</span>
                        ) : null}
                        {fulfilment?.shipped_at && <span>Shipped {formatRelative(fulfilment.shipped_at)}</span>}
                        {fulfilment?.delivered_at && <span className="text-green-700">Delivered {formatRelative(fulfilment.delivered_at)}</span>}
                      </div>
                      <span className="font-medium text-foreground tabular-nums">Subtotal {formatCurrency(subtotal)}</span>
                    </div>

                    {fulfilment?.notes && (
                      <div className="px-3 py-2 border-t text-xs bg-yellow-50 border-yellow-100">
                        <span className="text-muted-foreground">Vendor note:</span> {fulfilment.notes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <Separator />

          {/* Payment summary */}
          <section className="space-y-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Receipt className="h-3.5 w-3.5" />
              Payment
            </h3>
            <div className="rounded-md border p-3.5 space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="tabular-nums">{formatCurrency(order.subtotal)}</span></div>
              {order.voucher_code && order.voucher_discount ? (
                <div className="flex justify-between text-green-600"><span>Voucher ({order.voucher_code})</span><span className="tabular-nums">-{formatCurrency(order.voucher_discount)}</span></div>
              ) : null}
              {order.discount > 0 && (
                <div className="flex justify-between text-green-600"><span>Discount</span><span className="tabular-nums">-{formatCurrency(order.discount)}</span></div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery</span>
                <span className="tabular-nums">{order.delivery_fee > 0 ? formatCurrency(order.delivery_fee) : 'Pay on delivery'}</span>
              </div>
              {order.tax > 0 && (
                <div className="flex justify-between"><span className="text-muted-foreground">SST</span><span className="tabular-nums">{formatCurrency(order.tax)}</span></div>
              )}
              <div className="flex justify-between pt-2 mt-1 border-t font-medium"><span>Total</span><span className="tabular-nums">{formatCurrency(order.total)}</span></div>
              <p className="text-xs text-muted-foreground pt-1">
                {order.payment_state} via {order.payment_method.replace(/-/g, ' ')}
              </p>
            </div>
          </section>

          {order.notes && (
            <>
              <Separator />
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</h3>
                <div className="rounded-md border p-3 text-sm bg-yellow-50 border-yellow-200 text-yellow-900">{order.notes}</div>
              </section>
            </>
          )}
        </div>

        {/* Sticky footer with actions */}
        <div className="sticky bottom-0 bg-background border-t p-4 flex flex-wrap gap-2 justify-end">
          {order.status === 'PROCESSING' && (
            <Button size="sm" onClick={() => handlePrintAndAdvance([order])}>
              <Printer className="h-4 w-4 mr-2" />Print &amp; Move to Packing
            </Button>
          )}
          {order.status === 'PACKING' && (
            order.delivery_method === 'self-pickup' ? (
              <Button
                size="sm"
                onClick={() =>
                  updateOrderStatuses([order.id], 'READY_FOR_COLLECTION').then((ok) => {
                    if (ok) {
                      toast({ title: 'Ready', description: `#${order.order_no} ready for collection.` });
                      fetchOrders();
                    }
                  })
                }
              >
                <CheckCircle className="h-4 w-4 mr-2" />Ready for Collection
              </Button>
            ) : (
              <Button size="sm" onClick={() => handleOpenShipmentDialog([order])}>
                <Send className="h-4 w-4 mr-2" />Create Shipment
              </Button>
            )
          )}
          {(order.status === 'OUT_FOR_DELIVERY' || order.status === 'READY_FOR_COLLECTION') && (
            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleMarkCompleted([order.id])}>
              <CheckCircle className="h-4 w-4 mr-2" />Mark Completed
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => generateInvoice(order)}>
            <FileText className="h-4 w-4 mr-2" />Invoice
          </Button>
          <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleDeleteOrder(order)}>
            <Trash2 className="h-4 w-4 mr-2" />Delete
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Order Management</h2>
          <p className="text-muted-foreground">
            Manage active orders. Completed orders are in{' '}
            <Link to="/admin/archived-orders" className="text-blue-600 hover:text-blue-800 underline">Archive</Link>.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Processing</p>
            <p className="text-2xl font-bold">{statusCounts['PROCESSING'] || 0}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Packing</p>
            <p className="text-2xl font-bold">{statusCounts['PACKING'] || 0}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Out for Delivery</p>
            <p className="text-2xl font-bold">{statusCounts['OUT_FOR_DELIVERY'] || 0}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-400">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Cancelled / Failed</p>
            <p className="text-2xl font-bold">{(statusCounts['CANCELLED'] || 0) + (statusCounts['PAYMENT_FAILED'] || 0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters + Actions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search orders..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8" />
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <Select value={sellerFilter} onValueChange={v => { setSellerFilter(v); setSelectedOrderIds(new Set()); }}>
                <SelectTrigger className="w-48"><SelectValue placeholder="All Sellers" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sellers</SelectItem>
                  <SelectItem value="autolab">AutoLab (in-house)</SelectItem>
                  {sellerOptions.length > 0 && <div className="px-2 py-1 text-[10px] text-muted-foreground uppercase">Vendors</div>}
                  {sellerOptions.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setSelectedOrderIds(new Set()); }}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_FILTER_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <span className="text-sm text-gray-500">{filteredOrders.length} orders</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {renderBulkActions()}

          {loading && orders.length === 0 ? (
            <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" /></div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-gray-500">{searchTerm || statusFilter !== 'all' ? 'No orders match your filters.' : 'No active orders.'}</div>
          ) : (
            <div className="border rounded-lg overflow-hidden mt-3">
              <div className="flex items-center gap-4 px-4 py-2 bg-gray-100 border-b text-xs font-medium text-gray-500">
                <div className="w-6"><Checkbox checked={selectedOrderIds.size > 0 && filteredOrders.every(o => selectedOrderIds.has(o.id))} onCheckedChange={handleSelectAll} /></div>
                <div className="flex-1">Order</div>
                <div className="w-40 text-right">Actions</div>
              </div>
              {filteredOrders.map(renderOrderRow)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order detail drawer (right-side Sheet) */}
      <Sheet
        open={selectedOrderId !== null}
        onOpenChange={(open) => { if (!open) setSelectedOrderId(null); }}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl overflow-y-auto p-0"
        >
          {renderOrderDrawer()}
        </SheetContent>
      </Sheet>

      {/* Confirm Advance to Packing */}
      <Dialog open={confirmAdvanceDialogOpen} onOpenChange={setConfirmAdvanceDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Move to Packing?</DialogTitle>
            <DialogDescription>Move {ordersToAdvance.length} order(s) to Packing status?</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setConfirmAdvanceDialogOpen(false)}>Skip</Button>
            <Button onClick={handleConfirmAdvanceToPacking}>Move to Packing</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Shipment Dialog */}
      <ShipmentCreationDialog orders={ordersForShipment} isOpen={isShipmentDialogOpen} onClose={() => { setIsShipmentDialogOpen(false); setOrdersForShipment([]); }} onSuccess={handleShipmentCreated} />

      {/* Invoice Modal — no QR code, normal button colors */}
      {isInvoiceModalOpen && selectedOrderForInvoice && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) closeInvoiceModal(); }}>
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto shadow-xl">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h2 className="text-xl font-semibold">
                Invoice Preview
                {invoiceSlice && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    · {invoiceSlice.sellerName}
                  </span>
                )}
              </h2>
              <button onClick={closeInvoiceModal} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            <div id="invoice-content">
              <div id="invoiceBody" className="p-5 bg-white">
                <SellerInvoice order={selectedOrderForInvoice as any} slice={invoiceSlice ?? undefined} />
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t p-4 flex justify-center gap-3">
              <Button onClick={printInvoiceAction}><Printer className="h-4 w-4 mr-2" />Print Invoice</Button>
              <Button onClick={downloadInvoicePDF} variant="outline"><Download className="h-4 w-4 mr-2" />Download PDF</Button>
              {ordersToAdvance.length > 0 && ordersToAdvance[0].status === 'PROCESSING' && (
                <Button onClick={() => { closeInvoiceModal(); setConfirmAdvanceDialogOpen(true); }} variant="secondary">Move to Packing</Button>
              )}
              <Button onClick={closeInvoiceModal} variant="outline">Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* Picking List Modal */}
      {isPickingListModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setIsPickingListModalOpen(false); }}>
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-auto shadow-xl">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
              <h2 className="text-xl font-semibold">Picking List</h2>
              <button onClick={() => setIsPickingListModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            <div id="picking-list-content">
              <div id="pickingListBody" className="p-8 bg-white">
                <div className="mb-6">
                  <h1 className="text-2xl font-bold mb-2">Picking List</h1>
                  <p className="text-sm text-gray-600">Generated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  <p className="text-sm text-gray-600">Total Orders: {selectedOrderIds.size}</p>
                </div>
                <table className="w-full border-collapse border border-gray-300">
                  <thead><tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-2 text-left w-16">No.</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Component Name</th>
                    <th className="border border-gray-300 px-4 py-2 text-left w-32">SKU</th>
                    <th className="border border-gray-300 px-4 py-2 text-center w-24">Qty</th>
                    <th className="border border-gray-300 px-4 py-2 text-left w-40">Order ID</th>
                  </tr></thead>
                  <tbody>
                    {generatePickingListData().map((item, index) => item.orderQuantities.map((oq, qi) => (
                      <tr key={`${item.sku}-${qi}`} className="hover:bg-gray-50">
                        {qi === 0 && (<>
                          <td className="border border-gray-300 px-4 py-2 text-center font-semibold align-middle" rowSpan={item.orderQuantities.length}>{index + 1}</td>
                          <td className="border border-gray-300 px-4 py-2 align-middle" rowSpan={item.orderQuantities.length}>{item.componentName}</td>
                          <td className="border border-gray-300 px-4 py-2 align-middle" rowSpan={item.orderQuantities.length}><code className="text-xs bg-gray-100 px-2 py-1 rounded">{item.sku}</code></td>
                        </>)}
                        <td className="border border-gray-300 px-4 py-2 text-center">{oq.quantity}</td>
                        <td className="border border-gray-300 px-4 py-2">{oq.orderId}</td>
                      </tr>
                    )))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t p-4 flex justify-center gap-3">
              <Button onClick={printPickingList}><Printer className="h-4 w-4 mr-2" />Print</Button>
              <Button onClick={downloadPickingListPDF} variant="outline"><Download className="h-4 w-4 mr-2" />Download PDF</Button>
              {ordersToAdvance.length > 0 && (
                <Button onClick={() => { setIsPickingListModalOpen(false); setConfirmAdvanceDialogOpen(true); }} variant="secondary">Move {ordersToAdvance.length} to Packing</Button>
              )}
              <Button onClick={() => setIsPickingListModalOpen(false)} variant="outline">Close</Button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          #invoice-content, #invoice-content *, #picking-list-content, #picking-list-content * { visibility: visible; }
          #invoice-content, #picking-list-content { position: absolute; left: 0; top: 0; width: 100%; height: 100%; margin: 0; padding: 0; background: white; }
          .sticky { display: none; }
        }
      ` }} />
    </div>
  );
}
