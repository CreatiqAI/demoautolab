import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertTriangle,
  Package,
  RefreshCw,
  Search,
  AlertCircle,
  CheckCircle2,
  Clock,
  Bell,
  Users,
  Plus,
  Edit,
  Truck,
  Phone,
  Mail,
  MapPin,
  ShoppingCart,
  FileText,
  Building2
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

interface Supplier {
  id: string;
  name: string;
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  payment_terms: string;
  lead_time_days: number;
  minimum_order_amount: number;
  is_active: boolean;
  notes: string;
  created_at: string;
}

const InventoryAlerts = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const [activeTab, setActiveTab] = useState('alerts');
  const [supplierFormOpen, setSupplierFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [restockDialogOpen, setRestockDialogOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<InventoryAlert | null>(null);

  // Supplier form data
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    payment_terms: 'NET 30',
    lead_time_days: 7,
    minimum_order_amount: 0,
    notes: ''
  });

  // Restock form data
  const [restockForm, setRestockForm] = useState({
    quantity: 0,
    notes: ''
  });

  // Fetch inventory alerts
  const { data: alerts = [], isLoading: alertsLoading, refetch: refetchAlerts } = useQuery({
    queryKey: ['inventory-alerts', searchTerm, filterStatus],
    queryFn: async (): Promise<InventoryAlert[]> => {
      let query = supabase
        .from('active_stock_alerts_detailed')
        .select('*');

      // Apply filters
      if (searchTerm) {
        query = query.or(`component_name.ilike.%${searchTerm}%,component_sku.ilike.%${searchTerm}%`);
      }

      if (filterStatus !== 'all') {
        query = query.eq('alert_level', filterStatus);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching alerts:', error);
        throw error;
      }

      return data || [];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch suppliers
  const { data: suppliers = [], isLoading: suppliersLoading, refetch: refetchSuppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async (): Promise<Supplier[]> => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching suppliers:', error);
        throw error;
      }

      return data || [];
    },
  });

  // Create/Update supplier mutation
  const supplierMutation = useMutation({
    mutationFn: async (supplier: Partial<Supplier>) => {
      if (editingSupplier) {
        const { error } = await supabase
          .from('suppliers')
          .update(supplier)
          .eq('id', editingSupplier.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('suppliers')
          .insert([supplier]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setSupplierFormOpen(false);
      setEditingSupplier(null);
      resetSupplierForm();
      toast({
        title: "Success",
        description: `Supplier ${editingSupplier ? 'updated' : 'created'} successfully`,
      });
    },
    onError: (error) => {
      console.error('Supplier error:', error);
      toast({
        title: "Error",
        description: "Failed to save supplier",
        variant: "destructive",
      });
    },
  });

  // Create restock order mutation
  const restockMutation = useMutation({
    mutationFn: async ({ alert, quantity, notes }: { alert: InventoryAlert; quantity: number; notes: string }) => {
      // First, create the restock order
      const { data: orderNumber } = await supabase.rpc('generate_order_number');

      const { data: restockOrder, error: orderError } = await supabase
        .from('restock_orders')
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
        .from('restock_order_items')
        .insert([{
          restock_order_id: restockOrder.id,
          inventory_id: alert.inventory_id,
          quantity_ordered: quantity,
          unit_cost: alert.unit_cost,
          notes: `Restock for low stock alert: ${alert.message}`
        }]);

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
        description: `Restock order ${data.order_number} created successfully`,
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

  const resetSupplierForm = () => {
    setSupplierForm({
      name: '',
      company_name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      payment_terms: 'NET 30',
      lead_time_days: 7,
      minimum_order_amount: 0,
      notes: ''
    });
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setSupplierForm({
      name: supplier.name,
      company_name: supplier.company_name || '',
      contact_person: supplier.contact_person || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      city: supplier.city || '',
      payment_terms: supplier.payment_terms || 'NET 30',
      lead_time_days: supplier.lead_time_days || 7,
      minimum_order_amount: supplier.minimum_order_amount || 0,
      notes: supplier.notes || ''
    });
    setSupplierFormOpen(true);
  };

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
            Inventory Management
          </h1>
          <p className="text-gray-600 mt-1">Monitor stock levels and manage suppliers</p>
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
                <p className="text-sm text-gray-600">Active Suppliers</p>
                <p className="text-2xl font-bold text-gray-900">{suppliers.filter(s => s.is_active).length}</p>
              </div>
              <Building2 className="h-8 w-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="alerts">Stock Alerts</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
        </TabsList>

        {/* Stock Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
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
        </TabsContent>

        {/* Suppliers Tab */}
        <TabsContent value="suppliers" className="space-y-4">
          {/* Add Supplier Button */}
          <div className="flex justify-end">
            <Dialog open={supplierFormOpen} onOpenChange={setSupplierFormOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Supplier
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}</DialogTitle>
                  <DialogDescription>
                    {editingSupplier ? 'Update supplier information' : 'Create a new supplier for inventory restocking'}
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  supplierMutation.mutate(supplierForm);
                }} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Supplier Name *</Label>
                      <Input
                        id="name"
                        value={supplierForm.name}
                        onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="company_name">Company Name</Label>
                      <Input
                        id="company_name"
                        value={supplierForm.company_name}
                        onChange={(e) => setSupplierForm({ ...supplierForm, company_name: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="contact_person">Contact Person</Label>
                      <Input
                        id="contact_person"
                        value={supplierForm.contact_person}
                        onChange={(e) => setSupplierForm({ ...supplierForm, contact_person: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={supplierForm.email}
                        onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={supplierForm.phone}
                        onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={supplierForm.city}
                        onChange={(e) => setSupplierForm({ ...supplierForm, city: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={supplierForm.address}
                      onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="payment_terms">Payment Terms</Label>
                      <Select value={supplierForm.payment_terms} onValueChange={(value) => setSupplierForm({ ...supplierForm, payment_terms: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NET 15">NET 15</SelectItem>
                          <SelectItem value="NET 30">NET 30</SelectItem>
                          <SelectItem value="NET 45">NET 45</SelectItem>
                          <SelectItem value="COD">Cash on Delivery</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="lead_time_days">Lead Time (Days)</Label>
                      <Input
                        id="lead_time_days"
                        type="number"
                        value={supplierForm.lead_time_days}
                        onChange={(e) => setSupplierForm({ ...supplierForm, lead_time_days: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="minimum_order_amount">Min Order Amount (RM)</Label>
                      <Input
                        id="minimum_order_amount"
                        type="number"
                        step="0.01"
                        value={supplierForm.minimum_order_amount}
                        onChange={(e) => setSupplierForm({ ...supplierForm, minimum_order_amount: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={supplierForm.notes}
                      onChange={(e) => setSupplierForm({ ...supplierForm, notes: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setSupplierFormOpen(false);
                        setEditingSupplier(null);
                        resetSupplierForm();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={supplierMutation.isPending}>
                      {supplierMutation.isPending ? 'Saving...' : (editingSupplier ? 'Update' : 'Create')}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Suppliers List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliersLoading ? (
              <Card className="col-span-full">
                <CardContent className="p-8 text-center">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600">Loading suppliers...</p>
                </CardContent>
              </Card>
            ) : suppliers.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="p-8 text-center">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Suppliers Found</h3>
                  <p className="text-gray-600">Add your first supplier to get started.</p>
                </CardContent>
              </Card>
            ) : (
              suppliers.map((supplier) => (
                <Card key={supplier.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{supplier.name}</h3>
                        <p className="text-sm text-gray-600">{supplier.company_name}</p>
                      </div>
                      <Badge variant={supplier.is_active ? 'default' : 'secondary'}>
                        {supplier.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    <div className="space-y-2 text-sm">
                      {supplier.contact_person && (
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span>{supplier.contact_person}</span>
                        </div>
                      )}
                      {supplier.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span>{supplier.email}</span>
                        </div>
                      )}
                      {supplier.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span>{supplier.phone}</span>
                        </div>
                      )}
                      {supplier.city && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span>{supplier.city}</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-100 text-xs">
                      <div>
                        <span className="text-gray-500">Payment Terms:</span>
                        <p className="font-medium">{supplier.payment_terms}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Lead Time:</span>
                        <p className="font-medium">{supplier.lead_time_days} days</p>
                      </div>
                    </div>

                    {supplier.minimum_order_amount > 0 && (
                      <div className="mt-2 text-xs">
                        <span className="text-gray-500">Min Order:</span>
                        <span className="font-medium ml-1">{formatCurrency(supplier.minimum_order_amount)}</span>
                      </div>
                    )}

                    <div className="flex justify-end gap-2 mt-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditSupplier(supplier)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Restock Dialog */}
      <Dialog open={restockDialogOpen} onOpenChange={setRestockDialogOpen}>
        <DialogContent>
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