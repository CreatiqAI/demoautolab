import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Package,
  PackageCheck,
  Truck,
  CheckCircle,
  Clock,
  User,
  Phone,
  MapPin,
  Calendar,
  FileText,
  ArrowRight,
  Warehouse,
  ShoppingCart,
  Download,
  X,
  Send,
  Search,
  ExternalLink
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  CourierProvider,
  COURIER_SERVICES,
  getCourierService,
  getCourierRates,
  type ShipmentRequest,
  type ShipmentResponse,
  type TrackingInfo,
  type CourierRate
} from '@/lib/courier-service';

// HTML2PDF CDN integration
declare global {
  interface Window {
    html2pdf: any;
  }
}

interface WarehouseOrder {
  id: string;
  order_no: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  delivery_method: string;
  delivery_address: any;
  estimated_delivery_date: string | null;
  processing_notes: string | null;
  internal_notes: string | null;
  total: number;
  status: string;
  created_at: string;
  warehouse_assigned_at: string | null;
  warehouse_assigned_to: string | null;
  // Courier-related fields
  courier_provider: CourierProvider | null;
  courier_tracking_number: string | null;
  courier_shipment_id: string | null;
  courier_cost: number | null;
  courier_label_url: string | null;
  courier_created_at: string | null;
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

type OrderStatus =
  | 'PROCESSING'
  | 'PICKING'
  | 'PACKING'
  | 'READY_FOR_DELIVERY'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'COMPLETED';

const STATUS_WORKFLOW: { status: OrderStatus; label: string; description: string; icon: any; color: string }[] = [
  { status: 'PROCESSING', label: 'Processing', description: 'Order approved, ready for warehouse', icon: Clock, color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { status: 'PICKING', label: 'Picking', description: 'Items being picked from inventory', icon: Package, color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { status: 'PACKING', label: 'Packing', description: 'Items being packed for delivery', icon: PackageCheck, color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { status: 'READY_FOR_DELIVERY', label: 'Ready', description: 'Ready for pickup/delivery', icon: CheckCircle, color: 'bg-green-100 text-green-800 border-green-200' },
  { status: 'OUT_FOR_DELIVERY', label: 'Dispatched', description: 'Out for delivery', icon: Truck, color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  { status: 'DELIVERED', label: 'Delivered', description: 'Successfully delivered to customer', icon: CheckCircle, color: 'bg-emerald-100 text-emerald-800 border-emerald-200' }
];

export default function WarehouseOperations() {
  const [orders, setOrders] = useState<WarehouseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<WarehouseOrder | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateNotes, setUpdateNotes] = useState('');
  const [newStatus, setNewStatus] = useState<OrderStatus>('PICKING');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<OrderStatus>('PROCESSING');
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [isPickingListModalOpen, setIsPickingListModalOpen] = useState(false);
  const [isPackingListModalOpen, setIsPackingListModalOpen] = useState(false);
  const [isCourierDialogOpen, setIsCourierDialogOpen] = useState(false);
  const [courierOrder, setCourierOrder] = useState<WarehouseOrder | null>(null);
  const [selectedCourier, setSelectedCourier] = useState<CourierProvider | null>(null);
  const [courierRates, setCourierRates] = useState<CourierRate[]>([]);
  const [isCreatingShipment, setIsCreatingShipment] = useState(false);
  const [trackingDialogOpen, setTrackingDialogOpen] = useState(false);
  const [trackingInfo, setTrackingInfo] = useState<TrackingInfo | null>(null);
  const [loadingTracking, setLoadingTracking] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchWarehouseOrders();
  }, []);

  // Load HTML2PDF library
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.async = true;
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  const fetchWarehouseOrders = async () => {
    try {
      setLoading(true);
      console.log('🏭 Fetching warehouse orders...');

      // Include WAREHOUSE_ASSIGNED for backwards compatibility (will be shown in PROCESSING tab)
      const warehouseStatuses = ['PROCESSING', 'WAREHOUSE_ASSIGNED', 'PICKING', 'PACKING', 'READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY', 'DELIVERED'];

      // Get orders with warehouse statuses and their items
      const { data: ordersWithItems, error: ordersError } = await supabase
        .from('orders' as any)
        .select(`
          *,
          order_items (
            id, component_sku, component_name, product_context,
            quantity, unit_price, total_price
          )
        `)
        .in('status', warehouseStatuses as any)
        .order('created_at', { ascending: false });

      let ordersData: any[] = [];

      if (!ordersError && ordersWithItems) {
        ordersData = ordersWithItems;
        console.log('✅ Successfully fetched warehouse orders with items:', ordersData.length);
      } else {
        console.warn('Warehouse orders with items query failed, trying basic approach:', ordersError);

        // Fallback: Get orders without items first
        const { data: basicData, error: basicError } = await supabase
          .from('orders' as any)
          .select('*')
          .in('status', warehouseStatuses as any)
          .order('created_at', { ascending: false });

        if (!basicError && basicData) {
          ordersData = (basicData as any[]).map((order: any) => ({ ...order, order_items: [] }));
          console.log('✅ Fetched warehouse orders without items (fallback):', ordersData.length);
        } else {
          console.warn('Direct warehouse query failed, trying all orders and filtering:', basicError);

          // Final fallback: Get all orders and filter in JavaScript
          const { data: allData, error: allError } = await supabase
            .from('orders' as any)
            .select('*')
            .order('created_at', { ascending: false });

          if (!allError && allData) {
            ordersData = (allData as any[])
              .filter((order: any) => warehouseStatuses.includes(order.status))
              .map((order: any) => ({ ...order, order_items: [] }));
            console.log('✅ Filtered warehouse orders from all orders:', ordersData.length);
          } else {
            console.error('❌ All warehouse order queries failed:', allError);
          }
        }
      }

      // Transform data to match expected interface
      // Convert WAREHOUSE_ASSIGNED to PROCESSING for backwards compatibility
      const transformedOrders = ordersData.map((order: any) => ({
        id: order.id,
        order_no: order.order_no || `ORD-${order.id?.slice(0, 8)}`,
        customer_name: order.customer_name || 'Customer',
        customer_phone: order.customer_phone || '',
        customer_email: order.customer_email || null,
        delivery_method: order.delivery_method || 'Standard',
        delivery_address: order.delivery_address || null,
        estimated_delivery_date: order.estimated_delivery_date || null,
        processing_notes: order.processing_notes || null,
        internal_notes: order.internal_notes || null,
        total: order.total || 0,
        status: order.status === 'WAREHOUSE_ASSIGNED' ? 'PROCESSING' : (order.status || 'PROCESSING'),
        created_at: order.created_at,
        warehouse_assigned_at: order.warehouse_assigned_at || null,
        warehouse_assigned_to: order.warehouse_assigned_to || null,
        // Courier-related fields
        courier_provider: order.courier_provider || null,
        courier_tracking_number: order.courier_tracking_number || null,
        courier_shipment_id: order.courier_shipment_id || null,
        courier_cost: order.courier_cost || null,
        courier_label_url: order.courier_label_url || null,
        courier_created_at: order.courier_created_at || null,
        order_items: order.order_items || []
      }));

      setOrders(transformedOrders);
    } catch (error: any) {
      console.error('Error fetching warehouse orders:', error);
      setOrders([]);
      // Don't show error toast since this is expected when database isn't fully set up
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR'
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusInfo = (status: string) => {
    return STATUS_WORKFLOW.find(s => s.status === status) || STATUS_WORKFLOW[0];
  };

  const getOrdersByStatus = (status: OrderStatus) => {
    return orders.filter(order => order.status === status);
  };

  // Multi-select handlers
  const handleSelectOrder = (orderId: string, checked: boolean) => {
    setSelectedOrderIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(orderId);
      } else {
        newSet.delete(orderId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean, statusOrders: WarehouseOrder[]) => {
    if (checked) {
      setSelectedOrderIds(new Set(statusOrders.map(order => order.id)));
    } else {
      setSelectedOrderIds(new Set());
    }
  };

  // Picking List data aggregation (by SKU)
  interface PickingListItem {
    componentName: string;
    sku: string;
    orderQuantities: Array<{
      orderId: string;
      quantity: number;
    }>;
  }

  const generatePickingListData = (): PickingListItem[] => {
    const selectedOrders = orders.filter(order => selectedOrderIds.has(order.id));
    const skuMap = new Map<string, PickingListItem>();

    selectedOrders.forEach(order => {
      order.order_items.forEach(item => {
        if (!skuMap.has(item.component_sku)) {
          skuMap.set(item.component_sku, {
            componentName: item.component_name,
            sku: item.component_sku,
            orderQuantities: []
          });
        }
        const pickingItem = skuMap.get(item.component_sku)!;
        pickingItem.orderQuantities.push({
          orderId: order.order_no,
          quantity: item.quantity
        });
      });
    });

    return Array.from(skuMap.values());
  };

  // Packing List data (by Order)
  interface PackingListItem {
    orderNo: string;
    items: Array<{
      componentName: string;
      sku: string;
      quantity: number;
    }>;
  }

  const generatePackingListData = (): PackingListItem[] => {
    const selectedOrders = orders.filter(order => selectedOrderIds.has(order.id));

    return selectedOrders.map(order => ({
      orderNo: order.order_no,
      items: order.order_items.map(item => ({
        componentName: item.component_name,
        sku: item.component_sku,
        quantity: item.quantity
      }))
    }));
  };

  const openPickingListModal = () => {
    if (selectedOrderIds.size === 0) {
      toast({
        title: "No Orders Selected",
        description: "Please select at least one order to generate a picking list.",
        variant: "destructive"
      });
      return;
    }
    setIsPickingListModalOpen(true);
  };

  const openPackingListModal = () => {
    if (selectedOrderIds.size === 0) {
      toast({
        title: "No Orders Selected",
        description: "Please select at least one order to generate a packing list.",
        variant: "destructive"
      });
      return;
    }
    setIsPackingListModalOpen(true);
  };

  const closePickingListModal = () => {
    setIsPickingListModalOpen(false);
  };

  const closePackingListModal = () => {
    setIsPackingListModalOpen(false);
  };

  const printPickingList = () => {
    window.print();
  };

  const printPackingList = () => {
    window.print();
  };

  const downloadPickingListPDF = () => {
    const pickingListBody = document.getElementById('pickingListBody');

    const opt = {
      margin: [0.4, 0.4, 0.4, 0.4],
      filename: `picking-list-${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: {
        scale: 1.5,
        useCORS: true,
        letterRendering: true,
        logging: false
      },
      jsPDF: {
        unit: 'in',
        format: 'a4',
        orientation: 'portrait',
        compress: true
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    if (window.html2pdf) {
      window.html2pdf().from(pickingListBody).set(opt).save();
    } else {
      toast({
        title: "Error",
        description: "PDF library not loaded. Please try again.",
        variant: "destructive"
      });
    }
  };

  const downloadPackingListPDF = () => {
    const packingListBody = document.getElementById('packingListBody');

    const opt = {
      margin: [0.4, 0.4, 0.4, 0.4],
      filename: `packing-list-${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: {
        scale: 1.5,
        useCORS: true,
        letterRendering: true,
        logging: false
      },
      jsPDF: {
        unit: 'in',
        format: 'a4',
        orientation: 'portrait',
        compress: true
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    if (window.html2pdf) {
      window.html2pdf().from(packingListBody).set(opt).save();
    } else {
      toast({
        title: "Error",
        description: "PDF library not loaded. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Bulk update selected orders to next status
  const bulkUpdateOrders = async (targetStatus: OrderStatus) => {
    if (selectedOrderIds.size === 0) {
      toast({
        title: "No Orders Selected",
        description: "Please select at least one order to update.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsUpdating(true);
      const selectedOrdersArray = Array.from(selectedOrderIds);

      // Update all selected orders
      const { error } = await supabase
        .from('orders' as any)
        .update({
          status: targetStatus as any,
          updated_at: new Date().toISOString()
        })
        .in('id', selectedOrdersArray);

      if (error) throw error;

      toast({
        title: "Orders Updated",
        description: `${selectedOrdersArray.length} order(s) updated to ${getStatusInfo(targetStatus).label}`,
      });

      // Clear selection and refresh
      setSelectedOrderIds(new Set());
      fetchWarehouseOrders();

    } catch (error: any) {
      console.error('Error bulk updating orders:', error);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update orders",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      setIsUpdating(true);
      console.log('🔄 Updating order status:', { orderId, status });

      // Update order status directly
      const { error } = await supabase
        .from('orders' as any)
        .update({
          status: status as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      const statusInfo = getStatusInfo(status);

      // Special handling for COMPLETED status
      if (status === 'COMPLETED') {
        toast({
          title: "Order Completed",
          description: "Order has been completed and moved to archive",
        });
      } else {
        toast({
          title: "Status Updated",
          description: `Order status updated to ${statusInfo.label}`,
        });
      }

      setUpdateNotes('');
      setSelectedOrder(null);

      // Refresh warehouse orders but maintain current tab
      fetchWarehouseOrders();

    } catch (error: any) {
      console.error('Error updating order status:', error);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update order status",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Courier Service Functions
  const openCourierDialog = async (order: WarehouseOrder) => {
    setCourierOrder(order);
    setSelectedCourier(order.courier_provider || null);
    setIsCourierDialogOpen(true);

    // Fetch courier rates
    try {
      const shipmentRequest: ShipmentRequest = {
        orderId: order.id,
        orderNo: order.order_no,
        customerName: order.customer_name,
        customerPhone: order.customer_phone,
        customerEmail: order.customer_email || undefined,
        deliveryAddress: {
          address: order.delivery_address?.address || '',
          city: order.delivery_address?.city,
          state: order.delivery_address?.state,
          postcode: order.delivery_address?.postcode,
          country: order.delivery_address?.country || 'Malaysia'
        },
        items: order.order_items.map(item => ({
          name: item.component_name,
          sku: item.component_sku,
          quantity: item.quantity
        })),
        pickupAddress: {
          address: '17, Jalan 7/95B, Cheras Utama',
          city: 'Cheras',
          state: 'Kuala Lumpur',
          postcode: '56100',
          country: 'Malaysia',
          contactName: 'AUTO LABS SDN BHD',
          contactPhone: '03-4297 7668'
        }
      };

      const rates = await getCourierRates(shipmentRequest);
      setCourierRates(rates);
    } catch (error) {
      console.error('Error fetching courier rates:', error);
    }
  };

  const createShipment = async () => {
    if (!courierOrder || !selectedCourier) {
      toast({
        title: "Error",
        description: "Please select a courier service",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsCreatingShipment(true);

      const shipmentRequest: ShipmentRequest = {
        orderId: courierOrder.id,
        orderNo: courierOrder.order_no,
        customerName: courierOrder.customer_name,
        customerPhone: courierOrder.customer_phone,
        customerEmail: courierOrder.customer_email || undefined,
        deliveryAddress: {
          address: courierOrder.delivery_address?.address || '',
          city: courierOrder.delivery_address?.city,
          state: courierOrder.delivery_address?.state,
          postcode: courierOrder.delivery_address?.postcode,
          country: courierOrder.delivery_address?.country || 'Malaysia',
          notes: courierOrder.delivery_address?.notes
        },
        items: courierOrder.order_items.map(item => ({
          name: item.component_name,
          sku: item.component_sku,
          quantity: item.quantity,
          value: item.unit_price
        })),
        totalValue: courierOrder.total,
        pickupAddress: {
          address: '17, Jalan 7/95B, Cheras Utama',
          city: 'Cheras',
          state: 'Kuala Lumpur',
          postcode: '56100',
          country: 'Malaysia',
          contactName: 'AUTO LABS SDN BHD',
          contactPhone: '03-4297 7668'
        }
      };

      let shipmentResponse: ShipmentResponse | null = null;

      if (selectedCourier === 'OWN_DELIVERY') {
        // For own delivery, just mark it without external API call
        shipmentResponse = {
          success: true,
          courierProvider: 'OWN_DELIVERY',
          trackingNumber: `OWN-${courierOrder.order_no}`,
          shipmentId: `OWN-${courierOrder.id}`,
          cost: 5.00
        };
      } else {
        // Call courier service API
        const courierService = getCourierService(selectedCourier);
        if (courierService) {
          shipmentResponse = await courierService.createShipment(shipmentRequest);
        }
      }

      if (!shipmentResponse || !shipmentResponse.success) {
        throw new Error(shipmentResponse?.errorMessage || 'Failed to create shipment');
      }

      // Update order with courier information
      const { error } = await supabase
        .from('orders' as any)
        .update({
          courier_provider: selectedCourier,
          courier_tracking_number: shipmentResponse.trackingNumber,
          courier_shipment_id: shipmentResponse.shipmentId,
          courier_cost: shipmentResponse.cost,
          courier_label_url: shipmentResponse.shippingLabel,
          courier_created_at: new Date().toISOString(),
          status: 'OUT_FOR_DELIVERY',
          updated_at: new Date().toISOString()
        })
        .eq('id', courierOrder.id);

      if (error) throw error;

      toast({
        title: "Shipment Created",
        description: `Tracking Number: ${shipmentResponse.trackingNumber}`,
      });

      setIsCourierDialogOpen(false);
      setCourierOrder(null);
      setSelectedCourier(null);
      fetchWarehouseOrders();

    } catch (error: any) {
      console.error('Error creating shipment:', error);
      toast({
        title: "Shipment Failed",
        description: error.message || "Failed to create shipment",
        variant: "destructive"
      });
    } finally {
      setIsCreatingShipment(false);
    }
  };

  const trackShipment = async (order: WarehouseOrder) => {
    if (!order.courier_tracking_number || !order.courier_provider) {
      toast({
        title: "No Tracking Information",
        description: "This order doesn't have tracking information",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoadingTracking(true);
      setTrackingDialogOpen(true);

      const courierService = getCourierService(order.courier_provider);
      if (courierService) {
        const tracking = await courierService.trackShipment(order.courier_tracking_number);
        setTrackingInfo(tracking);
      } else if (order.courier_provider === 'OWN_DELIVERY') {
        // Mock tracking for own delivery
        setTrackingInfo({
          trackingNumber: order.courier_tracking_number,
          courierProvider: 'OWN_DELIVERY',
          status: 'out_for_delivery',
          statusDescription: 'Package is out for delivery',
          history: [
            {
              timestamp: order.courier_created_at || new Date().toISOString(),
              status: 'picked_up',
              description: 'Package picked up',
              location: 'Warehouse'
            }
          ]
        });
      }
    } catch (error: any) {
      console.error('Error tracking shipment:', error);
      toast({
        title: "Tracking Failed",
        description: error.message || "Failed to track shipment",
        variant: "destructive"
      });
    } finally {
      setLoadingTracking(false);
    }
  };

  const downloadShippingLabel = (order: WarehouseOrder) => {
    if (!order.courier_label_url) {
      toast({
        title: "No Label Available",
        description: "Shipping label is not available for this order",
        variant: "destructive"
      });
      return;
    }

    // In production, this would download the actual label
    window.open(order.courier_label_url, '_blank');

    toast({
      title: "Label Downloaded",
      description: "Shipping label opened in new tab",
    });
  };

  const StatusCard = ({ status, count }: { status: OrderStatus; count: number }) => {
    const statusInfo = getStatusInfo(status);
    const Icon = statusInfo.icon;

    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${statusInfo.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{statusInfo.label}</p>
                <p className="text-2xl font-bold">{count}</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">{statusInfo.description}</p>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Warehouse Operations</h1>
        <div className="flex justify-center py-8">
          <div className="text-center">Loading warehouse orders...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Warehouse Operations</h1>
          <p className="text-muted-foreground">
            Manage order fulfillment and warehouse operations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-blue-700 border-blue-300 bg-blue-50">
            <Warehouse className="h-3 w-3 mr-1" />
            {orders.length} Active Orders
          </Badge>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
        {STATUS_WORKFLOW.map(({ status }) => (
          <StatusCard key={status} status={status} count={getOrdersByStatus(status).length} />
        ))}
      </div>

      {/* Orders by Status Tabs */}
      <Tabs value={currentTab} onValueChange={(value) => setCurrentTab(value as OrderStatus)} className="w-full">
        {/* Desktop Tabs - Hidden on mobile/tablet */}
        <TabsList className="hidden lg:grid w-full grid-cols-6">
          {STATUS_WORKFLOW.map(({ status, label }) => (
            <TabsTrigger key={status} value={status} className="text-xs">
              {label} ({getOrdersByStatus(status).length})
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Mobile/Tablet Dropdown - Hidden on desktop */}
        <div className="lg:hidden mb-4">
          <Label htmlFor="status-select" className="sr-only">Select Status</Label>
          <Select value={currentTab} onValueChange={(value) => setCurrentTab(value as OrderStatus)}>
            <SelectTrigger className="w-full">
              <SelectValue>
                <div className="flex items-center gap-2">
                  {React.createElement(getStatusInfo(currentTab).icon, { className: "h-4 w-4" })}
                  <span className="font-medium">{getStatusInfo(currentTab).label}</span>
                  <Badge variant="secondary" className="ml-auto">
                    {getOrdersByStatus(currentTab).length}
                  </Badge>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {STATUS_WORKFLOW.map(({ status, label, icon: Icon }) => (
                <SelectItem key={status} value={status}>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span>{label}</span>
                    </div>
                    <Badge variant="secondary" className="ml-2">
                      {getOrdersByStatus(status).length}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {STATUS_WORKFLOW.map(({ status, label, description }) => {
          const statusOrders = getOrdersByStatus(status);
          const selectedInTab = statusOrders.filter(order => selectedOrderIds.has(order.id)).length;

          return (
          <TabsContent key={status} value={status}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {React.createElement(getStatusInfo(status).icon, { className: "h-5 w-5" })}
                  {label} Orders
                </CardTitle>
                <CardDescription>{description}</CardDescription>

                {/* Action Buttons for Selected Orders */}
                {selectedInTab > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg mt-4">
                    <span className="text-sm font-medium text-blue-900">
                      {selectedInTab} order{selectedInTab > 1 ? 's' : ''} selected
                    </span>

                    {/* Show Generate Picking List for PROCESSING tab */}
                    {status === 'PROCESSING' && (
                      <Button
                        onClick={openPickingListModal}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        size="sm"
                      >
                        <Package className="h-4 w-4 mr-2" />
                        Generate Picking List
                      </Button>
                    )}

                    {/* Show Generate Packing List for PACKING tab */}
                    {status === 'PACKING' && (
                      <Button
                        onClick={openPackingListModal}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white"
                        size="sm"
                      >
                        <PackageCheck className="h-4 w-4 mr-2" />
                        Generate Packing List
                      </Button>
                    )}

                    {/* Bulk Update Button */}
                    {getNextStatus(status) && (
                      <Button
                        onClick={() => bulkUpdateOrders(getNextStatus(status)!.status)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                        size="sm"
                        disabled={isUpdating}
                      >
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Move to {getNextStatus(status)!.label}
                      </Button>
                    )}

                    <Button
                      onClick={() => setSelectedOrderIds(new Set())}
                      variant="outline"
                      size="sm"
                    >
                      Clear Selection
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {statusOrders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No orders in {label.toLowerCase()} status</p>
                  </div>
                ) : (
                  <>
                    {/* Desktop Table */}
                    <div className="hidden md:block rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">
                              <Checkbox
                                checked={selectedInTab === statusOrders.length && statusOrders.length > 0}
                                onCheckedChange={(checked) => handleSelectAll(checked as boolean, statusOrders)}
                                aria-label="Select all orders"
                              />
                            </TableHead>
                            <TableHead>Order</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Items</TableHead>
                            <TableHead>Delivery</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead className="text-center">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {statusOrders.map((order) => (
                            <React.Fragment key={order.id}>
                              <TableRow
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                              >
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                  <Checkbox
                                    checked={selectedOrderIds.has(order.id)}
                                    onCheckedChange={(checked) => handleSelectOrder(order.id, checked as boolean)}
                                    aria-label={`Select order ${order.order_no}`}
                                  />
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">{order.order_no}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatDate(order.created_at)}
                                    </p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">{order.customer_name}</p>
                                    <p className="text-sm text-muted-foreground">{order.customer_phone}</p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <ShoppingCart className="h-4 w-4" />
                                    {order.order_items.length} items
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <p className="capitalize">{order.delivery_method}</p>
                                  {order.estimated_delivery_date && (
                                    <p className="text-xs text-muted-foreground">
                                      ETA: {formatDate(order.estimated_delivery_date)}
                                    </p>
                                  )}
                                </TableCell>
                                <TableCell className="font-medium">
                                  {formatCurrency(order.total)}
                                </TableCell>
                                <TableCell className="text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    {/* Show courier buttons for READY_FOR_DELIVERY status */}
                                    {status === 'READY_FOR_DELIVERY' && !order.courier_tracking_number && (
                                      <Button
                                        variant="default"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openCourierDialog(order);
                                        }}
                                        className="bg-blue-600 hover:bg-blue-700"
                                      >
                                        <Send className="h-4 w-4 mr-1" />
                                        Create Shipment
                                      </Button>
                                    )}

                                    {/* Show tracking/label buttons for orders with courier assigned */}
                                    {order.courier_tracking_number && (
                                      <>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            trackShipment(order);
                                          }}
                                        >
                                          <Search className="h-4 w-4 mr-1" />
                                          Track
                                        </Button>
                                        {order.courier_label_url && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              downloadShippingLabel(order);
                                            }}
                                          >
                                            <Download className="h-4 w-4 mr-1" />
                                            Label
                                          </Button>
                                        )}
                                      </>
                                    )}

                                    {/* Default process button for other statuses */}
                                    {status !== 'READY_FOR_DELIVERY' && !order.courier_tracking_number && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedOrder(order);
                                          const validNextStatuses = getValidNextStatuses(order.status as OrderStatus);
                                          setNewStatus((validNextStatuses[0]?.status as OrderStatus) || 'PICKING');
                                        }}
                                      >
                                        <ArrowRight className="h-4 w-4 mr-1" />
                                        Process
                                      </Button>
                                    )}
                                  </div>
                              </TableCell>
                            </TableRow>
                              {expandedOrderId === order.id && (
                                <TableRow>
                                  <TableCell colSpan={7} className="bg-muted/30">
                                    <div className="p-4 space-y-4">
                                      <div className="grid md:grid-cols-2 gap-4">
                                        {/* Delivery Address */}
                                        <div>
                                          <h4 className="font-medium mb-2 flex items-center gap-2">
                                            <MapPin className="h-4 w-4" />
                                            Delivery Address
                                          </h4>
                                          {order.delivery_address ? (
                                            <div className="bg-gray-50 p-3 rounded-md text-sm">
                                              <p className="font-medium">
                                                {order.delivery_address.fullName || order.customer_name}
                                              </p>
                                              <p className="text-muted-foreground">
                                                {order.delivery_address.phoneNumber || order.customer_phone}
                                              </p>
                                              <div className="mt-2 space-y-1">
                                                {/* Handle new address format (single address field) */}
                                                {order.delivery_address.address && (
                                                  <p className="whitespace-pre-line">{order.delivery_address.address}</p>
                                                )}

                                                {/* Handle old address format (multiple fields) - for backward compatibility */}
                                                {order.delivery_address.address_line_1 && (
                                                  <p>{order.delivery_address.address_line_1}</p>
                                                )}
                                                {order.delivery_address.address_line_2 && (
                                                  <p>{order.delivery_address.address_line_2}</p>
                                                )}
                                                {order.delivery_address.city && order.delivery_address.postal_code && (
                                                  <p>{order.delivery_address.postal_code} {order.delivery_address.city}</p>
                                                )}
                                                {order.delivery_address.state && (
                                                  <p>{order.delivery_address.state}</p>
                                                )}

                                                {/* Show special delivery notes if available */}
                                                {order.delivery_address.notes && (
                                                  <div className="mt-2 pt-2 border-t border-gray-200">
                                                    <p className="text-xs font-medium text-gray-600">Special Instructions:</p>
                                                    <p className="text-xs text-gray-700 italic">{order.delivery_address.notes}</p>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          ) : (
                                            <p className="text-sm text-muted-foreground">No address provided</p>
                                          )}
                                        </div>

                                        {/* Warehouse Picking List */}
                                        <div>
                                          <h4 className="font-medium mb-2 flex items-center gap-2">
                                            <Package className="h-4 w-4" />
                                            Picking List ({order.order_items.length} items)
                                          </h4>
                                          <div className="space-y-2">
                                            {order.order_items.map((item) => (
                                              <div key={item.id} className="bg-white border rounded-lg p-3">
                                                <div className="flex items-center justify-between">
                                                  <div className="flex items-center gap-3">
                                                    <Badge variant="secondary" className="text-lg font-bold px-2 py-1">
                                                      {item.quantity}
                                                    </Badge>
                                                    <div>
                                                      <p className="font-mono font-bold text-sm text-blue-600">{item.component_sku}</p>
                                                      <p className="text-sm font-medium">{item.component_name}</p>
                                                      {item.product_context && (
                                                        <p className="text-xs text-muted-foreground">For: {item.product_context}</p>
                                                      )}
                                                    </div>
                                                  </div>
                                                  <div className="text-right text-sm text-muted-foreground">
                                                    {formatCurrency(item.unit_price)} each
                                                  </div>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Processing Notes */}
                                      {order.processing_notes && (
                                        <div>
                                          <h4 className="font-medium mb-2 flex items-center gap-2">
                                            <FileText className="h-4 w-4" />
                                            Processing Notes
                                          </h4>
                                          <p className="text-sm text-muted-foreground bg-yellow-50 p-3 rounded-md">{order.processing_notes}</p>
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </React.Fragment>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile/Tablet Cards */}
                    <div className="md:hidden space-y-4">
                      {getOrdersByStatus(status).map((order) => (
                        <Card key={order.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h3 className="font-semibold text-lg">{order.order_no}</h3>
                                <p className="text-sm text-muted-foreground">{formatDate(order.created_at)}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-lg">{formatCurrency(order.total)}</p>
                                <Badge className={`${getStatusInfo(order.status as OrderStatus).color} text-xs`}>
                                  {getStatusInfo(order.status as OrderStatus).label}
                                </Badge>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{order.customer_name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{order.customer_phone}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{order.order_items.length} items</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Truck className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm capitalize">{order.delivery_method}</span>
                              </div>
                            </div>

                            {expandedOrderId === order.id && (
                              <div className="mt-4 pt-4 border-t space-y-4">
                                {/* Delivery Address for Mobile */}
                                {order.delivery_address && (
                                  <div>
                                    <h4 className="font-medium mb-2 flex items-center gap-2">
                                      <MapPin className="h-4 w-4" />
                                      Delivery Address
                                    </h4>
                                    <div className="bg-gray-50 p-3 rounded-md text-sm">
                                      <p className="font-medium">
                                        {order.delivery_address.fullName || order.customer_name}
                                      </p>
                                      <p className="text-muted-foreground">
                                        {order.delivery_address.phoneNumber || order.customer_phone}
                                      </p>
                                      {order.delivery_address.address && (
                                        <p className="mt-2 whitespace-pre-line">{order.delivery_address.address}</p>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Order Items for Mobile */}
                                <div>
                                  <h4 className="font-medium mb-2 flex items-center gap-2">
                                    <Package className="h-4 w-4" />
                                    Items ({order.order_items.length})
                                  </h4>
                                  <div className="space-y-2">
                                    {order.order_items.map((item) => (
                                      <div key={item.id} className="bg-white border rounded-lg p-3">
                                        <div className="flex justify-between items-start">
                                          <div className="flex-1">
                                            <p className="font-mono text-sm font-bold text-blue-600">{item.component_sku}</p>
                                            <p className="text-sm font-medium">{item.component_name}</p>
                                            {item.product_context && (
                                              <p className="text-xs text-muted-foreground">For: {item.product_context}</p>
                                            )}
                                          </div>
                                          <div className="text-right ml-3">
                                            <Badge variant="secondary" className="text-sm font-bold">
                                              {item.quantity}
                                            </Badge>
                                            <p className="text-xs text-muted-foreground mt-1">
                                              {formatCurrency(item.unit_price)} each
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="mt-4 pt-3 border-t">
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedOrder(order);
                                  const validNextStatuses = getValidNextStatuses(order.status as OrderStatus);
                                  setNewStatus((validNextStatuses[0]?.status as OrderStatus) || 'PICKING');
                                }}
                              >
                                <ArrowRight className="h-4 w-4 mr-2" />
                                Process Order
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
          </Card>
        </TabsContent>
          );
        })}
    </Tabs>

      {/* Process Order Dialog */}
      <Dialog open={selectedOrder !== null} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Process Order - {selectedOrder?.order_no}</DialogTitle>
            <DialogDescription>
              Update order status and manage warehouse operations
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              {/* Current Status */}
              <div>
                <h4 className="font-medium mb-2">Current Status</h4>
                <Badge className={getStatusInfo(selectedOrder.status as OrderStatus).color}>
                  {getStatusInfo(selectedOrder.status as OrderStatus).label}
                </Badge>
              </div>

              {/* Status Update */}
              <div>
                <Label htmlFor="newStatus">New Status</Label>
                <Select 
                  value={newStatus} 
                  onValueChange={(value) => setNewStatus(value as OrderStatus)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getValidNextStatuses(selectedOrder.status as OrderStatus).map((statusOption) => (
                      <SelectItem key={statusOption.status} value={statusOption.status}>
                        <div className="flex items-center gap-2">
                          <statusOption.icon className="h-4 w-4" />
                          {statusOption.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Update Notes */}
              <div>
                <Label htmlFor="updateNotes">Update Notes</Label>
                <Textarea
                  id="updateNotes"
                  value={updateNotes}
                  onChange={(e) => setUpdateNotes(e.target.value)}
                  placeholder="Add notes about this status update..."
                  className="mt-1"
                  rows={3}
                />
              </div>

              {/* Action Button */}
              <div className="flex justify-end pt-4">
                {newStatus !== selectedOrder.status && (
                  <Button
                    onClick={() => updateOrderStatus(selectedOrder.id, newStatus)}
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Updating...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <ArrowRight className="h-4 w-4" />
                        Update to {getStatusInfo(newStatus).label}
                      </div>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Picking List Modal */}
      {isPickingListModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closePickingListModal();
            }
          }}
        >
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-auto shadow-xl">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
              <h2 className="text-xl font-semibold">Picking List</h2>
              <button
                onClick={closePickingListModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div id="picking-list-content">
              <div id="pickingListBody" className="p-8 bg-white">
                <div className="mb-6">
                  <h1 className="text-2xl font-bold mb-2">Picking List</h1>
                  <p className="text-sm text-gray-600">
                    Generated: {new Date().toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                  <p className="text-sm text-gray-600">
                    Total Orders: {selectedOrderIds.size}
                  </p>
                </div>

                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-4 py-2 text-left w-16">No.</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Component Name</th>
                      <th className="border border-gray-300 px-4 py-2 text-left w-32">SKU</th>
                      <th className="border border-gray-300 px-4 py-2 text-center w-24">Quantity</th>
                      <th className="border border-gray-300 px-4 py-2 text-left w-40">Order ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generatePickingListData().map((item, index) => {
                      const rowCount = item.orderQuantities.length;
                      return item.orderQuantities.map((orderQty, qtyIndex) => (
                        <tr key={`${item.sku}-${qtyIndex}`} className="hover:bg-gray-50">
                          {qtyIndex === 0 && (
                            <>
                              <td
                                className="border border-gray-300 px-4 py-2 text-center font-semibold align-middle"
                                rowSpan={rowCount}
                              >
                                {index + 1}
                              </td>
                              <td
                                className="border border-gray-300 px-4 py-2 align-middle"
                                rowSpan={rowCount}
                              >
                                {item.componentName}
                              </td>
                              <td
                                className="border border-gray-300 px-4 py-2 align-middle"
                                rowSpan={rowCount}
                              >
                                <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                                  {item.sku}
                                </code>
                              </td>
                            </>
                          )}
                          <td className="border border-gray-300 px-4 py-2 text-center">
                            {orderQty.quantity}
                          </td>
                          <td className="border border-gray-300 px-4 py-2">
                            {orderQty.orderId}
                          </td>
                        </tr>
                      ));
                    })}
                  </tbody>
                </table>

                <div className="mt-6 pt-4 border-t border-gray-300">
                  <p className="text-sm text-gray-600">
                    <strong>Total Items:</strong> {generatePickingListData().length} unique component(s)
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Total Quantity:</strong> {generatePickingListData().reduce((sum, item) =>
                      sum + item.orderQuantities.reduce((qtySum, oq) => qtySum + oq.quantity, 0), 0
                    )} unit(s)
                  </p>
                </div>

                <div className="mt-8 text-center text-xs text-gray-500">
                  <p>This is a computer generated picking list.</p>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t p-4 flex justify-center gap-3">
              <Button onClick={printPickingList} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Download className="h-4 w-4 mr-2" />
                Print Picking List
              </Button>
              <Button onClick={downloadPickingListPDF} variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50">
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <Button onClick={closePickingListModal} variant="outline">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Packing List Modal */}
      {isPackingListModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closePackingListModal();
            }
          }}
        >
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-auto shadow-xl">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
              <h2 className="text-xl font-semibold">Packing List</h2>
              <button
                onClick={closePackingListModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div id="packing-list-content">
              <div id="packingListBody" className="p-8 bg-white">
                <div className="mb-6">
                  <h1 className="text-2xl font-bold mb-2">Packing List</h1>
                  <p className="text-sm text-gray-600">
                    Generated: {new Date().toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                  <p className="text-sm text-gray-600">
                    Total Orders: {selectedOrderIds.size}
                  </p>
                </div>

                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-4 py-2 text-left w-16">No.</th>
                      <th className="border border-gray-300 px-4 py-2 text-left w-32">Order ID</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Items</th>
                      <th className="border border-gray-300 px-4 py-2 text-left w-32">SKU</th>
                      <th className="border border-gray-300 px-4 py-2 text-center w-24">Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generatePackingListData().map((order, orderIndex) => {
                      const rowCount = order.items.length;
                      return order.items.map((item, itemIndex) => (
                        <tr key={`${order.orderNo}-${itemIndex}`} className="hover:bg-gray-50">
                          {itemIndex === 0 && (
                            <>
                              <td
                                className="border border-gray-300 px-4 py-2 text-center font-semibold align-middle"
                                rowSpan={rowCount}
                              >
                                {orderIndex + 1}
                              </td>
                              <td
                                className="border border-gray-300 px-4 py-2 align-middle font-medium"
                                rowSpan={rowCount}
                              >
                                {order.orderNo}
                              </td>
                            </>
                          )}
                          <td className="border border-gray-300 px-4 py-2">
                            {item.componentName}
                          </td>
                          <td className="border border-gray-300 px-4 py-2">
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {item.sku}
                            </code>
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-center">
                            {item.quantity}
                          </td>
                        </tr>
                      ));
                    })}
                  </tbody>
                </table>

                <div className="mt-6 pt-4 border-t border-gray-300">
                  <p className="text-sm text-gray-600">
                    <strong>Total Orders:</strong> {generatePackingListData().length}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Total Items:</strong> {generatePackingListData().reduce((sum, order) =>
                      sum + order.items.length, 0
                    )}
                  </p>
                </div>

                <div className="mt-8 text-center text-xs text-gray-500">
                  <p>This is a computer generated packing list.</p>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t p-4 flex justify-center gap-3">
              <Button onClick={printPackingList} className="bg-yellow-600 hover:bg-yellow-700 text-white">
                <Download className="h-4 w-4 mr-2" />
                Print Packing List
              </Button>
              <Button onClick={downloadPackingListPDF} variant="outline" className="border-yellow-600 text-yellow-600 hover:bg-yellow-50">
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <Button onClick={closePackingListModal} variant="outline">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Courier Selection Dialog */}
      <Dialog open={isCourierDialogOpen} onOpenChange={setIsCourierDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Shipment - {courierOrder?.order_no}</DialogTitle>
            <DialogDescription>
              Select a courier service and create shipment for this order
            </DialogDescription>
          </DialogHeader>

          {courierOrder && (
            <div className="space-y-6">
              {/* Order Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Order Details</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Customer:</span>
                    <p className="font-medium">{courierOrder.customer_name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Phone:</span>
                    <p className="font-medium">{courierOrder.customer_phone}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Address:</span>
                    <p className="font-medium">{courierOrder.delivery_address?.address || 'No address'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Items:</span>
                    <p className="font-medium">{courierOrder.order_items.length} items</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total:</span>
                    <p className="font-medium">{formatCurrency(courierOrder.total)}</p>
                  </div>
                </div>
              </div>

              {/* Courier Selection */}
              <div className="space-y-4">
                <Label>Select Courier Service</Label>
                <div className="grid grid-cols-1 gap-3">
                  {COURIER_SERVICES.filter(s => s.enabled).map((service) => {
                    const rate = courierRates.find(r => r.courierProvider === service.id);
                    return (
                      <div
                        key={service.id}
                        className={`border rounded-lg p-4 cursor-pointer transition-all ${
                          selectedCourier === service.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedCourier(service.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded-full border-2 ${
                              selectedCourier === service.id
                                ? 'border-blue-500 bg-blue-500'
                                : 'border-gray-300'
                            }`}>
                              {selectedCourier === service.id && (
                                <div className="w-2 h-2 bg-white rounded-full m-auto mt-0.5" />
                              )}
                            </div>
                            <div>
                              <h5 className="font-medium">{service.name}</h5>
                              <p className="text-sm text-muted-foreground">{service.description}</p>
                            </div>
                          </div>
                          {rate && (
                            <div className="text-right">
                              <p className="font-bold text-lg">{formatCurrency(rate.cost)}</p>
                              <p className="text-xs text-muted-foreground">
                                {rate.estimatedDays === 0 ? 'Same day' : `${rate.estimatedDays} days`}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCourierDialogOpen(false);
                    setCourierOrder(null);
                    setSelectedCourier(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={createShipment}
                  disabled={!selectedCourier || isCreatingShipment}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isCreatingShipment ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Create Shipment
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Tracking Information Dialog */}
      <Dialog open={trackingDialogOpen} onOpenChange={setTrackingDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Shipment Tracking</DialogTitle>
            <DialogDescription>
              Track your shipment status and history
            </DialogDescription>
          </DialogHeader>

          {loadingTracking ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Loading tracking information...</p>
              </div>
            </div>
          ) : trackingInfo ? (
            <div className="space-y-6">
              {/* Tracking Header */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Tracking Number</p>
                    <p className="font-mono font-bold text-lg">{trackingInfo.trackingNumber}</p>
                  </div>
                  <Badge className={`${
                    trackingInfo.status === 'delivered' ? 'bg-green-500' :
                    trackingInfo.status === 'out_for_delivery' ? 'bg-blue-500' :
                    trackingInfo.status === 'in_transit' ? 'bg-yellow-500' :
                    'bg-gray-500'
                  } text-white`}>
                    {trackingInfo.statusDescription}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Courier:</span>
                    <span className="font-medium ml-2">
                      {COURIER_SERVICES.find(s => s.id === trackingInfo.courierProvider)?.name}
                    </span>
                  </div>
                  {trackingInfo.currentLocation && (
                    <div>
                      <span className="text-muted-foreground">Location:</span>
                      <span className="font-medium ml-2">{trackingInfo.currentLocation}</span>
                    </div>
                  )}
                </div>
                {trackingInfo.estimatedDeliveryDate && (
                  <div className="mt-2 text-sm">
                    <span className="text-muted-foreground">Estimated Delivery:</span>
                    <span className="font-medium ml-2">
                      {new Date(trackingInfo.estimatedDeliveryDate).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                )}
              </div>

              {/* Tracking History */}
              <div>
                <h4 className="font-medium mb-3">Tracking History</h4>
                <div className="space-y-3">
                  {trackingInfo.history.map((event, index) => (
                    <div key={index} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full ${
                          index === trackingInfo.history.length - 1 ? 'bg-blue-500' : 'bg-gray-300'
                        }`} />
                        {index < trackingInfo.history.length - 1 && (
                          <div className="w-0.5 h-full bg-gray-200 my-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{event.description}</p>
                            {event.location && (
                              <p className="text-sm text-muted-foreground">{event.location}</p>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(event.timestamp).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery Confirmation */}
              {trackingInfo.status === 'delivered' && trackingInfo.recipient && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">Delivered</h4>
                  <p className="text-sm text-green-800">
                    Received by: <span className="font-medium">{trackingInfo.recipient.name}</span>
                  </p>
                  {trackingInfo.actualDeliveryDate && (
                    <p className="text-sm text-green-800">
                      On: {new Date(trackingInfo.actualDeliveryDate).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-end pt-4 border-t">
                <Button onClick={() => setTrackingDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No tracking information available</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            body * {
              visibility: hidden;
            }
            #picking-list-content,
            #picking-list-content *,
            #packing-list-content,
            #packing-list-content * {
              visibility: visible;
            }
            #picking-list-content,
            #packing-list-content {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              height: 100%;
              margin: 0;
              padding: 0;
              background: white;
            }
            .sticky {
              display: none;
            }
          }
        `
      }} />
    </div>
  );
}

// Helper to get next status in workflow
const getNextStatus = (currentStatus: OrderStatus) => {
  const WAREHOUSE_WORKFLOW = [
    { status: 'PROCESSING' as OrderStatus, label: 'Processing', icon: Clock },
    { status: 'PICKING' as OrderStatus, label: 'Picking', icon: Package },
    { status: 'PACKING' as OrderStatus, label: 'Packing', icon: PackageCheck },
    { status: 'READY_FOR_DELIVERY' as OrderStatus, label: 'Ready', icon: CheckCircle },
    { status: 'OUT_FOR_DELIVERY' as OrderStatus, label: 'Dispatched', icon: Truck },
    { status: 'DELIVERED' as OrderStatus, label: 'Delivered', icon: CheckCircle }
  ];

  const statusIndex = WAREHOUSE_WORKFLOW.findIndex(s => s.status === currentStatus);
  return statusIndex >= 0 && statusIndex < WAREHOUSE_WORKFLOW.length - 1
    ? WAREHOUSE_WORKFLOW[statusIndex + 1]
    : null;
};

// Get valid next statuses for warehouse workflow progression (for single order dialog)
const getValidNextStatuses = (currentStatus: string) => {
  const WAREHOUSE_WORKFLOW = [
    { status: 'PROCESSING', label: 'Processing', icon: Clock },
    { status: 'PICKING', label: 'Picking', icon: Package },
    { status: 'PACKING', label: 'Packing', icon: PackageCheck },
    { status: 'READY_FOR_DELIVERY', label: 'Ready', icon: CheckCircle },
    { status: 'OUT_FOR_DELIVERY', label: 'Dispatched', icon: Truck },
    { status: 'DELIVERED', label: 'Delivered', icon: CheckCircle },
    { status: 'COMPLETED', label: 'Completed', icon: CheckCircle }
  ];

  const statusIndex = WAREHOUSE_WORKFLOW.findIndex(s => s.status === currentStatus);
  return statusIndex >= 0 && statusIndex < WAREHOUSE_WORKFLOW.length - 1
    ? [WAREHOUSE_WORKFLOW[statusIndex + 1]]
    : [];
};

