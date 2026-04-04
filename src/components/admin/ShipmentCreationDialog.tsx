import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Truck, Package, Clock } from 'lucide-react';
import {
  COURIER_SERVICES,
  JNTExpressService,
  LalamoveService,
  type CourierProvider,
  type ShipmentRequest,
  type ShipmentResponse,
} from '@/lib/courier-service';

interface Order {
  id: string;
  order_no: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  delivery_address: any;
  total: number;
  order_items: Array<{
    id: string;
    component_sku: string;
    component_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
}

interface ShipmentCreationDialogProps {
  orders: Order[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ShipmentCreationDialog({ orders, isOpen, onClose, onSuccess }: ShipmentCreationDialogProps) {
  const [selectedCourier, setSelectedCourier] = useState<CourierProvider | null>(null);
  const [creating, setCreating] = useState(false);
  const [results, setResults] = useState<{ orderId: string; orderNo: string; success: boolean; trackingNumber?: string; error?: string }[]>([]);
  const { toast } = useToast();

  const handleCreateShipments = async () => {
    if (!selectedCourier) {
      toast({ title: 'Select a courier', description: 'Please select a courier provider.', variant: 'destructive' });
      return;
    }

    setCreating(true);
    const shipmentResults: typeof results = [];

    for (const order of orders) {
      try {
        const request: ShipmentRequest = {
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
            country: order.delivery_address?.country || 'Malaysia',
            notes: order.delivery_address?.notes,
          },
          items: order.order_items.map(item => ({
            name: item.component_name,
            sku: item.component_sku,
            quantity: item.quantity,
            value: item.total_price,
          })),
          totalValue: order.total,
        };

        let response: ShipmentResponse;
        const courierConfig = COURIER_SERVICES.find(c => c.id === selectedCourier);

        if (selectedCourier === 'JNT') {
          const service = new JNTExpressService(courierConfig?.apiKey || '', courierConfig?.apiEndpoint || '');
          response = await service.createShipment(request);
        } else if (selectedCourier === 'LALAMOVE') {
          const service = new LalamoveService(courierConfig?.apiKey || '', courierConfig?.apiEndpoint || '');
          response = await service.createShipment(request);
        } else {
          // OWN_DELIVERY - generate internal tracking
          response = {
            success: true,
            trackingNumber: `OWN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            shipmentId: `own-${order.id.slice(0, 8)}`,
            courierProvider: 'OWN_DELIVERY',
            cost: 0,
          };
        }

        if (response.success && response.trackingNumber) {
          const { error } = await supabase
            .from('orders' as any)
            .update({
              status: 'OUT_FOR_DELIVERY',
              courier_provider: selectedCourier,
              courier_tracking_number: response.trackingNumber,
              courier_shipment_id: response.shipmentId || null,
              courier_cost: response.cost || null,
              courier_label_url: response.shippingLabel || null,
              shipment_created_at: new Date().toISOString(),
              dispatched_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', order.id);

          if (error) throw error;

          shipmentResults.push({ orderId: order.id, orderNo: order.order_no, success: true, trackingNumber: response.trackingNumber });
        } else {
          shipmentResults.push({ orderId: order.id, orderNo: order.order_no, success: false, error: response.errorMessage || 'Shipment creation failed' });
        }
      } catch (error: any) {
        shipmentResults.push({ orderId: order.id, orderNo: order.order_no, success: false, error: error.message });
      }
    }

    setResults(shipmentResults);
    setCreating(false);

    const successCount = shipmentResults.filter(r => r.success).length;
    const failCount = shipmentResults.filter(r => !r.success).length;

    if (successCount > 0) {
      toast({
        title: 'Shipments Created',
        description: `${successCount} shipment(s) created successfully.${failCount > 0 ? ` ${failCount} failed.` : ''}`,
      });
    }

    if (failCount === 0) {
      setTimeout(() => {
        setResults([]);
        setSelectedCourier(null);
        onSuccess();
      }, 1500);
    }
  };

  const handleClose = () => {
    setResults([]);
    setSelectedCourier(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Shipment</DialogTitle>
          <DialogDescription>
            {orders.length === 1
              ? `Create shipment for order #${orders[0]?.order_no}`
              : `Create shipments for ${orders.length} orders`
            }
          </DialogDescription>
        </DialogHeader>

        {results.length > 0 ? (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Results</h4>
            {results.map(r => (
              <div key={r.orderId} className={`p-3 rounded-lg text-sm ${r.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="font-medium">#{r.orderNo}</div>
                {r.success ? (
                  <div className="text-green-700">Tracking: <span className="font-mono font-bold">{r.trackingNumber}</span></div>
                ) : (
                  <div className="text-red-700">{r.error}</div>
                )}
              </div>
            ))}
            <div className="flex justify-end gap-3 mt-4">
              <Button onClick={handleClose}>Done</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-sm mb-3">Select Courier</h4>
              <div className="grid gap-3">
                {COURIER_SERVICES.filter(c => c.enabled).map(courier => (
                  <button
                    key={courier.id}
                    onClick={() => setSelectedCourier(courier.id)}
                    className={`p-4 rounded-lg border-2 text-left transition-colors ${
                      selectedCourier === courier.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {courier.id === 'JNT' && <Truck className="h-5 w-5 text-red-500" />}
                      {courier.id === 'LALAMOVE' && <Clock className="h-5 w-5 text-orange-500" />}
                      {courier.id === 'OWN_DELIVERY' && <Package className="h-5 w-5 text-blue-500" />}
                      <div>
                        <div className="font-medium text-sm">{courier.name}</div>
                        <div className="text-xs text-gray-500">{courier.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {orders.length > 1 && (
              <div className="p-3 bg-gray-50 rounded-lg text-sm">
                <div className="font-medium mb-1">Orders to ship ({orders.length}):</div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {orders.map(o => (
                    <div key={o.id} className="flex justify-between text-xs">
                      <span>#{o.order_no} - {o.customer_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button
                onClick={handleCreateShipments}
                disabled={!selectedCourier || creating}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {creating ? 'Creating...' : `Create ${orders.length > 1 ? `${orders.length} ` : ''}Shipment${orders.length > 1 ? 's' : ''}`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
