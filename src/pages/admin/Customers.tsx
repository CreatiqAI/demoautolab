import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Eye, Search, Phone, Mail, Calendar, MapPin, User, Store, ShoppingCart, CheckCircle, XCircle, Clock, Building2, Briefcase, Package, FileText, Image, Link2, ExternalLink, UserCheck, Car, Trash2, Ban, RotateCcw, AlertTriangle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { CustomerTypeManager } from '@/components/admin/CustomerTypeManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

interface CustomerProfile {
  id: string;
  user_id: string | null;
  full_name: string;
  phone: string | null;
  email: string | null;
  customer_type: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: any;
  preferences: any;
  is_active: boolean | null;
  updated_at: string | null;
  // Vehicle information
  car_make_id: string | null;
  car_make_name: string | null;
  car_model_id: string | null;
  car_model_name: string | null;
}

interface SocialMediaLink {
  platform: string;
  url: string;
}

interface Salesman {
  id: string;
  name: string;
  referral_code: string;
}

interface MerchantApplication {
  id: string;
  customer_id: string;
  code_id: string;
  company_name: string;
  business_registration_no: string | null;
  tax_id: string | null;
  business_type: string;
  address: string | null;
  status: string;
  created_at: string;
  rejection_reason: string | null;
  // New fields
  company_profile_url: string | null;
  social_media_links: SocialMediaLink[] | null;
  ssm_document_url: string | null;
  bank_proof_url: string | null;
  workshop_photos: string[] | null;
  referral_code: string | null;
  referred_by_salesman_id: string | null;
  customer_profiles: {
    full_name: string;
    phone: string | null;
    email: string | null;
  };
  merchant_codes: {
    code: string;
    description: string | null;
  };
  salesman?: Salesman | null;
}

export default function Customers() {
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [applications, setApplications] = useState<MerchantApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<MerchantApplication | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isApplicationDialogOpen, setIsApplicationDialogOpen] = useState(false);
  const [isOrdersDialogOpen, setIsOrdersDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderStats, setOrderStats] = useState({ totalOrders: 0, totalSpent: 0 });
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSuspendDialogOpen, setIsSuspendDialogOpen] = useState(false);
  const [customerToAction, setCustomerToAction] = useState<CustomerProfile | null>(null);
  const [merchantDetails, setMerchantDetails] = useState<MerchantApplication | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchCustomers();
    fetchMerchantApplications();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);

      // Use RPC function to bypass RLS
      const { data, error } = await supabase.rpc('get_all_customer_profiles');

      if (error) throw error;

      setCustomers((data as any) || []);

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

  const fetchMerchantApplications = async () => {
    try {
      // Fetch merchant registrations first
      const { data: registrations, error: regError } = await supabase
        .from('merchant_registrations' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (regError) {
        throw regError;
      }

      if (!registrations || registrations.length === 0) {
        setApplications([]);
        return;
      }

      // Fetch customer profiles using RPC to bypass RLS
      const customerIds = (registrations as any[]).map((r: any) => r.customer_id);

      const { data: customers, error: custError } = await supabase.rpc(
        'get_customer_profiles_by_ids',
        { customer_ids: customerIds }
      );

      // Fetch merchant codes
      const codeIds = (registrations as any[]).map((r: any) => r.code_id);

      const { data: codes, error: codeError } = await supabase
        .from('merchant_codes' as any)
        .select('id, code, description')
        .in('id', codeIds);

      // Fetch salesmen data for referrals
      const salesmanIds = (registrations as any[])
        .filter((r: any) => r.referred_by_salesman_id)
        .map((r: any) => r.referred_by_salesman_id);

      let salesmenData: any[] = [];
      if (salesmanIds.length > 0) {
        const { data: salesmen, error: salesmenError } = await supabase
          .from('salesmen' as any)
          .select('id, name, referral_code')
          .in('id', salesmanIds);

        if (!salesmenError && salesmen) {
          salesmenData = salesmen;
        }
      }

      // Manually join the data
      const enrichedApplications = (registrations as any[]).map((reg: any) => ({
        ...reg,
        customer_profiles: (customers as any)?.find((c: any) => c.id === (reg as any).customer_id) || {
          full_name: 'Unknown',
          phone: null,
          email: null
        },
        merchant_codes: (codes as any)?.find((mc: any) => mc.id === (reg as any).code_id) || {
          code: 'Unknown',
          description: null
        },
        salesman: salesmenData.find((s: any) => s.id === reg.referred_by_salesman_id) || null
      }));

      setApplications(enrichedApplications);
    } catch (error: any) {
      console.error('Error fetching applications:', error);
      toast({
        title: "Error",
        description: `Failed to fetch merchant applications: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const handleApproveApplication = async (applicationId: string) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('merchant_registrations' as any)
        .update({
          status: 'APPROVED',
          approved_at: new Date().toISOString()
        })
        .eq('id', applicationId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Merchant application approved successfully! Wallet created automatically.",
      });

      setIsApplicationDialogOpen(false);
      fetchMerchantApplications();
      fetchCustomers();
    } catch (error: any) {
      console.error('Error approving application:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to approve application",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRejectApplication = async (applicationId: string) => {
    if (!rejectionReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for rejection",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from('merchant_registrations' as any)
        .update({
          status: 'REJECTED',
          rejection_reason: rejectionReason
        })
        .eq('id', applicationId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Merchant application rejected",
      });

      setIsApplicationDialogOpen(false);
      setRejectionReason('');
      fetchMerchantApplications();
    } catch (error: any) {
      console.error('Error rejecting application:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to reject application",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const openApplicationDialog = (application: MerchantApplication) => {
    setSelectedApplication(application);
    setRejectionReason('');
    setIsApplicationDialogOpen(true);
  };

  const filteredCustomers = customers.filter(customer => {
    const searchLower = searchTerm.toLowerCase();
    return (
      customer.full_name?.toLowerCase().includes(searchLower) ||
      customer.email?.toLowerCase().includes(searchLower) ||
      customer.phone?.toLowerCase().includes(searchLower) ||
      customer.id?.toLowerCase().includes(searchLower)
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

  const openViewDialog = async (customer: CustomerProfile) => {
    setSelectedCustomer(customer);
    setIsViewDialogOpen(true);
    // Fetch order stats for this customer
    await fetchCustomerOrderStats(customer.id);
  };

  const fetchCustomerOrderStats = async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from('orders' as any)
        .select('total, status')
        .eq('customer_profile_id', customerId);

      if (error) throw error;

      const totalOrders = data?.length || 0;
      const totalSpent = data?.reduce((sum: number, order: any) => sum + (parseFloat(order.total) || 0), 0) || 0;

      setOrderStats({ totalOrders, totalSpent });
    } catch (error: any) {
      console.error('Error fetching order stats:', error);
    }
  };

  const openOrdersDialog = async (customer: CustomerProfile) => {
    setSelectedCustomer(customer);
    setIsOrdersDialogOpen(true);
    await fetchCustomerOrders(customer.id);
  };

  const fetchCustomerOrders = async (customerId: string) => {
    try {
      setLoadingOrders(true);

      // Fetch orders with order_items (component_library might not have all columns we need)
      const { data, error } = await supabase
        .from('orders' as any)
        .select(`
          *,
          order_items (
            id,
            component_id,
            component_sku,
            component_name,
            product_context,
            quantity,
            unit_price,
            total_price
          )
        `)
        .eq('customer_profile_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCustomerOrders(data || []);
    } catch (error: any) {
      console.error('Error fetching customer orders:', error);
      toast({
        title: 'Error',
        description: 'Failed to load customer orders',
        variant: 'destructive'
      });
    } finally {
      setLoadingOrders(false);
    }
  };

  // Fetch merchant details for a customer
  const fetchMerchantDetails = async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from('merchant_registrations' as any)
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!error && data) {
        // Fetch salesman info if available
        if (data.referred_by_salesman_id) {
          const { data: salesmanData } = await supabase
            .from('salesmen' as any)
            .select('id, name, referral_code')
            .eq('id', data.referred_by_salesman_id)
            .single();
          if (salesmanData) {
            data.salesman = salesmanData;
          }
        }
        setMerchantDetails(data);
      } else {
        setMerchantDetails(null);
      }
    } catch (error) {
      console.error('Error fetching merchant details:', error);
      setMerchantDetails(null);
    }
  };

  // Suspend customer account
  const handleSuspendCustomer = async () => {
    if (!customerToAction) return;

    try {
      const { error } = await supabase
        .from('customer_profiles' as any)
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', customerToAction.id);

      if (error) throw error;

      toast({
        title: 'Account Suspended',
        description: `${customerToAction.full_name}'s account has been suspended.`
      });

      setIsSuspendDialogOpen(false);
      setCustomerToAction(null);
      fetchCustomers();
    } catch (error: any) {
      console.error('Error suspending customer:', error);
      toast({
        title: 'Error',
        description: 'Failed to suspend account',
        variant: 'destructive'
      });
    }
  };

  // Reactivate customer account
  const handleReactivateCustomer = async (customer: CustomerProfile) => {
    try {
      const { error } = await supabase
        .from('customer_profiles' as any)
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', customer.id);

      if (error) throw error;

      toast({
        title: 'Account Reactivated',
        description: `${customer.full_name}'s account has been reactivated.`
      });

      fetchCustomers();
    } catch (error: any) {
      console.error('Error reactivating customer:', error);
      toast({
        title: 'Error',
        description: 'Failed to reactivate account',
        variant: 'destructive'
      });
    }
  };

  // Delete customer account
  const handleDeleteCustomer = async () => {
    if (!customerToAction) return;

    try {
      const { error } = await supabase
        .from('customer_profiles' as any)
        .delete()
        .eq('id', customerToAction.id);

      if (error) throw error;

      toast({
        title: 'Customer Deleted',
        description: `${customerToAction.full_name}'s account has been permanently deleted.`
      });

      setIsDeleteDialogOpen(false);
      setCustomerToAction(null);
      fetchCustomers();
    } catch (error: any) {
      console.error('Error deleting customer:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete customer',
        variant: 'destructive'
      });
    }
  };

  // Open view dialog with merchant details fetch
  const handleOpenViewDialog = async (customer: CustomerProfile) => {
    setSelectedCustomer(customer);
    setIsViewDialogOpen(true);
    await fetchCustomerOrderStats(customer.id);
    if (customer.customer_type === 'merchant') {
      await fetchMerchantDetails(customer.id);
    } else {
      setMerchantDetails(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Customers</h2>
        <p className="text-muted-foreground">Manage your customer base and their information</p>
      </div>

      <Tabs defaultValue="customers" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="customers" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Customers
          </TabsTrigger>
          <TabsTrigger value="applications" className="flex items-center gap-2 relative">
            <Store className="h-4 w-4" />
            Merchant Applications
            {applications.filter(app => app.status === 'PENDING').length > 0 && (
              <Badge variant="destructive" className="ml-2 px-2 py-0.5 text-xs">
                {applications.filter(app => app.status === 'PENDING').length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="customers">
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
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Customer Type</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          {searchTerm ? 'No customers found matching your search.' : 'No customers registered yet.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCustomers.map((customer) => (
                        <TableRow key={customer.id} className={!customer.is_active ? 'bg-red-50/50' : ''}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-full ${
                                customer.customer_type === 'merchant'
                                  ? 'bg-purple-100'
                                  : 'bg-blue-100'
                              }`}>
                                {customer.customer_type === 'merchant' ? (
                                  <Store className="h-4 w-4 text-purple-600" />
                                ) : (
                                  <User className="h-4 w-4 text-blue-600" />
                                )}
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
                              {customer.email && (
                                <div className="flex items-center gap-1 text-sm">
                                  <Mail className="h-3 w-3" />
                                  {customer.email}
                                </div>
                              )}
                              {customer.phone && (
                                <div className="flex items-center gap-1 text-sm">
                                  <Phone className="h-3 w-3" />
                                  {customer.phone}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {customer.customer_type === 'merchant' ? (
                              <Badge className="bg-purple-600 hover:bg-purple-700 text-white">
                                <Store className="h-3 w-3 mr-1" />
                                B2B Merchant
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50">
                                <User className="h-3 w-3 mr-1" />
                                B2C Customer
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="h-3 w-3" />
                              {formatDate(customer.updated_at)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {customer.is_active ? (
                              <Badge className="bg-green-100 text-green-700 border-green-300">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-300">
                                <Ban className="h-3 w-3 mr-1" />
                                Suspended
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenViewDialog(customer)}
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openOrdersDialog(customer)}
                                title="View Orders"
                              >
                                <ShoppingCart className="h-4 w-4" />
                              </Button>
                              {customer.is_active ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setCustomerToAction(customer);
                                    setIsSuspendDialogOpen(true);
                                  }}
                                  title="Suspend Account"
                                  className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                >
                                  <Ban className="h-4 w-4" />
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleReactivateCustomer(customer)}
                                  title="Reactivate Account"
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setCustomerToAction(customer);
                                  setIsDeleteDialogOpen(true);
                                }}
                                title="Delete Customer"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="applications">
          <Card>
            <CardHeader>
              <CardTitle>Merchant Applications</CardTitle>
              <CardDescription>
                Review and approve merchant registration requests
              </CardDescription>
            </CardHeader>

            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Applicant</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Business Type</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Applied Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applications.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          No merchant applications yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      applications.map((application) => (
                        <TableRow key={application.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{application.customer_profiles.full_name}</div>
                              <div className="text-sm text-muted-foreground">
                                {application.customer_profiles.phone}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{application.company_name}</div>
                              {application.business_registration_no && (
                                <div className="text-sm text-muted-foreground">
                                  {application.business_registration_no}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{application.business_type}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{application.merchant_codes.code}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {formatDate(application.created_at)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                application.status === 'APPROVED' ? 'default' :
                                application.status === 'REJECTED' ? 'destructive' :
                                'secondary'
                              }
                            >
                              {application.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openApplicationDialog(application)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Customer Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedCustomer?.customer_type === 'merchant' ? (
                <>
                  <Store className="h-5 w-5 text-purple-600" />
                  B2B Merchant Details
                </>
              ) : (
                <>
                  <User className="h-5 w-5 text-blue-600" />
                  B2C Customer Details
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              Complete profile information
            </DialogDescription>
          </DialogHeader>

          {selectedCustomer && (
            <div className="space-y-6">
              {/* Status Banner */}
              <div className={`p-4 rounded-lg flex items-center justify-between ${
                selectedCustomer.is_active
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    selectedCustomer.customer_type === 'merchant'
                      ? 'bg-purple-100'
                      : 'bg-blue-100'
                  }`}>
                    {selectedCustomer.customer_type === 'merchant' ? (
                      <Store className="h-6 w-6 text-purple-600" />
                    ) : (
                      <User className="h-6 w-6 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{selectedCustomer.full_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedCustomer.customer_type === 'merchant' ? 'B2B Merchant' : 'B2C Customer'}
                    </p>
                  </div>
                </div>
                {selectedCustomer.is_active ? (
                  <Badge className="bg-green-100 text-green-700 border-green-300">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-300">
                    <Ban className="h-3 w-3 mr-1" />
                    Suspended
                  </Badge>
                )}
              </div>

              {/* Basic Information Grid */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Personal Information
                  </h4>
                  <div className="space-y-2 text-sm bg-gray-50 p-3 rounded-lg">
                    <div><span className="font-medium">Full Name:</span> {selectedCustomer.full_name}</div>
                    <div><span className="font-medium">Date of Birth:</span> {
                      selectedCustomer.date_of_birth
                        ? new Date(selectedCustomer.date_of_birth).toLocaleDateString('en-MY', { year: 'numeric', month: 'long', day: 'numeric' })
                        : 'Not provided'
                    }</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Contact Information
                  </h4>
                  <div className="space-y-2 text-sm bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3 text-muted-foreground" />
                      {selectedCustomer.email || 'Not provided'}
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      {selectedCustomer.phone || 'Not provided'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Vehicle Information */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Car className="h-4 w-4" />
                  Vehicle Information
                </h4>
                {selectedCustomer.car_make_name ? (
                  <div className="text-sm bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-3">
                      <Car className="h-8 w-8 text-blue-600" />
                      <div>
                        <div className="font-semibold text-blue-900">
                          {selectedCustomer.car_make_name} {selectedCustomer.car_model_name}
                        </div>
                        <div className="text-xs text-blue-700">Current registered vehicle</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm bg-gray-50 p-4 rounded-lg text-muted-foreground italic">
                    No vehicle information registered
                  </div>
                )}
              </div>

              {/* Merchant-specific Information */}
              {selectedCustomer.customer_type === 'merchant' && merchantDetails && (
                <>
                  {/* Business Information */}
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2 text-purple-700">
                      <Building2 className="h-4 w-4" />
                      Business Information
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-purple-50 p-3 rounded-lg">
                        <div className="font-medium text-purple-900">Company Name</div>
                        <div>{merchantDetails.company_name}</div>
                      </div>
                      <div className="bg-purple-50 p-3 rounded-lg">
                        <div className="font-medium text-purple-900">Business Type</div>
                        <div>{merchantDetails.business_type}</div>
                      </div>
                      {merchantDetails.business_registration_no && (
                        <div className="bg-purple-50 p-3 rounded-lg">
                          <div className="font-medium text-purple-900">Business Reg No.</div>
                          <div>{merchantDetails.business_registration_no}</div>
                        </div>
                      )}
                      {merchantDetails.tax_id && (
                        <div className="bg-purple-50 p-3 rounded-lg">
                          <div className="font-medium text-purple-900">Tax ID</div>
                          <div>{merchantDetails.tax_id}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Referral Information */}
                  {(merchantDetails.referral_code || (merchantDetails as any).salesman) && (
                    <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                      <h4 className="font-semibold mb-2 flex items-center gap-2 text-green-800">
                        <UserCheck className="h-4 w-4" />
                        Referral Information
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {merchantDetails.referral_code && (
                          <div>
                            <div className="font-medium text-green-800">Referral Code Used</div>
                            <Badge variant="outline" className="mt-1">{merchantDetails.referral_code}</Badge>
                          </div>
                        )}
                        {(merchantDetails as any).salesman && (
                          <div>
                            <div className="font-medium text-green-800">Referred By</div>
                            <div className="mt-1">{(merchantDetails as any).salesman.name}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Documents */}
                  {(merchantDetails.ssm_document_url || merchantDetails.bank_proof_url) && (
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Uploaded Documents
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        {merchantDetails.ssm_document_url && (
                          <a
                            href={merchantDetails.ssm_document_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <FileText className="h-5 w-5 text-blue-600" />
                            <div>
                              <div className="font-medium text-sm">SSM Document</div>
                              <div className="text-xs text-muted-foreground">Click to view</div>
                            </div>
                            <ExternalLink className="h-4 w-4 ml-auto text-muted-foreground" />
                          </a>
                        )}
                        {merchantDetails.bank_proof_url && (
                          <a
                            href={merchantDetails.bank_proof_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <FileText className="h-5 w-5 text-green-600" />
                            <div>
                              <div className="font-medium text-sm">Bank Proof</div>
                              <div className="text-xs text-muted-foreground">Click to view</div>
                            </div>
                            <ExternalLink className="h-4 w-4 ml-auto text-muted-foreground" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Workshop Photos */}
                  {merchantDetails.workshop_photos && merchantDetails.workshop_photos.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Image className="h-4 w-4" />
                        Workshop Photos ({merchantDetails.workshop_photos.length})
                      </h4>
                      <div className="grid grid-cols-4 gap-2">
                        {merchantDetails.workshop_photos.map((photo: string, idx: number) => (
                          <a
                            key={idx}
                            href={photo}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="aspect-square rounded-lg overflow-hidden border hover:ring-2 ring-primary transition-all"
                          >
                            <img src={photo} alt={`Workshop ${idx + 1}`} className="w-full h-full object-cover" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Address */}
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

              {/* Account & Metrics */}
              <div className="grid grid-cols-2 gap-6 border-t pt-4">
                <div>
                  <h4 className="font-semibold mb-3">Account Information</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Last Updated:</span> {formatDate(selectedCustomer.updated_at)}</div>
                    <div><span className="font-medium">User ID:</span> <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">{selectedCustomer.user_id?.slice(0, 12) || 'Not linked'}...</code></div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Customer Metrics</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Total Orders:</span> <span className="font-bold text-primary">{orderStats.totalOrders}</span></div>
                    <div><span className="font-medium">Total Spent:</span> <span className="font-bold text-green-600">RM {orderStats.totalSpent.toFixed(2)}</span></div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() => {
                      setIsViewDialogOpen(false);
                      openOrdersDialog(selectedCustomer);
                    }}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    View Order History
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Merchant Application Review Dialog */}
      <Dialog open={isApplicationDialogOpen} onOpenChange={setIsApplicationDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Merchant Application Review</DialogTitle>
            <DialogDescription>
              Review business details and approve or reject the merchant application
            </DialogDescription>
          </DialogHeader>

          {selectedApplication && (
            <div className="space-y-6">
              {/* Status Header */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-semibold text-lg">Application Status</h4>
                  <p className="text-sm text-muted-foreground">
                    Submitted on {formatDate(selectedApplication.created_at)}
                  </p>
                </div>
                <Badge
                  variant={
                    selectedApplication.status === 'APPROVED' ? 'default' :
                    selectedApplication.status === 'REJECTED' ? 'destructive' :
                    'secondary'
                  }
                  className="text-lg px-4 py-2"
                >
                  {selectedApplication.status === 'PENDING' && <Clock className="h-4 w-4 mr-2" />}
                  {selectedApplication.status === 'APPROVED' && <CheckCircle className="h-4 w-4 mr-2" />}
                  {selectedApplication.status === 'REJECTED' && <XCircle className="h-4 w-4 mr-2" />}
                  {selectedApplication.status}
                </Badge>
              </div>

              {/* Applicant Information */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Applicant Details
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Name:</span> {selectedApplication.customer_profiles.full_name}</div>
                    <div><span className="font-medium">Email:</span> {selectedApplication.customer_profiles.email || 'Not provided'}</div>
                    <div><span className="font-medium">Phone:</span> {selectedApplication.customer_profiles.phone || 'Not provided'}</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Business Details
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Company Name:</span> {selectedApplication.company_name}</div>
                    <div><span className="font-medium">Business Type:</span> {selectedApplication.business_type}</div>
                    <div><span className="font-medium">Registration Code Used:</span>
                      <Badge variant="outline" className="ml-2">
                        {selectedApplication.merchant_codes.code}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Registration Details */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Registration Information
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Business Registration No:</span>
                    <div className="mt-1 text-muted-foreground">
                      {selectedApplication.business_registration_no || 'Not provided'}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Tax ID:</span>
                    <div className="mt-1 text-muted-foreground">
                      {selectedApplication.tax_id || 'Not provided'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Business Address */}
              {selectedApplication.address && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Business Address
                  </h4>
                  <div className="text-sm bg-gray-50 p-3 rounded-lg">
                    {selectedApplication.address}
                  </div>
                </div>
              )}

              {/* Company Profile & Social Media */}
              {(selectedApplication.company_profile_url || (selectedApplication.social_media_links && selectedApplication.social_media_links.length > 0)) && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    Online Presence
                  </h4>
                  <div className="space-y-2 text-sm">
                    {selectedApplication.company_profile_url && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Company Profile:</span>
                        <a
                          href={selectedApplication.company_profile_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1"
                        >
                          {selectedApplication.company_profile_url.slice(0, 40)}...
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                    {selectedApplication.social_media_links && selectedApplication.social_media_links.length > 0 && (
                      <div>
                        <span className="font-medium">Social Media:</span>
                        <div className="mt-1 space-y-1">
                          {selectedApplication.social_media_links.map((link, idx) => (
                            <a
                              key={idx}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-blue-600 hover:underline ml-2"
                            >
                              <Badge variant="outline" className="text-xs">{link.platform}</Badge>
                              {link.url.slice(0, 35)}...
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Documents */}
              {(selectedApplication.ssm_document_url || selectedApplication.bank_proof_url) && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Uploaded Documents
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedApplication.ssm_document_url && (
                      <div className="p-3 border rounded-lg">
                        <div className="text-sm font-medium mb-2">SSM Document</div>
                        <a
                          href={selectedApplication.ssm_document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 text-sm"
                        >
                          <FileText className="h-4 w-4" />
                          View Document
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                    {selectedApplication.bank_proof_url && (
                      <div className="p-3 border rounded-lg">
                        <div className="text-sm font-medium mb-2">Bank Proof</div>
                        <a
                          href={selectedApplication.bank_proof_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 text-sm"
                        >
                          <FileText className="h-4 w-4" />
                          View Document
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Workshop Photos */}
              {selectedApplication.workshop_photos && selectedApplication.workshop_photos.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    Workshop Photos ({selectedApplication.workshop_photos.length})
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    {selectedApplication.workshop_photos.map((photo, idx) => (
                      <a
                        key={idx}
                        href={photo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative aspect-video rounded-lg overflow-hidden border hover:ring-2 ring-blue-500 transition-all"
                      >
                        <img
                          src={photo}
                          alt={`Workshop photo ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center">
                          <ExternalLink className="h-6 w-6 text-white opacity-0 hover:opacity-100" />
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Referral Information */}
              {(selectedApplication.referral_code || selectedApplication.salesman) && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-semibold mb-3 flex items-center gap-2 text-green-900">
                    <UserCheck className="h-4 w-4" />
                    Referral Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    {selectedApplication.referral_code && (
                      <div>
                        <span className="font-medium text-green-800">Referral Code Used:</span>
                        <Badge variant="outline" className="ml-2 bg-white">
                          {selectedApplication.referral_code}
                        </Badge>
                      </div>
                    )}
                    {selectedApplication.salesman && (
                      <div>
                        <span className="font-medium text-green-800">Referred By:</span>
                        <span className="ml-2">{selectedApplication.salesman.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Code Description */}
              {selectedApplication.merchant_codes.description && (
                <div>
                  <h4 className="font-semibold mb-2">Registration Code Details</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedApplication.merchant_codes.description}
                  </p>
                </div>
              )}

              {/* Rejection Reason (if rejected) */}
              {selectedApplication.status === 'REJECTED' && selectedApplication.rejection_reason && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="font-semibold mb-2 text-red-900">Rejection Reason</h4>
                  <p className="text-sm text-red-800">{selectedApplication.rejection_reason}</p>
                </div>
              )}

              {/* Rejection Reason Input (for pending applications) */}
              {selectedApplication.status === 'PENDING' && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Rejection Reason (optional)</h4>
                  <Textarea
                    placeholder="Provide a reason if rejecting this application..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="min-h-[100px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    This field is required if you choose to reject the application.
                  </p>
                </div>
              )}
            </div>
          )}

          {selectedApplication && selectedApplication.status === 'PENDING' && (
            <DialogFooter className="flex gap-2">
              <Button
                variant="destructive"
                onClick={() => handleRejectApplication(selectedApplication.id)}
                disabled={loading}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject Application
              </Button>
              <Button
                variant="default"
                onClick={() => handleApproveApplication(selectedApplication.id)}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve Application
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Customer Order History Dialog */}
      <Dialog open={isOrdersDialogOpen} onOpenChange={setIsOrdersDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Order History
            </DialogTitle>
            <DialogDescription>
              {selectedCustomer?.full_name}'s purchase history
            </DialogDescription>
          </DialogHeader>

          {loadingOrders ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : customerOrders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Orders Yet</h3>
              <p className="text-gray-600">This customer hasn't placed any orders.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{customerOrders.length}</div>
                  <div className="text-sm text-gray-600">Total Orders</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    RM {customerOrders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0).toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600">Total Spent</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    RM {(customerOrders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0) / customerOrders.length).toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600">Average Order Value</div>
                </div>
              </div>

              {/* Orders List */}
              <div className="space-y-3">
                {customerOrders.map((order) => (
                  <Card key={order.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-lg">Order #{order.order_no}</span>
                            <Badge variant={
                              order.status === 'COMPLETED' ? 'default' :
                              order.status === 'PENDING_PAYMENT' || order.status === 'PENDING' ? 'secondary' :
                              order.status === 'PROCESSING' ? 'outline' :
                              order.status === 'CANCELLED' ? 'destructive' : 'outline'
                            }>
                              {order.status?.replace('_', ' ')}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(order.created_at)}
                            </span>
                            <span>
                              {order.order_items?.length || 0} item(s)
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-900">
                            RM {parseFloat(order.total || 0).toFixed(2)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {order.payment_state === 'PAID' ? (
                              <span className="text-green-600 flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Paid
                              </span>
                            ) : (
                              <span className="text-orange-600 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {order.payment_state || 'Unpaid'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Order Items */}
                      {order.order_items && order.order_items.length > 0 && (
                        <div className="border-t pt-3 mt-3">
                          <h5 className="text-sm font-semibold mb-2">Items:</h5>
                          <div className="space-y-2">
                            {order.order_items.map((item: any) => (
                              <div key={item.id} className="flex items-center gap-3 text-sm">
                                <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center flex-shrink-0">
                                  <Package className="h-6 w-6 text-gray-400" />
                                </div>
                                <div className="flex-1">
                                  <div className="font-medium">
                                    {item.component_name}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    SKU: {item.component_sku}
                                  </div>
                                  {item.product_context && (
                                    <div className="text-xs text-muted-foreground">
                                      Context: {item.product_context}
                                    </div>
                                  )}
                                  <div className="text-sm text-muted-foreground mt-1">
                                    Qty: {item.quantity} × RM {parseFloat(item.unit_price || 0).toFixed(2)}
                                  </div>
                                </div>
                                <div className="font-semibold">
                                  RM {parseFloat(item.total_price || 0).toFixed(2)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Delivery Address */}
                      {order.delivery_address && (
                        <div className="border-t pt-3 mt-3">
                          <h5 className="text-sm font-semibold mb-2 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            Delivery Address:
                          </h5>
                          <div className="text-sm text-muted-foreground bg-gray-50 p-2 rounded">
                            {typeof order.delivery_address === 'object' ? (
                              <>
                                {order.delivery_address.address && <div>{order.delivery_address.address}</div>}
                                {order.delivery_address.city && (
                                  <div>
                                    {order.delivery_address.city}, {order.delivery_address.state} {order.delivery_address.postcode}
                                  </div>
                                )}
                              </>
                            ) : (
                              <div>{order.delivery_address}</div>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Suspend Confirmation Dialog */}
      <AlertDialog open={isSuspendDialogOpen} onOpenChange={setIsSuspendDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
              Suspend Customer Account
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to suspend <strong>{customerToAction?.full_name}</strong>'s account?
              <br /><br />
              This will prevent the customer from:
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>Logging into their account</li>
                <li>Placing new orders</li>
                <li>Accessing their profile</li>
              </ul>
              <br />
              You can reactivate the account later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCustomerToAction(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSuspendCustomer}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <Ban className="h-4 w-4 mr-2" />
              Suspend Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete Customer Permanently
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete <strong>{customerToAction?.full_name}</strong>'s account?
              <br /><br />
              <span className="text-red-600 font-semibold">This action cannot be undone.</span> All customer data including:
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>Profile information</li>
                <li>Order history</li>
                <li>Points and rewards</li>
                <li>Saved vehicles and preferences</li>
              </ul>
              <br />
              will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCustomerToAction(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCustomer}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}