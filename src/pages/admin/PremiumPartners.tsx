import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Crown,
  Eye,
  Ban,
  PlayCircle,
  Search,
  Filter,
  TrendingUp,
  Store,
  MapPin,
  Phone,
  Calendar,
  History,
  Plus,
  Edit
} from 'lucide-react';

interface Partnership {
  id: string;
  merchant_id: string;
  business_name: string;
  business_type: string;
  contact_person: string;
  contact_phone: string;
  contact_email: string;
  address: string;
  city: string;
  state: string;
  subscription_status: string;
  subscription_plan: string;
  yearly_fee: number;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  admin_approved: boolean;
  rejection_reason: string | null;
  is_featured: boolean;
  display_priority: number;
  total_views: number;
  total_clicks: number;
  total_inquiries: number;
  created_at: string;
}

const STATUS_OPTIONS = ['ALL', 'PENDING', 'ACTIVE', 'SUSPENDED', 'CANCELLED', 'EXPIRED'];
const PLAN_OPTIONS = [
  { value: 'professional', label: 'Professional (Merchant)', price: 99, duration: 12, billingCycle: 'year' },
  { value: 'panel', label: 'Panel (Premium Merchant)', price: 350, duration: 1, billingCycle: 'month' }
];

export default function PremiumPartners() {
  const { toast } = useToast();
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [filteredPartnerships, setFilteredPartnerships] = useState<Partnership[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPartnership, setSelectedPartnership] = useState<Partnership | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [rejectionReason, setRejectionReason] = useState('');
  const [subscriptionDuration, setSubscriptionDuration] = useState('12'); // months (1 year)
  const [selectedPlan, setSelectedPlan] = useState('professional');
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [extensionMonths, setExtensionMonths] = useState('1');
  const [extensionNotes, setExtensionNotes] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [renewalHistory, setRenewalHistory] = useState<any[]>([]);
  const [showHistoryFor, setShowHistoryFor] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Partnership>>({});

  useEffect(() => {
    fetchPartnerships();
  }, []);

  useEffect(() => {
    filterPartnerships();
  }, [partnerships, statusFilter, searchQuery]);

  const fetchPartnerships = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('premium_partnerships' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPartnerships((data as unknown as Partnership[]) || []);
    } catch (error: any) {
      console.error('Error fetching partnerships:', error);
      toast({
        title: 'Error',
        description: 'Failed to load partnerships',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filterPartnerships = () => {
    let filtered = [...partnerships];

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(p => p.subscription_status === statusFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.business_name.toLowerCase().includes(query) ||
        p.city.toLowerCase().includes(query) ||
        p.contact_person.toLowerCase().includes(query)
      );
    }

    setFilteredPartnerships(filtered);
  };

  const handleReview = (partnership: Partnership, action: 'approve' | 'reject') => {
    setSelectedPartnership(partnership);
    setReviewAction(action);
    setIsReviewModalOpen(true);
  };

  const submitReview = async () => {
    if (!selectedPartnership) return;

    try {
      const updates: any = {
        admin_approved: reviewAction === 'approve',
        updated_at: new Date().toISOString()
      };

      if (reviewAction === 'approve') {
        const months = parseInt(subscriptionDuration);
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + months);

        const selectedPlanData = PLAN_OPTIONS.find(p => p.value === selectedPlan);

        updates.subscription_status = 'ACTIVE';
        updates.subscription_plan = selectedPlan;
        updates.yearly_fee = selectedPlanData?.price || 99;
        updates.billing_cycle = selectedPlanData?.billingCycle || 'year';
        updates.subscription_start_date = startDate.toISOString();
        updates.subscription_end_date = endDate.toISOString();
        updates.next_billing_date = endDate.toISOString();
        updates.rejection_reason = null;
      } else {
        updates.subscription_status = 'CANCELLED';
        updates.rejection_reason = rejectionReason;
      }

      const { error } = await supabase
        .from('premium_partnerships' as any)
        .update(updates)
        .eq('id', selectedPartnership.id);

      if (error) throw error;

      // CRITICAL: Update customer profile to set customer_type = 'merchant' on approval
      if (reviewAction === 'approve') {
        const { error: profileError } = await supabase
          .from('customer_profiles')
          .update({
            customer_type: 'merchant',
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedPartnership.merchant_id);

        if (profileError) {
          console.error('Error updating customer profile:', profileError);
          // Don't fail the whole operation, but log it
        }
      }

      toast({
        title: reviewAction === 'approve' ? 'Partnership Approved' : 'Partnership Rejected',
        description: `${selectedPartnership.business_name} has been ${reviewAction === 'approve' ? 'approved' : 'rejected'}.`
      });

      setIsReviewModalOpen(false);
      setRejectionReason('');
      setSubscriptionDuration('1');
      fetchPartnerships();
    } catch (error: any) {
      console.error('Error reviewing partnership:', error);
      toast({
        title: 'Error',
        description: 'Failed to review partnership',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateStatus = async (partnership: Partnership, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('premium_partnerships' as any)
        .update({
          subscription_status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', partnership.id);

      if (error) throw error;

      toast({
        title: 'Status Updated',
        description: `${partnership.business_name} status changed to ${newStatus}`
      });

      fetchPartnerships();
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive'
      });
    }
  };

  const handleToggleFeatured = async (partnership: Partnership) => {
    try {
      const { error } = await supabase
        .from('premium_partnerships' as any)
        .update({
          is_featured: !partnership.is_featured,
          display_priority: !partnership.is_featured ? 100 : 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', partnership.id);

      if (error) throw error;

      toast({
        title: partnership.is_featured ? 'Removed from Featured' : 'Added to Featured',
        description: `${partnership.business_name} ${partnership.is_featured ? 'removed from' : 'added to'} featured list`
      });

      fetchPartnerships();
    } catch (error: any) {
      console.error('Error toggling featured:', error);
      toast({
        title: 'Error',
        description: 'Failed to update featured status',
        variant: 'destructive'
      });
    }
  };

  const handleEdit = (partnership: Partnership) => {
    setEditFormData({
      id: partnership.id,
      business_name: partnership.business_name,
      subscription_plan: partnership.subscription_plan,
      subscription_status: partnership.subscription_status,
      subscription_start_date: partnership.subscription_start_date,
      subscription_end_date: partnership.subscription_end_date,
      yearly_fee: partnership.yearly_fee,
      admin_approved: partnership.admin_approved,
      is_featured: partnership.is_featured,
      display_priority: partnership.display_priority
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editFormData.id) return;

    try {
      const { error } = await supabase
        .from('premium_partnerships' as any)
        .update({
          subscription_plan: editFormData.subscription_plan,
          subscription_status: editFormData.subscription_status,
          subscription_start_date: editFormData.subscription_start_date,
          subscription_end_date: editFormData.subscription_end_date,
          yearly_fee: editFormData.yearly_fee,
          admin_approved: editFormData.admin_approved,
          is_featured: editFormData.is_featured,
          display_priority: editFormData.display_priority,
          updated_at: new Date().toISOString()
        })
        .eq('id', editFormData.id);

      if (error) throw error;

      toast({
        title: 'Partnership Updated',
        description: 'Subscription details updated successfully'
      });

      setIsEditModalOpen(false);
      fetchPartnerships();
    } catch (error: any) {
      console.error('Error updating partnership:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update partnership',
        variant: 'destructive'
      });
    }
  };

  const handleExtendSubscription = (partnership: Partnership) => {
    setSelectedPartnership(partnership);
    setExtensionMonths('12'); // Default to 1 year
    setExtensionNotes('');
    setSelectedPlan(partnership.subscription_plan || 'professional');
    const planPrice = partnership.subscription_plan?.toLowerCase() === 'panel' ? 350 : 99;
    setPaymentAmount(planPrice.toString());
    setPaymentMethod('');
    setPaymentReference('');
    setIsExtendModalOpen(true);
  };

  const submitExtension = async () => {
    if (!selectedPartnership) return;

    try {
      const months = parseInt(extensionMonths);
      const currentEndDate = selectedPartnership.subscription_end_date
        ? new Date(selectedPartnership.subscription_end_date)
        : new Date();

      // If current date is past expiration, extend from today
      const now = new Date();
      const baseDate = currentEndDate > now ? currentEndDate : now;

      const newEndDate = new Date(baseDate);
      newEndDate.setMonth(newEndDate.getMonth() + months);

      // Get plan price
      const planPrice = selectedPlan?.toLowerCase() === 'panel' ? 350 : 99;

      // Update partnership
      const { error: updateError } = await supabase
        .from('premium_partnerships' as any)
        .update({
          subscription_end_date: newEndDate.toISOString(),
          next_billing_date: newEndDate.toISOString(),
          subscription_status: 'ACTIVE',
          subscription_plan: selectedPlan,
          yearly_fee: planPrice,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedPartnership.id);

      if (updateError) throw updateError;

      // Log renewal history
      const { error: historyError } = await supabase
        .from('partnership_renewal_history' as any)
        .insert([{
          partnership_id: selectedPartnership.id,
          renewal_type: selectedPartnership.subscription_end_date && new Date(selectedPartnership.subscription_end_date) > now ? 'EXTENSION' : 'RENEWAL',
          previous_end_date: selectedPartnership.subscription_end_date,
          new_end_date: newEndDate.toISOString(),
          months_extended: months,
          amount_paid: paymentAmount ? parseFloat(paymentAmount) : null,
          payment_method: paymentMethod || null,
          payment_reference: paymentReference || null,
          previous_status: selectedPartnership.subscription_status,
          new_status: 'ACTIVE',
          admin_notes: extensionNotes || null
        } as any]);

      if (historyError) {
        console.error('Error logging renewal history:', historyError);
        // Don't fail the whole operation if history logging fails
      }

      toast({
        title: 'Subscription Extended',
        description: `${selectedPartnership.business_name} subscription extended by ${months} month(s) until ${newEndDate.toLocaleDateString('en-MY')}`
      });

      setIsExtendModalOpen(false);
      fetchPartnerships();
    } catch (error: any) {
      console.error('Error extending subscription:', error);
      toast({
        title: 'Error',
        description: 'Failed to extend subscription',
        variant: 'destructive'
      });
    }
  };

  const fetchRenewalHistory = async (partnershipId: string) => {
    try {
      const { data, error } = await supabase
        .from('partnership_renewal_history' as any)
        .select('*')
        .eq('partnership_id', partnershipId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRenewalHistory(data || []);
      setShowHistoryFor(partnershipId);
    } catch (error: any) {
      console.error('Error fetching renewal history:', error);
      toast({
        title: 'Error',
        description: 'Failed to load renewal history',
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="h-3 w-3 mr-1" />Active</Badge>;
      case 'PENDING':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'SUSPENDED':
        return <Badge variant="destructive"><Ban className="h-3 w-3 mr-1" />Suspended</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      case 'EXPIRED':
        return <Badge variant="outline"><XCircle className="h-3 w-3 mr-1" />Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPlanBadge = (plan: string) => {
    switch (plan?.toLowerCase()) {
      case 'panel':
        return <Badge className="bg-purple-100 text-purple-800">
          <Crown className="h-3 w-3 mr-1" />
          Panel
        </Badge>;
      case 'professional':
      default:
        return <Badge className="bg-blue-100 text-blue-800">
          <Store className="h-3 w-3 mr-1" />
          Professional
        </Badge>;
    }
  };

  const stats = {
    total: partnerships.length,
    pending: partnerships.filter(p => p.subscription_status === 'PENDING' || !p.admin_approved).length,
    active: partnerships.filter(p => p.subscription_status === 'ACTIVE' && p.admin_approved).length,
    revenue: partnerships.filter(p => p.subscription_status === 'ACTIVE').reduce((sum, p) => {
      const planPrice = p.subscription_plan?.toLowerCase() === 'panel' ? 350 : 99;
      return sum + planPrice;
    }, 0)
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Premium Partners</h2>
        <p className="text-muted-foreground">
          Manage authorized reseller partnerships and subscriptions
        </p>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Partners</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Partners</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Yearly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">RM {stats.revenue}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search partners..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Partnerships Table */}
      <Card>
        <CardHeader>
          <CardTitle>Partnership Applications</CardTitle>
          <CardDescription>Review and manage premium partner applications</CardDescription>
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
                  <TableHead>Business</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Subscription</TableHead>
                  <TableHead>Stats</TableHead>
                  <TableHead>Yearly Fee</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPartnerships.map((partnership) => (
                  <TableRow key={partnership.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          <Store className="h-4 w-4" />
                          {partnership.business_name}
                          {partnership.is_featured && <Crown className="h-4 w-4 text-yellow-500" />}
                        </div>
                        <div className="text-sm text-muted-foreground">{partnership.business_type}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Phone className="h-3 w-3" />
                          {partnership.contact_phone}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="h-3 w-3" />
                        {partnership.city}, {partnership.state}
                      </div>
                    </TableCell>
                    <TableCell>{getPlanBadge(partnership.subscription_plan)}</TableCell>
                    <TableCell>{getStatusBadge(partnership.subscription_status)}</TableCell>
                    <TableCell>
                      {partnership.subscription_end_date && (
                        <div className="text-sm space-y-1">
                          <div className="font-medium">
                            {new Date(partnership.subscription_end_date).toLocaleDateString('en-MY', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </div>
                          <div className={`text-xs ${
                            (() => {
                              const daysLeft = Math.ceil((new Date(partnership.subscription_end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                              if (daysLeft < 0) return 'text-red-600 font-semibold';
                              if (daysLeft <= 7) return 'text-orange-600 font-semibold';
                              if (daysLeft <= 30) return 'text-yellow-600';
                              return 'text-muted-foreground';
                            })()
                          }`}>
                            {(() => {
                              const daysLeft = Math.ceil((new Date(partnership.subscription_end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                              if (daysLeft < 0) return `Expired ${Math.abs(daysLeft)} days ago`;
                              if (daysLeft === 0) return 'Expires today';
                              return `${daysLeft} days left`;
                            })()}
                          </div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm space-y-1">
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {partnership.total_views} views
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {partnership.total_clicks} clicks
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        RM {partnership.subscription_plan?.toLowerCase() === 'panel' ? '350/mo' : '99/yr'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {!partnership.admin_approved && partnership.subscription_status === 'PENDING' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 border-green-300 hover:bg-green-50"
                              onClick={() => handleReview(partnership, 'approve')}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-300 hover:bg-red-50"
                              onClick={() => handleReview(partnership, 'reject')}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}

                        {/* Edit Button - always visible */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-purple-600 border-purple-300 hover:bg-purple-50"
                          onClick={() => handleEdit(partnership)}
                          title="Edit Subscription Details"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>

                        {partnership.subscription_status === 'ACTIVE' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-blue-600 border-blue-300 hover:bg-blue-50"
                              onClick={() => handleExtendSubscription(partnership)}
                              title="Extend/Renew Subscription"
                            >
                              <Calendar className="h-4 w-4 mr-1" />
                              Extend
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleFeatured(partnership)}
                              title={partnership.is_featured ? 'Remove from Featured' : 'Mark as Featured'}
                            >
                              <Crown className={`h-4 w-4 ${partnership.is_featured ? 'text-yellow-500' : ''}`} />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600"
                              onClick={() => handleUpdateStatus(partnership, 'SUSPENDED')}
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          </>
                        )}

                        {/* View History Button - always visible */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => fetchRenewalHistory(partnership.id)}
                          title="View Renewal History"
                        >
                          <History className="h-4 w-4" />
                        </Button>

                        {partnership.subscription_status === 'SUSPENDED' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600"
                            onClick={() => handleUpdateStatus(partnership, 'ACTIVE')}
                          >
                            <PlayCircle className="h-4 w-4 mr-1" />
                            Activate
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Review Modal */}
      <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'approve' ? 'Approve' : 'Reject'} Partnership
            </DialogTitle>
            <DialogDescription>
              {selectedPartnership?.business_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {reviewAction === 'approve' ? (
              <>
                <div>
                  <label className="text-sm font-medium mb-1 block">Subscription Plan</label>
                  <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PLAN_OPTIONS.map((plan) => (
                        <SelectItem key={plan.value} value={plan.value}>
                          {plan.label} - RM {plan.price}/year
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Plan Features Preview */}
                <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
                  <h4 className="font-semibold">{selectedPlan === 'panel' ? 'Panel (Premium Merchant)' : 'Professional (Merchant)'} Plan Features:</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Shop listing on Find Shops page</li>
                    <li>Basic analytics dashboard</li>
                    <li>B2B wholesale pricing access</li>
                    <li>RM50 Welcome Voucher (min spend RM100)</li>
                    <li>2nd Hand Marketplace access for selling used parts</li>
                    {selectedPlan === 'panel' && (
                      <>
                        <li className="text-purple-600 font-medium">Installation Guides Library Access</li>
                        <li className="text-purple-600 font-medium">Priority support and dedicated slot</li>
                      </>
                    )}
                  </ul>
                  <div className="pt-2 border-t mt-2">
                    <span className="font-semibold">Total: RM {selectedPlan === 'panel' ? '350/month' : '99/year'}</span>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm">
                  <p className="text-green-800">
                    Approving this application will activate the partnership and make it visible on the Find Shops page.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="text-sm font-medium mb-1 block">Rejection Reason *</label>
                  <Textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={4}
                    placeholder="Explain why this application is being rejected..."
                    required
                  />
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm">
                  <p className="text-red-800">
                    The merchant will be notified of the rejection and can reapply after addressing the issues.
                  </p>
                </div>
              </>
            )}

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsReviewModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={submitReview}
                disabled={reviewAction === 'reject' && !rejectionReason}
                className={reviewAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
              >
                {reviewAction === 'approve' ? 'Approve Partnership' : 'Reject Application'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Extend Subscription Modal */}
      <Dialog open={isExtendModalOpen} onOpenChange={setIsExtendModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Extend/Renew Subscription</DialogTitle>
            <DialogDescription>
              {selectedPartnership?.business_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Current Subscription Info */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <h4 className="font-semibold text-sm">Current Subscription</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <span className="ml-2 font-medium">{selectedPartnership?.subscription_status}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Current End Date:</span>
                  <span className="ml-2 font-medium">
                    {selectedPartnership?.subscription_end_date
                      ? new Date(selectedPartnership.subscription_end_date).toLocaleDateString('en-MY')
                      : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Days Left:</span>
                  <span className="ml-2 font-medium">
                    {selectedPartnership?.subscription_end_date
                      ? (() => {
                          const daysLeft = Math.ceil((new Date(selectedPartnership.subscription_end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                          if (daysLeft < 0) return `Expired ${Math.abs(daysLeft)} days ago`;
                          return `${daysLeft} days`;
                        })()
                      : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Extension Form */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Subscription Plan</label>
                  <Select value={selectedPlan} onValueChange={(val) => {
                    setSelectedPlan(val);
                    setPaymentAmount(val === 'panel' ? '350' : '99');
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PLAN_OPTIONS.map((plan) => (
                        <SelectItem key={plan.value} value={plan.value}>
                          {plan.label} - RM {plan.price}/year
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Extension Duration *</label>
                  <Select value={extensionMonths} onValueChange={setExtensionMonths}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12">12 Months (1 Year)</SelectItem>
                      <SelectItem value="24">24 Months (2 Years)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Amount Paid</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder={selectedPlan === 'panel' ? '350' : '99'}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Payment Method</label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="Online Payment">Online Payment</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Payment Reference</label>
                <Input
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Transaction ID / Receipt No."
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Admin Notes</label>
                <Textarea
                  value={extensionNotes}
                  onChange={(e) => setExtensionNotes(e.target.value)}
                  rows={3}
                  placeholder="Add any notes about this renewal (optional)"
                />
              </div>
            </div>

            {/* Preview */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
              <p className="text-sm text-blue-900">
                <strong>Plan:</strong> {selectedPlan === 'panel' ? 'Panel (Premium Merchant)' : 'Professional (Merchant)'} - RM {selectedPlan === 'panel' ? '350/month' : '99/year'}
              </p>
              <p className="text-sm text-blue-900">
                <strong>New Expiration Date:</strong>{' '}
                {(() => {
                  const currentEndDate = selectedPartnership?.subscription_end_date
                    ? new Date(selectedPartnership.subscription_end_date)
                    : new Date();
                  const now = new Date();
                  const baseDate = currentEndDate > now ? currentEndDate : now;
                  const newDate = new Date(baseDate);
                  newDate.setMonth(newDate.getMonth() + parseInt(extensionMonths));
                  return newDate.toLocaleDateString('en-MY', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  });
                })()}
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsExtendModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={submitExtension}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Extend Subscription
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Renewal History Modal */}
      <Dialog open={showHistoryFor !== null} onOpenChange={(open) => !open && setShowHistoryFor(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Renewal History</DialogTitle>
            <DialogDescription>
              {partnerships.find(p => p.id === showHistoryFor)?.business_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {renewalHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No renewal history found</p>
              </div>
            ) : (
              renewalHistory.map((record: any, index: number) => (
                <Card key={record.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={
                            record.renewal_type === 'NEW' ? 'default' :
                            record.renewal_type === 'RENEWAL' ? 'secondary' :
                            record.renewal_type === 'EXTENSION' ? 'outline' : 'destructive'
                          }>
                            {record.renewal_type}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(record.created_at).toLocaleDateString('en-MY', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">Previous End:</span>
                            <p className="font-medium">
                              {record.previous_end_date
                                ? new Date(record.previous_end_date).toLocaleDateString('en-MY')
                                : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">New End:</span>
                            <p className="font-medium text-green-600">
                              {new Date(record.new_end_date).toLocaleDateString('en-MY')}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Extended By:</span>
                            <p className="font-medium">{record.months_extended} month(s)</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Amount:</span>
                            <p className="font-medium">
                              {record.amount_paid ? `RM ${record.amount_paid}` : 'N/A'}
                            </p>
                          </div>
                        </div>

                        {(record.payment_method || record.payment_reference) && (
                          <div className="mt-2 text-sm">
                            {record.payment_method && (
                              <span className="text-muted-foreground">Payment: <strong>{record.payment_method}</strong></span>
                            )}
                            {record.payment_reference && (
                              <span className="ml-4 text-muted-foreground">
                                Ref: <strong>{record.payment_reference}</strong>
                              </span>
                            )}
                          </div>
                        )}

                        {record.admin_notes && (
                          <div className="mt-2 text-sm text-muted-foreground">
                            <em>Note: {record.admin_notes}</em>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Subscription Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Subscription Details</DialogTitle>
            <DialogDescription>
              Manually edit all subscription details for {editFormData.business_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Subscription Plan */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Subscription Plan</label>
                <Select
                  value={editFormData.subscription_plan}
                  onValueChange={(value) => setEditFormData({ ...editFormData, subscription_plan: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLAN_OPTIONS.map(plan => (
                      <SelectItem key={plan.value} value={plan.value}>
                        {plan.label} - RM{plan.price}/year
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Subscription Status</label>
                <Select
                  value={editFormData.subscription_status}
                  onValueChange={(value) => setEditFormData({ ...editFormData, subscription_status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.filter(s => s !== 'ALL').map(status => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Subscription Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Start Date</label>
                <Input
                  type="date"
                  value={editFormData.subscription_start_date ? new Date(editFormData.subscription_start_date).toISOString().split('T')[0] : ''}
                  onChange={(e) => setEditFormData({ ...editFormData, subscription_start_date: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">End Date</label>
                <Input
                  type="date"
                  value={editFormData.subscription_end_date ? new Date(editFormData.subscription_end_date).toISOString().split('T')[0] : ''}
                  onChange={(e) => setEditFormData({ ...editFormData, subscription_end_date: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {editFormData.subscription_end_date && (
                    <>
                      {(() => {
                        const daysLeft = Math.ceil((new Date(editFormData.subscription_end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                        return daysLeft > 0 ? `${daysLeft} days remaining` : `Expired ${Math.abs(daysLeft)} days ago`;
                      })()}
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Yearly Fee */}
            <div>
              <label className="text-sm font-medium mb-2 block">Yearly Fee (RM)</label>
              <Input
                type="number"
                step="0.01"
                value={editFormData.yearly_fee || ''}
                onChange={(e) => setEditFormData({ ...editFormData, yearly_fee: parseFloat(e.target.value) || 0 })}
                placeholder="e.g., 99 or 388"
              />
            </div>

            {/* Admin Controls */}
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Admin Approved</label>
                <input
                  type="checkbox"
                  checked={editFormData.admin_approved || false}
                  onChange={(e) => setEditFormData({ ...editFormData, admin_approved: e.target.checked })}
                  className="w-4 h-4"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Featured Partnership</label>
                <input
                  type="checkbox"
                  checked={editFormData.is_featured || false}
                  onChange={(e) => setEditFormData({ ...editFormData, is_featured: e.target.checked })}
                  className="w-4 h-4"
                />
              </div>

              {editFormData.is_featured && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Display Priority</label>
                  <Input
                    type="number"
                    value={editFormData.display_priority || 0}
                    onChange={(e) => setEditFormData({ ...editFormData, display_priority: parseInt(e.target.value) || 0 })}
                    placeholder="Higher number = higher priority"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} className="bg-purple-600 hover:bg-purple-700">
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
