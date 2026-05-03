import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Eye, Search, Phone, Mail, Calendar, MapPin, User, Store, ShoppingCart, CheckCircle, XCircle, Clock, Building2, Briefcase, Package, FileText, Image, Link2, ExternalLink, UserCheck, Car, Trash2, Ban, RotateCcw, AlertTriangle, Sparkles, Plus, Loader2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  is_panel_customer: boolean | null;
  last_sign_in_at: string | null;
  demoted_at: string | null;
  demoted_from: string | null;
  demotion_reason: string | null;
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
  payment_slip_url: string | null;
  referral_code: string | null;
  referred_by_salesman_id: string | null;
  customer_profiles: {
    full_name: string;
    phone: string | null;
    email: string | null;
  };
  salesman?: Salesman | null;
}

export default function Customers() {
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [applications, setApplications] = useState<MerchantApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [customerTypeFilter, setCustomerTypeFilter] = useState<'all' | 'b2b' | 'b2c'>('all');
  // Sheet drawer (replaces the centered View Details Dialog)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'overview' | 'orders'>('overview');
  const [drawerOrders, setDrawerOrders] = useState<any[]>([]);
  const [drawerOrdersLoading, setDrawerOrdersLoading] = useState(false);
  // Order history filter: 'all' or 'YYYY' or 'YYYY-MM'
  const [orderHistoryPeriod, setOrderHistoryPeriod] = useState<string>('all');
  // Subscription editor for B2B
  const [subEndDateInput, setSubEndDateInput] = useState<string>('');
  const [subSaving, setSubSaving] = useState(false);
  // Demote-to-B2C confirmation
  const [demoteOpen, setDemoteOpen] = useState(false);
  const [demoteReason, setDemoteReason] = useState('');
  const [demoting, setDemoting] = useState(false);
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
        salesman: salesmenData.find((s: any) => s.id === reg.referred_by_salesman_id) || null
      }));

      setApplications(enrichedApplications);
    } catch (error: any) {
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

      // Find the application to get customer_id and company_name
      const application = applications.find(a => a.id === applicationId);
      if (!application) throw new Error('Application not found');

      // 1. Update merchant_registrations status to APPROVED
      const { error } = await supabase
        .from('merchant_registrations' as any)
        .update({
          status: 'APPROVED',
          approved_at: new Date().toISOString()
        })
        .eq('id', applicationId);

      if (error) throw error;

      // 2. Auto-create Professional plan subscription
      const now = new Date();
      const oneYearLater = new Date(now);
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

      try {
        // Check if partnership already exists
        const { data: existingPartnership } = await supabase
          .from('premium_partnerships' as any)
          .select('id')
          .eq('merchant_id', application.customer_id)
          .maybeSingle();

        if (!existingPartnership) {
          const { error: partnershipError } = await supabase
            .from('premium_partnerships' as any)
            .insert([{
              merchant_id: application.customer_id,
              business_name: application.company_name || '',
              business_registration_no: application.business_registration_no || '',
              business_type: application.business_type || '',
              contact_person: application.customer_profiles?.full_name || '',
              contact_phone: application.customer_profiles?.phone || '',
              contact_email: application.customer_profiles?.email || '',
              address: application.address || '',
              subscription_plan: 'professional',
              yearly_fee: 99,
              subscription_status: 'ACTIVE',
              admin_approved: true,
              subscription_start_date: now.toISOString(),
              subscription_end_date: oneYearLater.toISOString(),
            }]);

          if (partnershipError) {
          }
        }
      } catch (partnershipErr) {
      }

      // 3. Auto-create RM50 Welcome Voucher for this merchant
      try {
        // Check if welcome voucher already exists for this merchant
        const welcomeCode = `WELCOME-${application.customer_id.substring(0, 8).toUpperCase()}`;
        const { data: existingVoucher } = await supabase
          .from('vouchers' as any)
          .select('id')
          .eq('code', welcomeCode)
          .single();

        if (!existingVoucher) {
          const { error: voucherError } = await supabase
            .from('vouchers' as any)
            .insert([{
              code: welcomeCode,
              name: 'RM50 Merchant Welcome Voucher',
              description: 'Welcome voucher for newly approved merchant. RM50 off your purchase.',
              discount_type: 'FIXED_AMOUNT',
              discount_value: 50,
              max_discount_amount: null,
              min_purchase_amount: 0,
              max_usage_total: null, // No total limit
              max_usage_per_user: 1, // One use per merchant
              customer_type_restriction: 'MERCHANT',
              valid_from: now.toISOString(),
              valid_until: null, // No expiry
              is_active: true,
              admin_notes: `Auto-generated welcome voucher for merchant ${application.customer_profiles?.full_name || application.customer_id}`,
            }]);

          if (voucherError) {
          }
        }
      } catch (voucherErr) {
      }

      toast({
        title: "Success",
        description: "Merchant approved! Professional plan activated & RM50 Welcome Voucher created.",
      });

      setIsApplicationDialogOpen(false);
      fetchMerchantApplications();
      fetchCustomers();
    } catch (error: any) {
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
    if (customerTypeFilter === 'b2b' && customer.customer_type !== 'merchant') return false;
    if (customerTypeFilter === 'b2c' && customer.customer_type === 'merchant') return false;
    const searchLower = searchTerm.toLowerCase();
    return (
      customer.full_name?.toLowerCase().includes(searchLower) ||
      customer.email?.toLowerCase().includes(searchLower) ||
      customer.phone?.toLowerCase().includes(searchLower) ||
      customer.id?.toLowerCase().includes(searchLower)
    );
  });

  const getSubscriptionInfo = (customer: CustomerProfile) => {
    if (customer.customer_type !== 'merchant' || !customer.subscription_end_date) return null;
    const now = Date.now();
    const end = new Date(customer.subscription_end_date).getTime();
    const daysRemaining = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    let status: 'active' | 'expiring' | 'expired';
    if (daysRemaining < 0) status = 'expired';
    else if (daysRemaining <= 30) status = 'expiring';
    else status = 'active';
    return { daysRemaining, status };
  };

  const formatDateShort = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };


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

  const openDrawer = async (customer: CustomerProfile) => {
    setSelectedCustomer(customer);
    setDrawerTab('overview');
    setIsDrawerOpen(true);
    setOrderHistoryPeriod('all');
    setDrawerOrders([]);
    setSubEndDateInput(customer.subscription_end_date ? customer.subscription_end_date.slice(0, 10) : '');
    void fetchCustomerOrderStats(customer.id);
    void fetchDrawerOrders(customer.id);
    if (customer.customer_type === 'merchant') {
      const { data: app } = await supabase
        .from('merchant_registrations' as any)
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })
        .maybeSingle();
      setMerchantDetails(app as any);
    } else {
      setMerchantDetails(null);
    }
  };

  const fetchDrawerOrders = async (customerId: string) => {
    setDrawerOrdersLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders' as any)
        .select('id, order_no, total, status, created_at, delivery_method')
        .eq('customer_profile_id', customerId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setDrawerOrders((data as any[] | null) ?? []);
    } catch {
      setDrawerOrders([]);
    } finally {
      setDrawerOrdersLoading(false);
    }
  };

  // Update one customer in local list state without refetching
  const patchCustomer = (id: string, patch: Partial<CustomerProfile>) => {
    setCustomers(prev => prev.map(c => (c.id === id ? { ...c, ...patch } as CustomerProfile : c)));
    setSelectedCustomer(prev => (prev && prev.id === id ? { ...prev, ...patch } as CustomerProfile : prev));
  };

  const extendSubscription = async (customer: CustomerProfile, years: number) => {
    setSubSaving(true);
    try {
      const base = customer.subscription_end_date && new Date(customer.subscription_end_date) > new Date()
        ? new Date(customer.subscription_end_date)
        : new Date();
      const newEnd = new Date(base);
      newEnd.setFullYear(newEnd.getFullYear() + years);
      const startToSet = customer.subscription_start_date ?? new Date().toISOString();
      const { error } = await supabase
        .from('customer_profiles' as any)
        .update({ subscription_end_date: newEnd.toISOString(), subscription_start_date: startToSet } as any)
        .eq('id', customer.id);
      if (error) throw error;
      patchCustomer(customer.id, { subscription_end_date: newEnd.toISOString(), subscription_start_date: startToSet });
      setSubEndDateInput(newEnd.toISOString().slice(0, 10));
      toast({ title: 'Subscription extended', description: `New expiry: ${newEnd.toLocaleDateString('en-MY')}` });
    } catch (err: any) {
      toast({ title: 'Failed to extend', description: err?.message ?? 'Unknown error', variant: 'destructive' });
    } finally {
      setSubSaving(false);
    }
  };

  const setSubscriptionEnd = async (customer: CustomerProfile, dateInput: string) => {
    if (!dateInput) return;
    setSubSaving(true);
    try {
      const newEnd = new Date(`${dateInput}T23:59:59`).toISOString();
      const startToSet = customer.subscription_start_date ?? new Date().toISOString();
      const { error } = await supabase
        .from('customer_profiles' as any)
        .update({ subscription_end_date: newEnd, subscription_start_date: startToSet } as any)
        .eq('id', customer.id);
      if (error) throw error;
      patchCustomer(customer.id, { subscription_end_date: newEnd, subscription_start_date: startToSet });
      toast({ title: 'Subscription updated' });
    } catch (err: any) {
      toast({ title: 'Failed to update', description: err?.message ?? 'Unknown error', variant: 'destructive' });
    } finally {
      setSubSaving(false);
    }
  };

  const togglePanel = async (customer: CustomerProfile, value: boolean) => {
    try {
      const { error } = await supabase
        .from('customer_profiles' as any)
        .update({ is_panel_customer: value } as any)
        .eq('id', customer.id);
      if (error) throw error;
      patchCustomer(customer.id, { is_panel_customer: value });

      // Sync premium_partnerships so the customer appears (or disappears)
      // in the admin/premium-partners listing. The Customers drawer is the
      // single source of truth for the panel flag — premium_partnerships is
      // the listing's data source.
      if (value) {
        const { data: existing } = await supabase
          .from('premium_partnerships' as any)
          .select('id')
          .eq('merchant_id', customer.id)
          .maybeSingle();
        if (existing) {
          await supabase
            .from('premium_partnerships' as any)
            .update({
              subscription_status: 'ACTIVE',
              subscription_plan: 'panel',
              admin_approved: true,
              approved_at: new Date().toISOString(),
            } as any)
            .eq('id', (existing as any).id);
        } else {
          await supabase
            .from('premium_partnerships' as any)
            .insert({
              merchant_id: customer.id,
              business_name: merchantDetails?.company_name || customer.full_name || 'Untitled',
              business_registration_no: merchantDetails?.business_registration_no || null,
              business_type: merchantDetails?.business_type || null,
              contact_person: customer.full_name,
              contact_phone: customer.phone,
              contact_email: customer.email,
              address: merchantDetails?.address || null,
              subscription_status: 'ACTIVE',
              subscription_plan: 'panel',
              admin_approved: true,
              approved_at: new Date().toISOString(),
              is_admin_invited: true,
            } as any);
        }
      } else {
        await supabase
          .from('premium_partnerships' as any)
          .update({ subscription_status: 'INACTIVE' } as any)
          .eq('merchant_id', customer.id);
      }

      toast({
        title: value ? 'Promoted to Panel' : 'Removed from Panel',
        description: value
          ? 'Now visible in admin/premium-partners listing.'
          : 'Hidden from premium-partners listing (record kept).',
        variant: 'success',
      });
    } catch (err: any) {
      toast({ title: 'Failed', description: err?.message ?? 'Unknown error', variant: 'destructive' });
    }
  };

  const demoteToB2C = async () => {
    if (!selectedCustomer) return;
    setDemoting(true);
    try {
      const { error } = await supabase
        .from('customer_profiles' as any)
        .update({
          customer_type: 'normal',
          pricing_type: 'retail',
          demoted_at: new Date().toISOString(),
          demoted_from: selectedCustomer.customer_type ?? 'merchant',
          demotion_reason: demoteReason || null,
          // Keep subscription_start_date and subscription_end_date as
          // historical record. Clear is_panel_customer since they're no
          // longer a B2B account.
          is_panel_customer: false,
        } as any)
        .eq('id', selectedCustomer.id);
      if (error) throw error;

      // Also deactivate any premium_partnerships row
      await supabase
        .from('premium_partnerships' as any)
        .update({ subscription_status: 'INACTIVE' } as any)
        .eq('merchant_id', selectedCustomer.id);

      patchCustomer(selectedCustomer.id, {
        customer_type: 'normal',
        is_panel_customer: false,
        demoted_at: new Date().toISOString(),
        demoted_from: selectedCustomer.customer_type ?? 'merchant',
        demotion_reason: demoteReason || null,
      });
      toast({ title: 'Demoted to B2C', description: 'Customer is now a normal account.', variant: 'success' });
      setDemoteOpen(false);
      setDemoteReason('');
      setIsDrawerOpen(false);
    } catch (err: any) {
      toast({ title: 'Failed to demote', description: err?.message ?? 'Unknown error', variant: 'destructive' });
    } finally {
      setDemoting(false);
    }
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
      setMerchantDetails(null);
    }
  };

  // Suspend customer account
  const handleSuspendCustomer = async () => {
    if (!customerToAction) return;

    try {
      // Use RPC function to bypass RLS
      const { data, error } = await supabase.rpc('admin_suspend_customer', {
        p_customer_id: customerToAction.id
      });

      if (error) throw error;

      if (data && !data.success) {
        throw new Error(data.error || 'Failed to suspend customer');
      }

      toast({
        title: 'Account Suspended',
        description: `${customerToAction.full_name}'s account has been suspended.`
      });

      setIsSuspendDialogOpen(false);
      setCustomerToAction(null);
      fetchCustomers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to suspend account',
        variant: 'destructive'
      });
    }
  };

  // Reactivate customer account
  const handleReactivateCustomer = async (customer: CustomerProfile) => {
    try {
      // Use RPC function to bypass RLS
      const { data, error } = await supabase.rpc('admin_reactivate_customer', {
        p_customer_id: customer.id
      });

      if (error) throw error;

      if (data && !data.success) {
        throw new Error(data.error || 'Failed to reactivate customer');
      }

      toast({
        title: 'Account Reactivated',
        description: `${customer.full_name}'s account has been reactivated.`
      });

      fetchCustomers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reactivate account',
        variant: 'destructive'
      });
    }
  };

  // Delete customer account
  const handleDeleteCustomer = async () => {
    if (!customerToAction) return;

    try {
      // Use RPC function to bypass RLS and handle cascading deletes
      const { data, error } = await supabase.rpc('admin_delete_customer', {
        p_customer_id: customerToAction.id
      });

      if (error) throw error;

      if (data && !data.success) {
        throw new Error(data.error || 'Failed to delete customer');
      }

      toast({
        title: 'Customer Deleted',
        description: `${customerToAction.full_name}'s account has been permanently deleted.`
      });

      setIsDeleteDialogOpen(false);
      setCustomerToAction(null);
      fetchCustomers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete customer',
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

      <Tabs defaultValue="b2c" className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="b2c" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            B2C Customers
            <Badge variant="secondary" className="ml-1">
              {customers.filter(c => c.customer_type !== 'merchant').length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="b2b" className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            B2B Merchants
            <Badge variant="secondary" className="ml-1">
              {customers.filter(c => c.customer_type === 'merchant').length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="applications" className="flex items-center gap-2 relative">
            <FileText className="h-4 w-4" />
            Applications
            {applications.filter(app => app.status === 'PENDING').length > 0 && (
              <Badge variant="destructive" className="ml-1 px-2 py-0.5 text-xs">
                {applications.filter(app => app.status === 'PENDING').length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* B2C CUSTOMERS */}
        <TabsContent value="b2c">
          <Card>
            <CardHeader>
              <CardTitle>B2C Customers</CardTitle>
              <CardDescription>
                End-users who place orders. Click a row to open full details.
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
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Last login</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        const list = filteredCustomers.filter(c => c.customer_type !== 'merchant');
                        if (list.length === 0) {
                          return (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                {searchTerm ? 'No customers match your search.' : 'No B2C customers yet.'}
                              </TableCell>
                            </TableRow>
                          );
                        }
                        return list.map((customer) => (
                          <TableRow
                            key={customer.id}
                            className={`cursor-pointer hover:bg-muted/40 ${!customer.is_active ? 'bg-red-50/40' : ''}`}
                            onClick={() => openDrawer(customer)}
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-full bg-blue-100">
                                  <User className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                  <div className="font-medium">{customer.full_name}</div>
                                  <div className="text-xs text-muted-foreground">ID: {customer.id.slice(0, 8)}…</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1 text-sm">
                                {customer.email && <div className="flex items-center gap-1"><Mail className="h-3 w-3" />{customer.email}</div>}
                                {customer.phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3" />{customer.phone}</div>}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              {customer.last_sign_in_at ? formatDate(customer.last_sign_in_at) : <span className="text-muted-foreground">Never</span>}
                            </TableCell>
                            <TableCell>
                              {customer.is_active ? (
                                <Badge className="bg-green-100 text-green-700 border-green-300"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>
                              ) : (
                                <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-300"><Ban className="h-3 w-3 mr-1" />Suspended</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex justify-end gap-1">
                                {customer.is_active ? (
                                  <Button variant="ghost" size="sm" onClick={() => { setCustomerToAction(customer); setIsSuspendDialogOpen(true); }} title="Suspend" className="text-orange-600 hover:bg-orange-50">
                                    <Ban className="h-4 w-4" />
                                  </Button>
                                ) : (
                                  <Button variant="ghost" size="sm" onClick={() => handleReactivateCustomer(customer)} title="Reactivate" className="text-green-600 hover:bg-green-50">
                                    <RotateCcw className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button variant="ghost" size="sm" onClick={() => { setCustomerToAction(customer); setIsDeleteDialogOpen(true); }} title="Delete" className="text-red-600 hover:bg-red-50">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ));
                      })()}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* B2B MERCHANTS */}
        <TabsContent value="b2b">
          <Card>
            <CardHeader>
              <CardTitle>B2B Merchants</CardTitle>
              <CardDescription>
                Approved business accounts on the RM99/year subscription. Click a row to manage subscription and view details.
              </CardDescription>
              <div className="relative max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search merchants..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Merchant</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Subscription</TableHead>
                        <TableHead>Last login</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        const list = filteredCustomers.filter(c => c.customer_type === 'merchant');
                        if (list.length === 0) {
                          return (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                {searchTerm ? 'No merchants match your search.' : 'No B2B merchants yet.'}
                              </TableCell>
                            </TableRow>
                          );
                        }
                        return list.map((customer) => {
                          const sub = getSubscriptionInfo(customer);
                          const subPalette = !sub
                            ? 'border-gray-200 text-gray-500 bg-gray-50'
                            : sub.status === 'active'
                              ? 'border-green-300 text-green-700 bg-green-50'
                              : sub.status === 'expiring'
                                ? 'border-amber-300 text-amber-700 bg-amber-50'
                                : 'border-red-300 text-red-700 bg-red-50';
                          const subLabel = !sub
                            ? 'No subscription'
                            : sub.status === 'expired'
                              ? `Expired ${Math.abs(sub.daysRemaining)}d ago`
                              : `${sub.daysRemaining}d left`;
                          return (
                            <TableRow
                              key={customer.id}
                              className={`cursor-pointer hover:bg-muted/40 ${!customer.is_active ? 'bg-red-50/40' : ''}`}
                              onClick={() => openDrawer(customer)}
                            >
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="p-2 rounded-full bg-purple-100">
                                    <Store className="h-4 w-4 text-purple-600" />
                                  </div>
                                  <div>
                                    <div className="font-medium flex items-center gap-1.5">
                                      {customer.full_name}
                                      {customer.is_panel_customer && (
                                        <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] px-1.5 py-0">
                                          <Sparkles className="h-2.5 w-2.5 mr-0.5" />PANEL
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-xs text-muted-foreground">ID: {customer.id.slice(0, 8)}…</div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1 text-sm">
                                  {customer.email && <div className="flex items-center gap-1"><Mail className="h-3 w-3" />{customer.email}</div>}
                                  {customer.phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3" />{customer.phone}</div>}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <Badge variant="outline" className={subPalette}>
                                    <Calendar className="h-3 w-3 mr-1" />{subLabel}
                                  </Badge>
                                  {customer.subscription_start_date && (
                                    <div className="text-[11px] text-muted-foreground leading-tight">
                                      {formatDateShort(customer.subscription_start_date)} → {formatDateShort(customer.subscription_end_date)}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">
                                {customer.last_sign_in_at ? formatDate(customer.last_sign_in_at) : <span className="text-muted-foreground">Never</span>}
                              </TableCell>
                              <TableCell>
                                {customer.is_active ? (
                                  <Badge className="bg-green-100 text-green-700 border-green-300"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>
                                ) : (
                                  <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-300"><Ban className="h-3 w-3 mr-1" />Suspended</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                <div className="flex justify-end gap-1">
                                  {customer.is_active ? (
                                    <Button variant="ghost" size="sm" onClick={() => { setCustomerToAction(customer); setIsSuspendDialogOpen(true); }} title="Suspend" className="text-orange-600 hover:bg-orange-50">
                                      <Ban className="h-4 w-4" />
                                    </Button>
                                  ) : (
                                    <Button variant="ghost" size="sm" onClick={() => handleReactivateCustomer(customer)} title="Reactivate" className="text-green-600 hover:bg-green-50">
                                      <RotateCcw className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <Button variant="ghost" size="sm" onClick={() => { setCustomerToAction(customer); setIsDeleteDialogOpen(true); }} title="Delete" className="text-red-600 hover:bg-red-50">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        });
                      })()}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* OLD CUSTOMERS TAB — kept hidden so existing dialog logic still mounts */}
        <TabsContent value="customers-legacy" className="hidden">
          <Card>
            <CardHeader>
              <CardTitle>Customer Directory</CardTitle>
              <CardDescription>
                All registered customers who use your automotive parts service
              </CardDescription>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative max-w-sm flex-1 min-w-[200px]">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search customers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <div className="inline-flex rounded-md border bg-muted/30 p-0.5">
                  {([
                    { key: 'all', label: 'All' },
                    { key: 'b2b', label: 'B2B Merchants' },
                    { key: 'b2c', label: 'B2C Customers' },
                  ] as const).map(opt => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setCustomerTypeFilter(opt.key)}
                      className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                        customerTypeFilter === opt.key
                          ? 'bg-white shadow-sm text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
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
                              <div className="space-y-1">
                                <Badge className="bg-purple-600 hover:bg-purple-700 text-white">
                                  <Store className="h-3 w-3 mr-1" />
                                  B2B Merchant
                                </Badge>
                                {(() => {
                                  const sub = getSubscriptionInfo(customer);
                                  if (!sub) return null;
                                  const palette =
                                    sub.status === 'active'
                                      ? 'border-green-300 text-green-700 bg-green-50'
                                      : sub.status === 'expiring'
                                        ? 'border-amber-300 text-amber-700 bg-amber-50'
                                        : 'border-red-300 text-red-700 bg-red-50';
                                  const label =
                                    sub.status === 'expired'
                                      ? `Expired ${Math.abs(sub.daysRemaining)}d ago`
                                      : sub.status === 'expiring'
                                        ? `${sub.daysRemaining}d left — renew soon`
                                        : `${sub.daysRemaining}d left`;
                                  return (
                                    <div className="space-y-0.5">
                                      <Badge variant="outline" className={palette}>
                                        <Calendar className="h-3 w-3 mr-1" />
                                        {label}
                                      </Badge>
                                      <div className="text-[11px] text-muted-foreground leading-tight">
                                        {formatDateShort(customer.subscription_start_date)} → {formatDateShort(customer.subscription_end_date)}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
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
                            <Badge variant="outline">{application.referral_code || 'N/A'}</Badge>
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
                    <div><span className="font-medium">Referral Code:</span>
                      <Badge variant="outline" className="ml-2">
                        {selectedApplication.referral_code || 'N/A'}
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
              {(selectedApplication.ssm_document_url || selectedApplication.bank_proof_url || (selectedApplication as any).payment_slip_url) && (
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
                    {(selectedApplication as any).payment_slip_url && (
                      <div className="p-3 border rounded-lg border-amber-200 bg-amber-50/50">
                        <div className="text-sm font-medium mb-2">RM99 Payment Slip</div>
                        <a
                          href={(selectedApplication as any).payment_slip_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-2 bg-amber-100 text-amber-800 rounded hover:bg-amber-200 text-sm"
                        >
                          <FileText className="h-4 w-4" />
                          View Payment Slip
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

              {/* Salesman Info */}
              {selectedApplication.salesman && (
                <div>
                  <h4 className="font-semibold mb-2">Referred By</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedApplication.salesman.name} (Code: {selectedApplication.salesman.referral_code})
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
            <AlertDialogDescription asChild>
              <div>
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
              </div>
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
            <AlertDialogDescription asChild>
              <div>
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
              </div>
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

      {/* Demote to B2C confirmation */}
      <AlertDialog open={demoteOpen} onOpenChange={setDemoteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Demote to B2C customer?</AlertDialogTitle>
            <AlertDialogDescription>
              This will set <strong>{selectedCustomer?.full_name}</strong>'s account back to a normal B2C customer.
              They will lose merchant pricing and access to merchant-only features.
              The subscription dates and merchant_registration record are <strong>kept</strong> for audit purposes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="demote-reason">Reason (optional, but recommended)</Label>
            <Textarea
              id="demote-reason"
              placeholder="e.g. Did not renew RM99 subscription"
              value={demoteReason}
              onChange={(e) => setDemoteReason(e.target.value)}
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={demoting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); demoteToB2C(); }}
              disabled={demoting}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {demoting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserCheck className="h-4 w-4 mr-2" />}
              Demote to B2C
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Customer details — right Sheet drawer with Overview + Purchase History tabs */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl lg:max-w-3xl overflow-y-auto">
          {selectedCustomer && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2 flex-wrap">
                  {selectedCustomer.full_name}
                  {selectedCustomer.customer_type === 'merchant' ? (
                    <Badge className="bg-purple-600 text-white"><Store className="h-3 w-3 mr-1" />B2B Merchant</Badge>
                  ) : (
                    <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50"><User className="h-3 w-3 mr-1" />B2C Customer</Badge>
                  )}
                  {selectedCustomer.is_panel_customer && (
                    <Badge className="bg-amber-500 text-white"><Sparkles className="h-3 w-3 mr-1" />PANEL</Badge>
                  )}
                  {selectedCustomer.is_active ? (
                    <Badge className="bg-green-100 text-green-700 border-green-300">Active</Badge>
                  ) : (
                    <Badge variant="destructive">Suspended</Badge>
                  )}
                </SheetTitle>
                <SheetDescription>
                  ID: <code className="text-xs">{selectedCustomer.id}</code> · Last login {selectedCustomer.last_sign_in_at ? formatDate(selectedCustomer.last_sign_in_at) : 'Never'}
                </SheetDescription>
              </SheetHeader>

              <Tabs value={drawerTab} onValueChange={(v) => setDrawerTab(v as any)} className="mt-4">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="orders">
                    Purchase History
                    <Badge variant="secondary" className="ml-2">{drawerOrders.length}</Badge>
                  </TabsTrigger>
                </TabsList>

                {/* OVERVIEW TAB */}
                <TabsContent value="overview" className="space-y-5 pt-4">
                  {/* Contact */}
                  <div className="rounded-lg border p-4 space-y-2">
                    <div className="text-xs font-semibold text-muted-foreground uppercase">Contact</div>
                    {selectedCustomer.email && <div className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-muted-foreground" />{selectedCustomer.email}</div>}
                    {selectedCustomer.phone && <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-muted-foreground" />{selectedCustomer.phone}</div>}
                  </div>

                  {/* Order summary */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border p-4">
                      <div className="text-xs text-muted-foreground">Total orders</div>
                      <div className="text-2xl font-semibold">{orderStats.totalOrders}</div>
                    </div>
                    <div className="rounded-lg border p-4">
                      <div className="text-xs text-muted-foreground">Lifetime value</div>
                      <div className="text-2xl font-semibold">RM {orderStats.totalSpent.toFixed(2)}</div>
                    </div>
                  </div>

                  {/* Subscription editor — B2B only */}
                  {selectedCustomer.customer_type === 'merchant' && (
                    <div className="rounded-lg border p-4 space-y-3 bg-purple-50/30">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold flex items-center gap-2">
                          <Calendar className="h-4 w-4" />Subscription (RM99/year)
                        </div>
                        {(() => {
                          const sub = getSubscriptionInfo(selectedCustomer);
                          if (!sub) return null;
                          const palette = sub.status === 'active'
                            ? 'border-green-300 text-green-700 bg-green-50'
                            : sub.status === 'expiring'
                              ? 'border-amber-300 text-amber-700 bg-amber-50'
                              : 'border-red-300 text-red-700 bg-red-50';
                          const label = sub.status === 'expired'
                            ? `Expired ${Math.abs(sub.daysRemaining)}d ago`
                            : `${sub.daysRemaining}d left`;
                          return <Badge variant="outline" className={palette}>{label}</Badge>;
                        })()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Started {formatDateShort(selectedCustomer.subscription_start_date) ?? '—'} · Ends {formatDateShort(selectedCustomer.subscription_end_date) ?? '—'}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" size="sm" onClick={() => extendSubscription(selectedCustomer, 1)} disabled={subSaving}>
                          <Plus className="h-3 w-3 mr-1" />Extend by 1 year
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => extendSubscription(selectedCustomer, 2)} disabled={subSaving}>
                          <Plus className="h-3 w-3 mr-1" />Extend by 2 years
                        </Button>
                      </div>
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <Label className="text-xs">Set end date manually</Label>
                          <Input
                            type="date"
                            value={subEndDateInput}
                            onChange={(e) => setSubEndDateInput(e.target.value)}
                          />
                        </div>
                        <Button
                          size="sm"
                          onClick={() => setSubscriptionEnd(selectedCustomer, subEndDateInput)}
                          disabled={subSaving || !subEndDateInput}
                        >
                          {subSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                        </Button>
                      </div>

                      {/* Panel toggle */}
                      <div className="flex items-center justify-between border-t pt-3 mt-2">
                        <div>
                          <div className="text-sm font-medium flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                            Panel Customer
                          </div>
                          <div className="text-xs text-muted-foreground">Promote this merchant to panel-tier status.</div>
                        </div>
                        <Switch
                          checked={!!selectedCustomer.is_panel_customer}
                          onCheckedChange={(v) => togglePanel(selectedCustomer, v)}
                        />
                      </div>
                    </div>
                  )}

                  {/* Merchant business info */}
                  {selectedCustomer.customer_type === 'merchant' && merchantDetails && (
                    <div className="rounded-lg border p-4 space-y-2">
                      <div className="text-xs font-semibold text-muted-foreground uppercase">Business</div>
                      <div className="text-sm"><span className="text-muted-foreground">Company:</span> {merchantDetails.company_name}</div>
                      {merchantDetails.business_type && <div className="text-sm"><span className="text-muted-foreground">Type:</span> {merchantDetails.business_type}</div>}
                      {merchantDetails.business_registration_no && <div className="text-sm"><span className="text-muted-foreground">SSM:</span> {merchantDetails.business_registration_no}</div>}
                      {merchantDetails.address && <div className="text-sm"><span className="text-muted-foreground">Address:</span> {merchantDetails.address}</div>}
                    </div>
                  )}

                  {/* Merchant documents (uploaded during registration) */}
                  {selectedCustomer.customer_type === 'merchant' && merchantDetails && (
                    merchantDetails.ssm_document_url ||
                    merchantDetails.bank_proof_url ||
                    (merchantDetails as any).payment_slip_url ||
                    (merchantDetails.workshop_photos && merchantDetails.workshop_photos.length > 0)
                  ) ? (
                    <div className="rounded-lg border p-4 space-y-3">
                      <div className="text-xs font-semibold text-muted-foreground uppercase">Documents</div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {merchantDetails.ssm_document_url && (
                          <a
                            href={merchantDetails.ssm_document_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 border rounded-md hover:bg-muted text-sm"
                          >
                            <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
                            <span className="flex-1">SSM Document</span>
                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                          </a>
                        )}
                        {merchantDetails.bank_proof_url && (
                          <a
                            href={merchantDetails.bank_proof_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 border rounded-md hover:bg-muted text-sm"
                          >
                            <FileText className="h-4 w-4 text-green-600 flex-shrink-0" />
                            <span className="flex-1">Bank Proof</span>
                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                          </a>
                        )}
                        {(merchantDetails as any).payment_slip_url && (
                          <a
                            href={(merchantDetails as any).payment_slip_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 border rounded-md hover:bg-muted text-sm"
                          >
                            <FileText className="h-4 w-4 text-amber-600 flex-shrink-0" />
                            <span className="flex-1">Payment Slip</span>
                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                          </a>
                        )}
                      </div>
                      {merchantDetails.workshop_photos && merchantDetails.workshop_photos.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="text-xs text-muted-foreground">Workshop photos ({merchantDetails.workshop_photos.length})</div>
                          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                            {merchantDetails.workshop_photos.map((photo: string, idx: number) => (
                              <a
                                key={idx}
                                href={photo}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block aspect-square rounded border overflow-hidden hover:ring-2 hover:ring-primary"
                                title={`Workshop photo ${idx + 1}`}
                              >
                                <img src={photo} alt={`Workshop ${idx + 1}`} className="w-full h-full object-cover" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {/* Demoted record */}
                  {selectedCustomer.demoted_at && (
                    <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 space-y-1">
                      <div className="text-xs font-semibold text-orange-800 uppercase flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />Previously demoted
                      </div>
                      <div className="text-sm text-orange-900">
                        Demoted from <strong>{selectedCustomer.demoted_from}</strong> on {formatDateShort(selectedCustomer.demoted_at)}
                      </div>
                      {selectedCustomer.demotion_reason && (
                        <div className="text-xs text-orange-800">Reason: {selectedCustomer.demotion_reason}</div>
                      )}
                    </div>
                  )}

                  {/* Vehicle */}
                  {(selectedCustomer.car_make_name || selectedCustomer.car_model_name) && (
                    <div className="rounded-lg border p-4 space-y-1">
                      <div className="text-xs font-semibold text-muted-foreground uppercase">Vehicle</div>
                      <div className="flex items-center gap-2 text-sm"><Car className="h-4 w-4 text-muted-foreground" />{selectedCustomer.car_make_name} {selectedCustomer.car_model_name}</div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    {selectedCustomer.is_active ? (
                      <Button variant="outline" className="text-orange-600" onClick={() => { setCustomerToAction(selectedCustomer); setIsSuspendDialogOpen(true); }}>
                        <Ban className="h-4 w-4 mr-2" />Suspend account
                      </Button>
                    ) : (
                      <Button variant="outline" className="text-green-600" onClick={() => handleReactivateCustomer(selectedCustomer)}>
                        <RotateCcw className="h-4 w-4 mr-2" />Reactivate
                      </Button>
                    )}
                    {selectedCustomer.customer_type === 'merchant' && (
                      <Button variant="outline" className="text-amber-700 border-amber-300" onClick={() => { setDemoteReason(''); setDemoteOpen(true); }}>
                        <UserCheck className="h-4 w-4 mr-2" />Demote to B2C
                      </Button>
                    )}
                    <Button variant="outline" className="text-red-600" onClick={() => { setCustomerToAction(selectedCustomer); setIsDeleteDialogOpen(true); }}>
                      <Trash2 className="h-4 w-4 mr-2" />Delete
                    </Button>
                  </div>
                </TabsContent>

                {/* PURCHASE HISTORY TAB */}
                <TabsContent value="orders" className="space-y-3 pt-4">
                  {(() => {
                    const months = new Set<string>();
                    const years = new Set<string>();
                    for (const o of drawerOrders) {
                      months.add(o.created_at.slice(0, 7));
                      years.add(o.created_at.slice(0, 4));
                    }
                    const monthOptions = Array.from(months).sort((a, b) => (a < b ? 1 : -1));
                    const yearOptions = Array.from(years).sort((a, b) => (a < b ? 1 : -1));
                    const filtered = drawerOrders.filter(o => {
                      if (orderHistoryPeriod === 'all') return true;
                      if (orderHistoryPeriod.length === 4) return o.created_at.slice(0, 4) === orderHistoryPeriod;
                      return o.created_at.slice(0, 7) === orderHistoryPeriod;
                    });
                    const periodTotal = filtered.reduce((s, o) => s + (Number(o.total) || 0), 0);
                    return (
                      <>
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <Select value={orderHistoryPeriod} onValueChange={setOrderHistoryPeriod}>
                            <SelectTrigger className="w-[200px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All time</SelectItem>
                              {yearOptions.length > 0 && (
                                <>
                                  <div className="px-2 py-1 text-[10px] uppercase font-semibold text-muted-foreground">Year</div>
                                  {yearOptions.map(y => (
                                    <SelectItem key={y} value={y}>{y}</SelectItem>
                                  ))}
                                </>
                              )}
                              {monthOptions.length > 0 && (
                                <>
                                  <div className="px-2 py-1 text-[10px] uppercase font-semibold text-muted-foreground">Month</div>
                                  {monthOptions.map(m => (
                                    <SelectItem key={m} value={m}>
                                      {new Date(`${m}-01T00:00:00`).toLocaleDateString('en-MY', { year: 'numeric', month: 'long' })}
                                    </SelectItem>
                                  ))}
                                </>
                              )}
                            </SelectContent>
                          </Select>
                          <div className="text-sm text-muted-foreground">
                            <span className="font-semibold text-foreground">{filtered.length}</span> orders ·
                            <span className="font-semibold text-foreground ml-1">RM {periodTotal.toFixed(2)}</span>
                          </div>
                        </div>

                        {drawerOrdersLoading ? (
                          <div className="flex items-center justify-center py-8 text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin mr-2" />Loading orders...
                          </div>
                        ) : filtered.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground text-sm">
                            No orders in this period.
                          </div>
                        ) : (
                          <div className="border rounded-lg overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Order</TableHead>
                                  <TableHead>Date</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead>Delivery</TableHead>
                                  <TableHead className="text-right">Total</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {filtered.map(o => (
                                  <TableRow key={o.id}>
                                    <TableCell className="font-mono text-xs">{o.order_no}</TableCell>
                                    <TableCell className="text-sm">{formatDate(o.created_at)}</TableCell>
                                    <TableCell>
                                      <Badge variant={o.status === 'CANCELLED' ? 'destructive' : 'secondary'} className="text-xs">{o.status}</Badge>
                                    </TableCell>
                                    <TableCell className="capitalize text-sm">{o.delivery_method}</TableCell>
                                    <TableCell className="text-right font-medium">RM {Number(o.total).toFixed(2)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}