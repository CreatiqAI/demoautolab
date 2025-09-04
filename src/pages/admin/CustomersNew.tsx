import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, Search, Phone, Mail, Calendar, MapPin, User, Store, ShoppingCart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CustomerTypeManager } from '@/components/admin/CustomerTypeManager';

interface CustomerProfile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  customer_type: 'normal' | 'merchant';
  pricing_type: string;
  date_of_birth: string | null;
  gender: string | null;
  address: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  auth_email: string | null;
  auth_phone: string | null;
  email_confirmed_at: string | null;
  phone_confirmed_at: string | null;
  registered_at: string;
  last_sign_in_at: string | null;
}

export default function Customers() {
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      
      // Query customer_list view with pricing info directly
      const { data, error } = await supabase
        .from('customer_list')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // customer_list view already includes auth data
      setCustomers(data || []);

    } catch (error: any) {
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

  const filteredCustomers = customers.filter(customer => {
    const searchLower = searchTerm.toLowerCase();
    return (
      customer.full_name?.toLowerCase().includes(searchLower) ||
      customer.email?.toLowerCase().includes(searchLower) ||
      customer.phone?.toLowerCase().includes(searchLower) ||
      customer.auth_email?.toLowerCase().includes(searchLower) ||
      customer.auth_phone?.toLowerCase().includes(searchLower)
    );
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const openViewDialog = (customer: CustomerProfile) => {
    setSelectedCustomer(customer);
    setIsViewDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Customers</h2>
        <p className="text-muted-foreground">Manage your customer base and their information</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer Directory</CardTitle>
          <CardDescription>
            All registered customers who use your automotive parts service
          </CardDescription>
          
          <div className="relative max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardHeader>
        
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Customer Type</TableHead>
                  <TableHead>Registration</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      {searchTerm ? 'No customers found matching your search.' : 'No customers registered yet.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-full">
                            <User className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium">{customer.full_name}</div>
                            <div className="text-sm text-muted-foreground">
                              ID: {customer.id.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {(customer.email || customer.auth_email) && (
                            <div className="flex items-center gap-1 text-sm">
                              <Mail className="h-3 w-3" />
                              {customer.email || customer.auth_email}
                            </div>
                          )}
                          {(customer.phone || customer.auth_phone) && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3" />
                              {customer.phone || customer.auth_phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <CustomerTypeManager 
                          customer={customer}
                          onCustomerTypeUpdate={fetchCustomers}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3" />
                          {formatDate(customer.registered_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDate(customer.last_sign_in_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={customer.is_active ? "default" : "destructive"}>
                          {customer.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openViewDialog(customer)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Customer Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
            <DialogDescription>
              Complete customer profile and information
            </DialogDescription>
          </DialogHeader>

          {selectedCustomer && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Personal Information</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Full Name:</span> {selectedCustomer.full_name}</div>
                    <div><span className="font-medium">Gender:</span> {selectedCustomer.gender || 'Not specified'}</div>
                    <div><span className="font-medium">Date of Birth:</span> {
                      selectedCustomer.date_of_birth 
                        ? formatDate(selectedCustomer.date_of_birth)
                        : 'Not provided'
                    }</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Contact Information</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Email:</span> {
                      selectedCustomer.email || selectedCustomer.auth_email || 'Not provided'
                    }</div>
                    <div><span className="font-medium">Phone:</span> {
                      selectedCustomer.phone || selectedCustomer.auth_phone || 'Not provided'
                    }</div>
                    <div><span className="font-medium">Verified:</span> 
                      <Badge variant="outline" className="ml-2">
                        {selectedCustomer.email_confirmed_at || selectedCustomer.phone_confirmed_at ? 'Verified' : 'Unverified'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {selectedCustomer.address && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Address
                  </h4>
                  <div className="text-sm bg-gray-50 p-3 rounded-lg">
                    {typeof selectedCustomer.address === 'object' ? (
                      <div>
                        {selectedCustomer.address.address && <div>{selectedCustomer.address.address}</div>}
                        {selectedCustomer.address.city && selectedCustomer.address.state && (
                          <div>{selectedCustomer.address.city}, {selectedCustomer.address.state} {selectedCustomer.address.postcode}</div>
                        )}
                      </div>
                    ) : (
                      <div>{selectedCustomer.address}</div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Account Information</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Registered:</span> {formatDate(selectedCustomer.registered_at)}</div>
                    <div><span className="font-medium">Last Login:</span> {formatDate(selectedCustomer.last_sign_in_at)}</div>
                    <div><span className="font-medium">Status:</span> 
                      <Badge variant={selectedCustomer.is_active ? "default" : "destructive"} className="ml-2">
                        {selectedCustomer.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Customer Metrics</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Total Orders:</span> 0</div>
                    <div><span className="font-medium">Total Spent:</span> RM 0.00</div>
                    <div><span className="font-medium">Customer Since:</span> {
                      Math.ceil((Date.now() - new Date(selectedCustomer.registered_at).getTime()) / (1000 * 60 * 60 * 24))
                    } days</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}