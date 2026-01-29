import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Eye, Search, Phone, Mail, Calendar, MapPin, User, Store, ShoppingCart, CheckCircle, XCircle, Clock, Building2, Briefcase, Package, FileText, Image, Link2, ExternalLink, UserCheck } from 'lucide-react';
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
  const { toast } = useToast();

  useEffect(() => {
    fetchCustomers();
    fetchMerchantApplications();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);

      // Query customer_profiles table with all customer data
      const { data, error } = await supabase
        .from('customer_profiles' as any)
        .select('*')
        .order('updated_at', { ascending: false});

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

      console.log('📋 Fetched registrations:', registrations);
      console.log('❌ Registration error:', regError);

      if (regError) {
        console.error('Error fetching registrations:', regError);
        throw regError;
      }

      if (!registrations || registrations.length === 0) {
        console.log('⚠️ No registrations found');
        setApplications([]);
        return;
      }

      console.log(`✅ Found ${registrations.length} registrations`);

      // Fetch customer profiles
      const customerIds = (registrations as any[]).map((r: any) => r.customer_id);
      console.log('👥 Fetching customers for IDs:', customerIds);

      const { data: customers, error: custError } = await supabase
        .from('customer_profiles' as any)
        .select('id, full_name, phone, email')
        .in('id', customerIds);

      console.log('👥 Customers data:', customers);
      console.log('❌ Customers error:', custError);

      if (custError) {
        console.error('Error fetching customers:', custError);
      }

      // Fetch merchant codes
      const codeIds = (registrations as any[]).map((r: any) => r.code_id);
      console.log('🎫 Fetching codes for IDs:', codeIds);

      const { data: codes, error: codeError } = await supabase
        .from('merchant_codes' as any)
        .select('id, code, description')
        .in('id', codeIds);

      console.log('🎫 Codes data:', codes);
      console.log('❌ Codes error:', codeError);

      if (codeError) {
        console.error('Error fetching codes:', codeError);
      }

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

      console.log('✨ Enriched applications:', enrichedApplications);
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Customer Type</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead>Type</TableHead>
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
                            <CustomerTypeManager
                              customer={customer as any}
                              onCustomerTypeUpdate={fetchCustomers}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="h-3 w-3" />
                              {formatDate(customer.updated_at)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {customer.customer_type || 'normal'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={customer.is_active ? "default" : "destructive"}>
                              {customer.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openViewDialog(customer)}
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
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
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
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
                      selectedCustomer.email || 'Not provided'
                    }</div>
                    <div><span className="font-medium">Phone:</span> {
                      selectedCustomer.phone || 'Not provided'
                    }</div>
                    <div><span className="font-medium">Customer Type:</span>
                      <Badge variant="outline" className="ml-2">
                        {selectedCustomer.customer_type || 'normal'}
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
                    <div><span className="font-medium">Last Updated:</span> {formatDate(selectedCustomer.updated_at)}</div>
                    <div><span className="font-medium">User ID:</span> {selectedCustomer.user_id || 'Not linked'}</div>
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
                    <div><span className="font-medium">Total Orders:</span> {orderStats.totalOrders}</div>
                    <div><span className="font-medium">Total Spent:</span> RM {orderStats.totalSpent.toFixed(2)}</div>
                    <div><span className="font-medium">Profile Created:</span> {
                      selectedCustomer.updated_at
                        ? Math.ceil((Date.now() - new Date(selectedCustomer.updated_at).getTime()) / (1000 * 60 * 60 * 24))
                        : 0
                    } days ago</div>
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
    </div>
  );
}