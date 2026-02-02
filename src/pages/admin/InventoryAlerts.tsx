import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertTriangle,
  Package,
  RefreshCw,
  Search,
  AlertCircle,
  CheckCircle2,
  Clock,
  Bell,
  ShoppingCart
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

interface InventoryAlert {
  id: string;
  inventory_id: string;
  component_sku: string;
  component_name: string;
  category_name: string;
  current_stock: number;
  min_stock_level: number;
  max_stock_level: number;
  reorder_point: number;
  unit_cost: number;
  location: string;
  supplier_name: string;
  supplier_company: string;
  supplier_lead_time: number;
  alert_type: 'low_stock' | 'out_of_stock' | 'reorder_suggestion';
  alert_level: 'info' | 'warning' | 'critical';
  message: string;
  suggested_action: string;
  suggested_reorder_quantity: number;
  suggested_reorder_cost: number;
  created_at: string;
}

const InventoryAlerts = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const [restockDialogOpen, setRestockDialogOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<InventoryAlert | null>(null);

  // Restock form data
  const [restockForm, setRestockForm] = useState({
    quantity: 0,
    notes: ''
  });

  // Fetch inventory alerts
  const { data: alerts = [], isLoading: alertsLoading, refetch: refetchAlerts } = useQuery({
    queryKey: ['inventory-alerts', searchTerm, filterStatus],
    queryFn: async (): Promise<InventoryAlert[]> => {
      // Query component_library directly and generate alerts on frontend
      let query = supabase
        .from('component_library' as any)
        .select('*')
        .eq('is_active', true);

      // Apply search filter
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,component_sku.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.order('stock_level', { ascending: true });

      if (error) {
        console.error('Error fetching alerts:', error);
        throw error;
      }

      // Generate alerts from components with low stock
      const allAlerts = (data || []).map((component: any) => {
        const minStock = component.min_stock_level || 10;
        const maxStock = component.max_stock_level || 100;
        const reorderPoint = component.reorder_point || 15;
        const currentStock = component.stock_level || 0;
        const suggestedQty = Math.max(0, maxStock - currentStock);

        let alertType: 'low_stock' | 'out_of_stock' | 'reorder_suggestion' = 'low_stock';
        let alertLevel: 'info' | 'warning' | 'critical' = 'info';
        let message = '';
        let suggestedAction = '';

        // Determine alert level and message
        if (currentStock === 0) {
          alertType = 'out_of_stock';
          alertLevel = 'critical';
          message = `OUT OF STOCK: ${component.name} (${component.component_sku})`;
          suggestedAction = `Create immediate restock order for ${maxStock} units`;
        } else if (currentStock <= minStock * 0.5) {
          alertType = 'low_stock';
          alertLevel = 'critical';
          message = `CRITICAL LOW STOCK: ${component.name} - Only ${currentStock} units remaining (Min: ${minStock})`;
          suggestedAction = `Urgent restock needed. Order ${suggestedQty} units`;
        } else if (currentStock < minStock) {
          alertType = 'low_stock';
          alertLevel = 'warning';
          message = `LOW STOCK: ${component.name} - ${currentStock} units (Min: ${minStock})`;
          suggestedAction = `Restock recommended. Order ${suggestedQty} units`;
        } else if (currentStock <= reorderPoint) {
          alertType = 'reorder_suggestion';
          alertLevel = 'info';
          message = `REORDER POINT: ${component.name} - ${currentStock} units (Reorder at: ${reorderPoint})`;
          suggestedAction = `Consider ordering ${suggestedQty} units`;
        } else {
          // Stock is good, skip this component
          return null;
        }

        return {
          id: component.id,
          inventory_id: component.id,
          component_sku: component.component_sku,
          component_name: component.name,
          category_name: component.component_type || 'General',
          current_stock: currentStock,
          min_stock_level: minStock,
          max_stock_level: maxStock,
          reorder_point: reorderPoint,
          unit_cost: component.merchant_price || 0,
          location: component.warehouse_location || 'Main Warehouse',
          supplier_name: 'Default Supplier',
          supplier_company: 'Auto Lab Supplies',
          supplier_lead_time: 7,
          alert_type: alertType,
          alert_level: alertLevel,
          message: message,
          suggested_action: suggestedAction,
          suggested_reorder_quantity: suggestedQty,
          suggested_reorder_cost: suggestedQty * (component.merchant_price || 0),
          created_at: component.updated_at || component.created_at
        };
      }).filter(alert => alert !== null);

      // Apply alert level filter
      const filteredAlerts = filterStatus === 'all'
        ? allAlerts
        : allAlerts.filter(alert => alert.alert_level === filterStatus);

      return filteredAlerts;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Create restock order mutation
  const restockMutation = useMutation({
    mutationFn: async ({ alert, quantity, notes }: { alert: InventoryAlert; quantity: number; notes: string }) => {
      // First, create the restock order
      const { data: orderNumber } = await (supabase.rpc as any)('generate_order_number');

      const { data: restockOrder, error: orderError } = await supabase
        .from('restock_orders' as any)
        .insert([{
          order_number: orderNumber,
          supplier_id: alert.inventory_id, // This should be the supplier ID from the inventory
          status: 'pending',
          total_amount: quantity * alert.unit_cost,
          notes: notes
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // Then create the order item
      const { error: itemError } = await supabase
        .from('restock_order_items' as any)
        .insert([{
          restock_order_id: (restockOrder as any).id,
          inventory_id: alert.inventory_id,
          quantity_ordered: quantity,
          unit_cost: alert.unit_cost,
          notes: `Restock for low stock alert: ${alert.message}`
        } as any]);

      if (itemError) throw itemError;

      return restockOrder;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inventory-alerts'] });
      setRestockDialogOpen(false);
      setSelectedAlert(null);
      setRestockForm({ quantity: 0, notes: '' });
      toast({
        title: "Success",
        description: `Restock order ${(data as any).order_number} created successfully`,
      });
    },
    onError: (error) => {
      console.error('Restock error:', error);
      toast({
        title: "Error",
        description: "Failed to create restock order",
        variant: "destructive",
      });
    },
  });

  const handleCreateRestock = (alert: InventoryAlert) => {
    setSelectedAlert(alert);
    setRestockForm({
      quantity: alert.suggested_reorder_quantity,
      notes: `Restock for: ${alert.component_name} (${alert.component_sku})`
    });
    setRestockDialogOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
    }).format(amount);
  };

  const getStatusConfig = (level: string) => {
    switch (level) {
      case 'critical':
        return {
          badge: 'destructive' as const,
          icon: AlertTriangle,
          color: 'text-red-600',
          bg: 'bg-red-50',
          border: 'border-red-200',
          label: 'Critical'
        };
      case 'warning':
        return {
          badge: 'secondary' as const,
          icon: AlertCircle,
          color: 'text-orange-600',
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          label: 'Warning'
        };
      case 'info':
        return {
          badge: 'outline' as const,
          icon: Clock,
          color: 'text-blue-600',
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          label: 'Info'
        };
      default:
        return {
          badge: 'secondary' as const,
          icon: Package,
          color: 'text-gray-600',
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          label: 'Unknown'
        };
    }
  };

  const criticalCount = alerts.filter(alert => alert.alert_level === 'critical').length;
  const warningCount = alerts.filter(alert => alert.alert_level === 'warning').length;
  const infoCount = alerts.filter(alert => alert.alert_level === 'info').length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="h-6 w-6 text-red-500" />
            Inventory Alerts
          </h1>
          <p className="text-gray-600 mt-1">Monitor stock levels and low inventory alerts</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => refetchAlerts()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Alert Summary */}
      {(criticalCount > 0 || warningCount > 0) && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Attention Required:</strong> {criticalCount} critical alerts and {warningCount} warnings need immediate attention.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Critical Stock</p>
                <p className="text-2xl font-bold text-red-600">{criticalCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Warnings</p>
                <p className="text-2xl font-bold text-orange-600">{warningCount}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Info Alerts</p>
                <p className="text-2xl font-bold text-blue-600">{infoCount}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Alerts</p>
                <p className="text-2xl font-bold text-gray-900">{alerts.length}</p>
              </div>
              <Package className="h-8 w-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stock Alerts Content */}
      <div className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by SKU or product name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex gap-2">
                  {(['all', 'critical', 'warning', 'info'] as const).map((status) => (
                    <Button
                      key={status}
                      variant={filterStatus === status ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilterStatus(status)}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Alerts List */}
          <div className="space-y-4">
            {alertsLoading ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600">Loading inventory alerts...</p>
                </CardContent>
              </Card>
            ) : alerts.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">All Stock Levels Good!</h3>
                  <p className="text-gray-600">No low stock alerts at the moment.</p>
                </CardContent>
              </Card>
            ) : (
              alerts.map((alert) => {
                const config = getStatusConfig(alert.alert_level);
                const IconComponent = config.icon;

                return (
                  <Card key={alert.id} className={`${config.border} ${config.bg}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg ${config.bg} border ${config.border} flex items-center justify-center`}>
                            <IconComponent className={`h-5 w-5 ${config.color}`} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{alert.component_name}</h3>
                            <p className="text-sm text-gray-600 font-mono">{alert.component_sku}</p>
                            <p className="text-xs text-gray-500">{alert.category_name} • {alert.location}</p>
                          </div>
                        </div>
                        <Badge variant={config.badge}>{config.label}</Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-gray-500">Current Stock</p>
                          <p className="font-semibold text-gray-900">{alert.current_stock} units</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Min Level</p>
                          <p className="font-semibold text-gray-900">{alert.min_stock_level} units</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Unit Cost</p>
                          <p className="font-semibold text-gray-900">{formatCurrency(alert.unit_cost)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Supplier</p>
                          <p className="font-semibold text-gray-900">{alert.supplier_name}</p>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg p-3 border border-gray-200 mb-4">
                        <p className="text-sm text-gray-800 mb-2">{alert.message}</p>
                        {alert.suggested_action && (
                          <p className="text-xs text-gray-600 italic">{alert.suggested_action}</p>
                        )}
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="text-xs text-gray-500">
                          Suggested Reorder: <span className="font-semibold">{alert.suggested_reorder_quantity} units</span> •
                          Est. Cost: <span className="font-semibold">{formatCurrency(alert.suggested_reorder_cost)}</span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCreateRestock(alert)}
                          >
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            Create Restock
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
      </div>

      {/* Restock Dialog */}
      <Dialog open={restockDialogOpen} onOpenChange={setRestockDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Restock Order</DialogTitle>
            <DialogDescription>
              Create a restock order for {selectedAlert?.component_name} ({selectedAlert?.component_sku})
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => {
            e.preventDefault();
            if (selectedAlert) {
              restockMutation.mutate({
                alert: selectedAlert,
                quantity: restockForm.quantity,
                notes: restockForm.notes
              });
            }
          }} className="space-y-4">
            <div>
              <Label htmlFor="quantity">Quantity to Order</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={restockForm.quantity}
                onChange={(e) => setRestockForm({ ...restockForm, quantity: parseInt(e.target.value) || 0 })}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Suggested: {selectedAlert?.suggested_reorder_quantity} units
              </p>
            </div>

            <div>
              <Label htmlFor="order_notes">Order Notes</Label>
              <Textarea
                id="order_notes"
                value={restockForm.notes}
                onChange={(e) => setRestockForm({ ...restockForm, notes: e.target.value })}
                rows={3}
              />
            </div>

            {selectedAlert && (
              <div className="bg-gray-50 p-3 rounded-lg space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Unit Cost:</span>
                  <span>{formatCurrency(selectedAlert.unit_cost)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total Cost:</span>
                  <span className="font-semibold">{formatCurrency(restockForm.quantity * selectedAlert.unit_cost)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Supplier:</span>
                  <span>{selectedAlert.supplier_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Expected Lead Time:</span>
                  <span>{selectedAlert.supplier_lead_time} days</span>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setRestockDialogOpen(false);
                  setSelectedAlert(null);
                  setRestockForm({ quantity: 0, notes: '' });
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={restockMutation.isPending}>
                {restockMutation.isPending ? 'Creating...' : 'Create Order'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InventoryAlerts;