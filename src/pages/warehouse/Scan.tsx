import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Package,
  PackageCheck,
  Truck,
  CheckCircle,
  Camera,
  Keyboard,
  Search,
  ArrowRight,
  ArrowLeft,
  User,
  Phone,
  MapPin,
  Clock,
  AlertCircle,
  RefreshCw,
  Home
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface ScannedOrder {
  id: string;
  order_no: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  delivery_method: string;
  delivery_address: any;
  total: number;
  status: string;
  created_at: string;
  order_items: Array<{
    id: string;
    component_sku: string;
    component_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
}

const STATUS_INFO: Record<string, { label: string; color: string; icon: any; nextStatus?: string; nextLabel?: string }> = {
  'PROCESSING': {
    label: 'Processing',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Clock,
    nextStatus: 'PACKING',
    nextLabel: 'Start Packing'
  },
  'PACKING': {
    label: 'Packing',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: PackageCheck,
    nextStatus: 'READY_FOR_DELIVERY',
    nextLabel: 'Mark Ready for Delivery'
  },
  'READY_FOR_DELIVERY': {
    label: 'Ready for Delivery',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle,
    nextStatus: 'OUT_FOR_DELIVERY',
    nextLabel: 'Mark Out for Delivery'
  },
  'OUT_FOR_DELIVERY': {
    label: 'Out for Delivery',
    color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    icon: Truck,
    nextStatus: 'DELIVERED',
    nextLabel: 'Mark as Delivered'
  },
  'DELIVERED': {
    label: 'Delivered',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: CheckCircle
  }
};

export default function WarehouseScan() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [scanMode, setScanMode] = useState<'keyboard' | 'camera'>('keyboard');
  const [manualInput, setManualInput] = useState('');
  const [scannedOrder, setScannedOrder] = useState<ScannedOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check for order ID in URL (from QR scan)
  useEffect(() => {
    const orderParam = searchParams.get('order');
    if (orderParam) {
      handleLookup(orderParam);
    }
  }, [searchParams]);

  // Focus input for USB scanner
  useEffect(() => {
    if (scanMode === 'keyboard' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [scanMode, scannedOrder]);

  // Initialize camera scanner
  useEffect(() => {
    if (scanMode === 'camera' && !scannedOrder) {
      const scanner = new Html5QrcodeScanner(
        'qr-reader',
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        false
      );

      scanner.render(
        (decodedText) => {
          // Extract order ID from URL or use direct value
          let orderId = decodedText;
          try {
            const url = new URL(decodedText);
            orderId = url.searchParams.get('order') || decodedText;
          } catch {
            // Not a URL, use as-is
          }
          handleLookup(orderId);
          scanner.clear();
        },
        (error) => {
          // Ignore scan errors (continuous scanning)
        }
      );

      scannerRef.current = scanner;

      return () => {
        scanner.clear().catch(() => {});
      };
    }
  }, [scanMode, scannedOrder]);

  const handleLookup = async (orderNo: string) => {
    if (!orderNo.trim()) return;

    setLoading(true);
    setScannedOrder(null);

    try {
      // Look up by order_no
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_no,
          customer_name,
          customer_phone,
          customer_email,
          delivery_method,
          delivery_address,
          total,
          status,
          created_at,
          order_items (
            id,
            component_sku,
            component_name,
            quantity,
            unit_price,
            total_price
          )
        `)
        .eq('order_no', orderNo.trim())
        .single();

      if (error) {
        // Try looking up by ID
        const { data: dataById, error: errorById } = await supabase
          .from('orders')
          .select(`
            id,
            order_no,
            customer_name,
            customer_phone,
            customer_email,
            delivery_method,
            delivery_address,
            total,
            status,
            created_at,
            order_items (
              id,
              component_sku,
              component_name,
              quantity,
              unit_price,
              total_price
            )
          `)
          .eq('id', orderNo.trim())
          .single();

        if (errorById) {
          throw new Error('Order not found');
        }

        setScannedOrder(dataById);
        playSuccessSound();
        return;
      }

      setScannedOrder(data);
      playSuccessSound();
    } catch (error: any) {
      toast({
        title: 'Order Not Found',
        description: `No order found with ID: ${orderNo}`,
        variant: 'destructive'
      });
      playErrorSound();
    } finally {
      setLoading(false);
      setManualInput('');
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!scannedOrder) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', scannedOrder.id);

      if (error) throw error;

      toast({
        title: 'Status Updated!',
        description: `Order ${scannedOrder.order_no} → ${STATUS_INFO[newStatus]?.label || newStatus}`
      });

      playSuccessSound();

      // Refresh order data
      setScannedOrder({
        ...scannedOrder,
        status: newStatus
      });
    } catch (error: any) {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive'
      });
      playErrorSound();
    } finally {
      setUpdating(false);
    }
  };

  const playSuccessSound = () => {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/ChfSQlS5Xj6bONeygkP4za9L2fcyswOIPQ/8Odc0AmKnfE//nHhFQzLXrA//rIg1MuLHO6//nIhFIqJW2y//fGfEogI2eq//bCc0EfImCg//S9bToaHleg//O5ZjIWF02Y//GzXSoPEkWP/++tVCQKDT6H/+2pTB4HDTWB/+qlRRgFCiyC/+iiQBMDAiaA/+afPA8AAx5//+adOgwAABp8/+WbOQoAABd4/+OZOA0AABRz/+GXNw4AABF');
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch {}
  };

  const playErrorSound = () => {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRlYFAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YRIFAACAf4B/gH+Af4B/gH+Af4B/gH+Af4B/gH+Af4B/gH+Af4B/gH+Af4B/gH+Af4B/gH+Af4B/gH+Af4B/gH+Af4B/gH+Af4B/gH+Af4B/gH+Af4B/gH+Af4B/gH+Af4B/gH+Af4B/gH+Af4B/gH+Af4B/gH+Af4B/gH+Af4B/gH+Af4B/gH+Af3x0bGRdV1FMSD5ANDo7OzxAPkJFSUxRVVpgZW1ze4CBhn+AfYB+fnt3cm1oYltTTUdAOzQvKycjHxsYFhQTExMUFBUXGBseIigsMTc+RUtTV19mbHN5foOGh4eHh4aFgoB9endxbGZfWVFMRj86NC8qJiIdGhcVExIRERERERISExUXGh0hJiosMzg+RUxTWV9mbHJ5fYKFiImJiYmIh4WCf3t3cm1nYFpTTUdAPTcsJyIeGhcUEhEQEBAQEBERExQXGh0hJSktMzk/RkxTWV9mbHJ5fYKFiImKiomJiIaDgHx4c25oYVxVT0lDPTgxLCciHhoXFBIREBAQEBARERMUFxodISYqLjM5P0ZMU1lfZmxye');
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch {}
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleLookup(manualInput);
    }
  };

  const resetScan = () => {
    setScannedOrder(null);
    setManualInput('');
    // Remove order param from URL
    navigate('/warehouse/scan', { replace: true });
  };

  const statusInfo = scannedOrder ? STATUS_INFO[scannedOrder.status] : null;
  const StatusIcon = statusInfo?.icon || Package;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/warehouse/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Dashboard
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Scan Order</h1>
            <p className="text-muted-foreground">Scan QR code or enter order ID</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => navigate('/')}>
          <Home className="h-4 w-4 mr-1" />
          Home
        </Button>
      </div>

      <div className="max-w-2xl mx-auto">
        {!scannedOrder ? (
          <>
            {/* Scan Mode Toggle */}
            <div className="flex gap-2 mb-6">
              <Button
                variant={scanMode === 'keyboard' ? 'default' : 'outline'}
                onClick={() => setScanMode('keyboard')}
                className="flex-1"
              >
                <Keyboard className="h-4 w-4 mr-2" />
                USB Scanner / Manual
              </Button>
              <Button
                variant={scanMode === 'camera' ? 'default' : 'outline'}
                onClick={() => setScanMode('camera')}
                className="flex-1"
              >
                <Camera className="h-4 w-4 mr-2" />
                Camera Scan
              </Button>
            </div>

            {/* Scanner Input */}
            {scanMode === 'keyboard' ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Keyboard className="h-5 w-5" />
                    USB Scanner / Manual Entry
                  </CardTitle>
                  <CardDescription>
                    Use a USB barcode scanner or type the order ID manually
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="orderInput">Order ID</Label>
                      <div className="flex gap-2">
                        <Input
                          ref={inputRef}
                          id="orderInput"
                          placeholder="Scan or type order ID..."
                          value={manualInput}
                          onChange={(e) => setManualInput(e.target.value)}
                          onKeyPress={handleKeyPress}
                          className="text-lg h-14 font-mono"
                          autoFocus
                          autoComplete="off"
                        />
                        <Button
                          onClick={() => handleLookup(manualInput)}
                          disabled={loading || !manualInput.trim()}
                          className="h-14 px-6"
                        >
                          {loading ? (
                            <RefreshCw className="h-5 w-5 animate-spin" />
                          ) : (
                            <Search className="h-5 w-5" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Tip: USB scanners work like a keyboard - just scan and it will auto-lookup
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    Camera Scanner
                  </CardTitle>
                  <CardDescription>
                    Point your camera at the QR code on the invoice
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div
                    id="qr-reader"
                    className="mx-auto"
                    style={{ maxWidth: '400px' }}
                  />
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          /* Order Details View */
          <div className="space-y-4">
            {/* Status Banner */}
            <Card className={`border-2 ${statusInfo?.color.includes('blue') ? 'border-blue-300' : statusInfo?.color.includes('yellow') ? 'border-yellow-300' : statusInfo?.color.includes('green') ? 'border-green-300' : 'border-gray-300'}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${statusInfo?.color || 'bg-gray-100'}`}>
                      <StatusIcon className="h-8 w-8" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Current Status</p>
                      <p className="text-2xl font-bold">{statusInfo?.label || scannedOrder.status}</p>
                    </div>
                  </div>
                  <Badge className={statusInfo?.color || ''} variant="outline">
                    {scannedOrder.order_no}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Order Info */}
            <Card>
              <CardHeader>
                <CardTitle>Order Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Customer</p>
                      <p className="font-medium">{scannedOrder.customer_name}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Phone className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{scannedOrder.customer_phone || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Order Date</p>
                      <p className="font-medium">
                        {new Date(scannedOrder.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Truck className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Delivery</p>
                      <p className="font-medium">
                        {scannedOrder.delivery_method === 'pickup' ? 'Self-Pickup' : 'Delivery'}
                      </p>
                    </div>
                  </div>
                </div>

                {scannedOrder.delivery_address && scannedOrder.delivery_method !== 'pickup' && (
                  <div className="flex items-start gap-2 pt-2 border-t">
                    <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Delivery Address</p>
                      <p className="font-medium">
                        {scannedOrder.delivery_address.address ||
                         `${scannedOrder.delivery_address.street}, ${scannedOrder.delivery_address.city}`}
                      </p>
                    </div>
                  </div>
                )}

                {/* Items */}
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground mb-2">Items ({scannedOrder.order_items?.length || 0})</p>
                  <div className="space-y-2">
                    {scannedOrder.order_items?.map(item => (
                      <div key={item.id} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                        <span>{item.component_name}</span>
                        <span className="font-medium">× {item.quantity}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center mt-3 pt-2 border-t font-bold">
                    <span>Total</span>
                    <span>RM {scannedOrder.total.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Card>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {statusInfo?.nextStatus && (
                    <Button
                      className="w-full h-14 text-lg"
                      onClick={() => handleStatusUpdate(statusInfo.nextStatus!)}
                      disabled={updating}
                    >
                      {updating ? (
                        <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                      ) : (
                        <ArrowRight className="h-5 w-5 mr-2" />
                      )}
                      {statusInfo.nextLabel}
                    </Button>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={resetScan}
                    >
                      <Package className="h-4 w-4 mr-2" />
                      Scan Another
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => navigate(`/admin/orders?invoice=${scannedOrder.id}`)}
                    >
                      <AlertCircle className="h-4 w-4 mr-2" />
                      View Invoice
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="mt-2">Looking up order...</p>
          </div>
        </div>
      )}
    </div>
  );
}
