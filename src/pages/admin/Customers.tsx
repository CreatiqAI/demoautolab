import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Eye, Search, Edit, MapPin, ChevronDown, Users } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import type { Tables, Enums } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'> & {
  addresses: Tables<'addresses'>[];
  orders: Array<{ id: string; order_no: string; total: number; status: string; created_at: string }>;
};

const USER_ROLES: Array<{ value: Enums<'user_role'>; label: string }> = [
  { value: 'customer', label: 'Customer' },
  { value: 'merchant', label: 'Merchant' },
  { value: 'staff', label: 'Staff' },
  { value: 'admin', label: 'Admin' },
];

export default function Customers() {
  const [customers, setCustomers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<Profile | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();

  const [editForm, setEditForm] = useState({
    full_name: '',
    phone_e164: '',
    role: '' as Enums<'user_role'>,
    credit_limit: 0,
    is_phone_verified: false,
    whatsapp_opt_in: false
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          addresses(*),
          orders(id, order_no, total, status, created_at)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast({
        title: "Error",
        description: "Failed to fetch customers",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRoleChange = async (customerId: string, newRole: Enums<'user_role'>) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', customerId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Customer role updated to ${newRole}`
      });

      fetchCustomers();
    } catch (error: any) {
      console.error('Error updating customer role:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update customer role",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name,
          phone_e164: editForm.phone_e164,
          role: editForm.role,
          credit_limit: editForm.credit_limit,
          is_phone_verified: editForm.is_phone_verified,
          whatsapp_opt_in: editForm.whatsapp_opt_in
        })
        .eq('id', selectedCustomer.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Customer updated successfully"
      });

      setIsEditDialogOpen(false);
      fetchCustomers();
    } catch (error: any) {
      console.error('Error updating customer:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update customer",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (customer: Profile) => {
    setSelectedCustomer(customer);
    setEditForm({
      full_name: customer.full_name,
      phone_e164: customer.phone_e164,
      role: customer.role,
      credit_limit: customer.credit_limit || 0,
      is_phone_verified: customer.is_phone_verified || false,
      whatsapp_opt_in: customer.whatsapp_opt_in || false
    });
    setIsEditDialogOpen(true);
  };

  const openViewDialog = (customer: Profile) => {
    setSelectedCustomer(customer);
    setIsViewDialogOpen(true);
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = 
      customer.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone_e164.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'all' || customer.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getRoleBadgeVariant = (role: Enums<'user_role'>) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'staff':
        return 'default';
      case 'merchant':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getCustomerStats = (customer: Profile) => {
    const orders = customer.orders || [];
    return {
      totalOrders: orders.length,
      totalSpent: orders.reduce((sum, order) => sum + order.total, 0),
      lastOrderDate: orders.length > 0 ? orders[0].created_at : null
    };
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Customers</h2>
        <p className="text-muted-foreground">Manage customer accounts and information</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer Management</CardTitle>
          <CardDescription>
            View and manage all customer accounts
          </CardDescription>
          
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {USER_ROLES.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        
        <CardContent>
          {loading && customers.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Total Spent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      {searchTerm || roleFilter !== 'all' 
                        ? 'No customers found matching your criteria.' 
                        : 'No customers yet.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer) => {
                    const stats = getCustomerStats(customer);
                    return (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{customer.full_name}</div>
                            <div className="text-sm text-muted-foreground">
                              Joined {formatDate(customer.created_at)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div>{customer.phone_e164}</div>
                            <div className="flex items-center gap-1 mt-1">
                              {customer.is_phone_verified && (
                                <Badge variant="outline" className="text-xs">Verified</Badge>
                              )}
                              {customer.whatsapp_opt_in && (
                                <Badge variant="outline" className="text-xs">WhatsApp</Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                className="h-auto p-1 hover:bg-muted"
                                disabled={loading}
                              >
                                <Badge variant={getRoleBadgeVariant(customer.role)} className="cursor-pointer">
                                  <Users className="h-3 w-3 mr-1" />
                                  {customer.role.charAt(0).toUpperCase() + customer.role.slice(1)}
                                  <ChevronDown className="h-3 w-3 ml-1" />
                                </Badge>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="min-w-[120px]">
                              {USER_ROLES.map((role) => (
                                <DropdownMenuItem
                                  key={role.value}
                                  onClick={() => handleQuickRoleChange(customer.id, role.value)}
                                  disabled={customer.role === role.value || loading}
                                  className="cursor-pointer"
                                >
                                  <Badge 
                                    variant={getRoleBadgeVariant(role.value)} 
                                    className="text-xs"
                                  >
                                    {role.label}
                                  </Badge>
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                        <TableCell>{stats.totalOrders}</TableCell>
                        <TableCell>{formatCurrency(stats.totalSpent)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {customer.credit_limit && customer.credit_limit > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                Credit: {formatCurrency(customer.credit_limit)}
                              </Badge>
                            )}
                            {customer.addresses.length > 0 && (
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openViewDialog(customer)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(customer)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Customer Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
            <DialogDescription>
              Complete customer information and order history
            </DialogDescription>
          </DialogHeader>

          {selectedCustomer && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Personal Information</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Full Name:</span> {selectedCustomer.full_name}</div>
                    <div><span className="font-medium">Phone:</span> {selectedCustomer.phone_e164}</div>
                    <div><span className="font-medium">Role:</span> 
                      <Badge className="ml-2" variant={getRoleBadgeVariant(selectedCustomer.role)}>
                        {selectedCustomer.role.charAt(0).toUpperCase() + selectedCustomer.role.slice(1)}
                      </Badge>
                    </div>
                    <div><span className="font-medium">Joined:</span> {formatDate(selectedCustomer.created_at)}</div>
                    <div>
                      <span className="font-medium">Verification:</span>
                      <div className="flex gap-1 mt-1">
                        <Badge variant={selectedCustomer.is_phone_verified ? "default" : "secondary"}>
                          Phone {selectedCustomer.is_phone_verified ? 'Verified' : 'Not Verified'}
                        </Badge>
                        <Badge variant={selectedCustomer.whatsapp_opt_in ? "default" : "secondary"}>
                          WhatsApp {selectedCustomer.whatsapp_opt_in ? 'Opted In' : 'Opted Out'}
                        </Badge>
                      </div>
                    </div>
                    {selectedCustomer.credit_limit && selectedCustomer.credit_limit > 0 && (
                      <div><span className="font-medium">Credit Limit:</span> {formatCurrency(selectedCustomer.credit_limit)}</div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Order Summary</h4>
                  <div className="space-y-2 text-sm">
                    {(() => {
                      const stats = getCustomerStats(selectedCustomer);
                      return (
                        <>
                          <div><span className="font-medium">Total Orders:</span> {stats.totalOrders}</div>
                          <div><span className="font-medium">Total Spent:</span> {formatCurrency(stats.totalSpent)}</div>
                          {stats.lastOrderDate && (
                            <div><span className="font-medium">Last Order:</span> {formatDate(stats.lastOrderDate)}</div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {selectedCustomer.addresses.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Addresses</h4>
                  <div className="space-y-3">
                    {selectedCustomer.addresses.map((address) => (
                      <div key={address.id} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium">{address.label}</span>
                          {address.is_default && (
                            <Badge variant="outline" className="text-xs">Default</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <div>{address.line1}</div>
                          {address.line2 && <div>{address.line2}</div>}
                          <div>{address.city}, {address.state} {address.postcode}</div>
                          <div>{address.country}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedCustomer.orders.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Recent Orders</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedCustomer.orders.slice(0, 10).map((order) => (
                        <TableRow key={order.id}>
                          <TableCell>{order.order_no}</TableCell>
                          <TableCell>{formatDate(order.created_at)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {order.status.toLowerCase().replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(order.total)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Customer</DialogTitle>
            <DialogDescription>
              Update customer information and permissions
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateCustomer} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={editForm.full_name}
                onChange={(e) => setEditForm({...editForm, full_name: e.target.value})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone_e164">Phone</Label>
              <Input
                id="phone_e164"
                value={editForm.phone_e164}
                onChange={(e) => setEditForm({...editForm, phone_e164: e.target.value})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={editForm.role}
                onValueChange={(value) => setEditForm({...editForm, role: value as Enums<'user_role'>})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {USER_ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="credit_limit">Credit Limit</Label>
              <Input
                id="credit_limit"
                type="number"
                min="0"
                step="0.01"
                value={editForm.credit_limit}
                onChange={(e) => setEditForm({...editForm, credit_limit: parseFloat(e.target.value) || 0})}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_phone_verified"
                  checked={editForm.is_phone_verified}
                  onCheckedChange={(checked) => setEditForm({...editForm, is_phone_verified: checked})}
                />
                <Label htmlFor="is_phone_verified">Phone Verified</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="whatsapp_opt_in"
                  checked={editForm.whatsapp_opt_in}
                  onCheckedChange={(checked) => setEditForm({...editForm, whatsapp_opt_in: checked})}
                />
                <Label htmlFor="whatsapp_opt_in">WhatsApp Opt-in</Label>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Updating...' : 'Update Customer'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}