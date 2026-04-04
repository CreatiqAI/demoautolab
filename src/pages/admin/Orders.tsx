import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Trash2, Download, FileText, X, Package, Printer, CheckCircle, Truck, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { STATUS_CONFIG, getStatusLabel, getStatusBadgeClasses } from '@/constants/orderStatuses';
import type { OrderStatus } from '@/constants/orderStatuses';
import ShipmentCreationDialog from '@/components/admin/ShipmentCreationDialog';

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
  }>;
}

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Orders' },
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
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState<Order | null>(null);
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
      setExpandedOrderId(expandOrderId);
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

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders' as any)
        .select(`*, order_items (id, component_sku, component_name, product_context, quantity, unit_price, total_price)`)
        .not('status', 'eq', 'COMPLETED')
        .order('created_at', { ascending: false });

      if (error) {
        const { data: basic } = await supabase.from('orders' as any).select('*').not('status', 'eq', 'COMPLETED').order('created_at', { ascending: false });
        setOrders(transformOrders((basic || []).map((o: any) => ({ ...o, order_items: [] }))));
      } else {
        setOrders(transformOrders(data || []));
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
    order_items: o.order_items || []
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
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    if (!searchTerm) return matchesStatus;
    const q = searchTerm.toLowerCase();
    const matchesSearch = order.order_no.toLowerCase().includes(q) || order.customer_name.toLowerCase().includes(q) || order.customer_phone.includes(q);
    return matchesStatus && matchesSearch;
  });

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
  const generateInvoice = (order: Order) => { setSelectedOrderForInvoice(order); setIsInvoiceModalOpen(true); setOrdersToAdvance([order]); };
  const closeInvoiceModal = () => { setIsInvoiceModalOpen(false); setSelectedOrderForInvoice(null); };
  const printInvoiceAction = () => { window.print(); };
  const downloadInvoicePDF = () => {
    if (!selectedOrderForInvoice) return;
    const el = document.getElementById('invoiceBody');
    const opt = { margin: 0.1, filename: `invoice-${selectedOrderForInvoice.order_no}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' } };
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
    const isExpanded = expandedOrderId === order.id;
    return (
      <div key={order.id} className="border-b last:border-b-0">
        <div className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 cursor-pointer" onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}>
          <div onClick={e => e.stopPropagation()}>
            <Checkbox checked={selectedOrderIds.has(order.id)} onCheckedChange={c => handleSelectOrder(order.id, c as boolean)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-semibold text-sm">#{order.order_no}</span>
              <span className="text-sm text-gray-600">{order.customer_name}</span>
              {getStatusBadge(order.status)}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
              <span>{formatDate(order.created_at)}</span>
              <span className="font-medium text-gray-900">{formatCurrency(order.total)}</span>
              <span className="capitalize">{order.delivery_method}</span>
              {order.courier_tracking_number && <span className="font-mono text-blue-600">{order.courier_tracking_number}</span>}
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
            {order.status !== 'PROCESSING' && (
              <Button size="sm" variant="ghost" onClick={() => generateInvoice(order)} title="Invoice" className="text-blue-600 hover:bg-blue-50"><FileText className="h-4 w-4" /></Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => handleDeleteOrder(order)} title="Delete" className="text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>
        {isExpanded && (
          <div className="px-6 py-4 bg-gray-50 border-t">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-medium mb-2 text-sm text-gray-900">Customer</h4>
                <div className="space-y-1 text-sm">
                  <div>{order.customer_name}</div>
                  <div className="text-gray-500">{order.customer_phone}</div>
                  {order.customer_email && <div className="text-gray-500">{order.customer_email}</div>}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2 text-sm text-gray-900">Delivery</h4>
                <div className="space-y-1 text-sm">
                  <div className="capitalize">{order.delivery_method} | {order.delivery_fee === 0 ? 'FREE' : formatCurrency(order.delivery_fee)}</div>
                  {order.delivery_address?.address && <div className="text-xs bg-white p-2 rounded border text-gray-700">{order.delivery_address.address}</div>}
                  {order.courier_tracking_number && <div className="font-mono text-blue-700">{order.courier_tracking_number} <span className="text-xs text-gray-500">({order.courier_provider})</span></div>}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2 text-sm text-gray-900">Summary</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
                  {order.discount > 0 && <div className="flex justify-between"><span className="text-gray-500">Discount</span><span className="text-red-600">-{formatCurrency(order.discount)}</span></div>}
                  <div className="flex justify-between"><span className="text-gray-500">SST</span><span>{formatCurrency(order.tax)}</span></div>
                  <div className="flex justify-between font-semibold border-t pt-1"><span>Total</span><span>{formatCurrency(order.total)}</span></div>
                </div>
              </div>
            </div>
            {order.order_items.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium mb-2 text-sm text-gray-900">Items ({order.order_items.length})</h4>
                <div className="bg-white rounded border divide-y">
                  {order.order_items.map((item, i) => (
                    <div key={item.id} className="flex items-center justify-between px-3 py-2 text-sm">
                      <div><span className="font-medium">{item.component_name}</span> <code className="text-xs text-gray-400 ml-1">{item.component_sku}</code></div>
                      <div className="text-right"><span className="text-gray-500">{item.quantity}x</span> <span className="font-medium ml-2">{formatCurrency(item.total_price)}</span></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {order.notes && <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">{order.notes}</div>}
          </div>
        )}
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
            <div className="flex items-center gap-3">
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
              <h2 className="text-xl font-semibold">Invoice Preview</h2>
              <button onClick={closeInvoiceModal} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            <div id="invoice-content">
              <div id="invoiceBody" className="p-5 bg-white">
                <div style={{ padding: '10px', fontFamily: 'Arial, sans-serif', width: '100%', margin: '0 auto', fontSize: '9px', display: 'flex', flexDirection: 'column', minHeight: '95vh' }}>
                  <div style={{ flex: '0 0 auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <div>
                        <h2 style={{ margin: '0', fontSize: '16px' }}>AUTO LABS SDN BHD</h2>
                        <p style={{ margin: '2px 0', fontSize: '9px' }}>17, Jalan 7/95B, Cheras Utama</p>
                        <p style={{ margin: '2px 0', fontSize: '9px' }}>56100 Cheras, Wilayah Persekutuan Kuala Lumpur</p>
                        <p style={{ margin: '2px 0', fontSize: '9px' }}>Tel: 03-4297 7668</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ border: '1px solid #000', padding: '5px 15px', display: 'inline-block' }}>
                          <h2 style={{ margin: '0', textAlign: 'center', fontSize: '14px' }}>INVOICE</h2>
                          <p style={{ margin: '3px 0', fontSize: '9px' }}><strong>Order ID: </strong>{selectedOrderForInvoice.order_no}</p>
                        </div>
                        <p style={{ margin: '5px 0 2px', fontSize: '9px' }}><strong>Date: </strong>{new Date(selectedOrderForInvoice.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        <p style={{ margin: '2px 0', fontSize: '9px' }}><strong>A/C Code: </strong>DMKT78C</p>
                        <p style={{ margin: '2px 0', fontSize: '9px' }}>
                          {selectedOrderForInvoice.payment_state === 'SUCCESS'
                            ? <><strong>Term: </strong>Cash / <span style={{ textDecoration: 'line-through' }}>Credit</span></>
                            : <><strong>Term: </strong><span style={{ textDecoration: 'line-through' }}>Cash</span> / Credit</>
                          }
                        </p>
                        <p style={{ margin: '2px 0', fontSize: '9px' }}><strong>Salesman: </strong>TECH</p>
                        <p style={{ margin: '2px 0', fontSize: '9px' }}><strong>Served By: </strong>HTL</p>
                      </div>
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                      <p style={{ margin: '2px 0', fontSize: '9px' }}><strong>Bill To: </strong>{selectedOrderForInvoice.customer_name}</p>
                      <p style={{ margin: '2px 0', fontSize: '9px' }}>{selectedOrderForInvoice.delivery_address?.address || 'No address provided'}</p>
                      <p style={{ margin: '2px 0', fontSize: '9px' }}><strong>Attention: </strong>{selectedOrderForInvoice.customer_name}</p>
                      <p style={{ margin: '2px 0', fontSize: '9px' }}><strong>Tel: </strong>{selectedOrderForInvoice.customer_phone || 'N/A'}</p>
                    </div>
                  </div>
                  <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '5px' }}>
                      <thead>
                        <tr><td colSpan={8} style={{ borderTop: '1px solid #000', padding: '0' }} /></tr>
                        <tr>
                          <th style={{ padding: '3px', textAlign: 'left', fontSize: '9px', fontWeight: 'bold' }}>No.</th>
                          <th style={{ padding: '3px', textAlign: 'left', fontSize: '9px', fontWeight: 'bold' }}>Stock Code</th>
                          <th style={{ padding: '3px', textAlign: 'left', fontSize: '9px', fontWeight: 'bold' }}>Description</th>
                          <th style={{ padding: '3px', textAlign: 'center', fontSize: '9px', fontWeight: 'bold' }}>Qty</th>
                          <th style={{ padding: '3px', textAlign: 'center', fontSize: '9px', fontWeight: 'bold' }}>U.O.M</th>
                          <th style={{ padding: '3px', textAlign: 'right', fontSize: '9px', fontWeight: 'bold' }}>Unit Price</th>
                          <th style={{ padding: '3px', textAlign: 'right', fontSize: '9px', fontWeight: 'bold' }}>Discount</th>
                          <th style={{ padding: '3px', textAlign: 'right', fontSize: '9px', fontWeight: 'bold' }}>Amount</th>
                        </tr>
                        <tr><td colSpan={8} style={{ borderBottom: '1px solid #000', padding: '0' }} /></tr>
                      </thead>
                      <tbody>
                        {selectedOrderForInvoice.order_items.map((item, i) => (
                          <tr key={item.id}>
                            <td style={{ fontSize: '9px', padding: '2px 3px' }}>{i + 1}</td>
                            <td style={{ fontSize: '9px', padding: '2px 3px' }}>{item.component_sku}</td>
                            <td style={{ fontSize: '9px', padding: '2px 3px' }}>{item.component_name}</td>
                            <td style={{ fontSize: '9px', textAlign: 'center', padding: '2px 3px' }}>{item.quantity}</td>
                            <td style={{ fontSize: '9px', textAlign: 'center', padding: '2px 3px' }}>Unit</td>
                            <td style={{ fontSize: '9px', textAlign: 'right', padding: '2px 3px' }}>RM {item.unit_price.toFixed(2)}</td>
                            <td style={{ fontSize: '9px', textAlign: 'center', padding: '2px 3px' }} />
                            <td style={{ fontSize: '9px', textAlign: 'right', padding: '2px 3px' }}>RM {item.total_price.toFixed(2)}</td>
                          </tr>
                        ))}
                        {Array.from({ length: Math.max(0, 12 - selectedOrderForInvoice.order_items.length) }, (_, i) => (
                          <tr key={`f-${i}`}><td colSpan={8} style={{ fontSize: '9px', padding: '2px 3px' }}>&nbsp;</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ flex: '0 0 auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '5px' }}>
                      <tbody><tr>
                        <td colSpan={7} style={{ textAlign: 'right', padding: '3px', fontSize: '9px', fontWeight: 'bold' }}>TOTAL</td>
                        <td style={{ textAlign: 'right', padding: '3px', fontSize: '9px', fontWeight: 'bold', borderTop: '1px solid #000' }}>RM {selectedOrderForInvoice.total.toFixed(2)}</td>
                      </tr></tbody>
                    </table>
                    <div style={{ marginTop: '5px' }}>
                      <hr style={{ borderTop: '1px solid #000', borderBottom: 'none', margin: '0' }} />
                      <p style={{ fontSize: '10px', margin: '5px 0', fontWeight: 'bold' }}>RINGGIT MALAYSIA {convertToWords(selectedOrderForInvoice.total)} ONLY</p>
                      <p style={{ fontSize: '9px', marginTop: '5px' }}>Note:</p>
                      <ol style={{ margin: '0', paddingLeft: '20px', fontSize: '8px' }}>
                        <li>Please issue all payment in the name of <strong>AUTO LABS SDN BHD</strong></li>
                        <li>All items remain the property of the company until fully paid</li>
                        <li>No return or exchange of goods after inspection</li>
                        <li>All prices are subject to 10% service tax</li>
                        <li>Stock borrowed for more than seven (7) days will be billed in full of <strong>AUTO LABS SDN BHD</strong></li>
                      </ol>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                      <div><p style={{ borderTop: '1px solid #000', display: 'inline-block', paddingTop: '3px', fontSize: '9px' }}>Received By</p></div>
                      <div><p style={{ borderTop: '1px solid #000', display: 'inline-block', paddingTop: '3px', fontSize: '9px' }}>Company Chop & Signature</p></div>
                    </div>
                    <div style={{ textAlign: 'center', marginTop: '10px', fontStyle: 'italic', fontSize: '8px' }}><p>This is a computer generated copy.<br />No signature is required.</p></div>
                  </div>
                </div>
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
