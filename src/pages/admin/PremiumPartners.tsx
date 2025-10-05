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
  Phone
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
  monthly_fee: number;
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
  const [subscriptionDuration, setSubscriptionDuration] = useState('1'); // months

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

        updates.subscription_status = 'ACTIVE';
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
    return <Badge className="bg-blue-100 text-blue-800">
      <Crown className="h-3 w-3 mr-1" />
      Premium Partner
    </Badge>;
  };

  const stats = {
    total: partnerships.length,
    pending: partnerships.filter(p => p.subscription_status === 'PENDING' || !p.admin_approved).length,
    active: partnerships.filter(p => p.subscription_status === 'ACTIVE' && p.admin_approved).length,
    revenue: partnerships.filter(p => p.subscription_status === 'ACTIVE').reduce((sum, p) => sum + p.monthly_fee, 0)
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Revenue</CardTitle>
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
                  <TableHead>Stats</TableHead>
                  <TableHead>Monthly Fee</TableHead>
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
                      <div className="font-medium">RM {partnership.monthly_fee}</div>
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

                        {partnership.subscription_status === 'ACTIVE' && (
                          <>
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
                  <label className="text-sm font-medium mb-1 block">Subscription Duration (months)</label>
                  <Select value={subscriptionDuration} onValueChange={setSubscriptionDuration}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Month</SelectItem>
                      <SelectItem value="3">3 Months</SelectItem>
                      <SelectItem value="6">6 Months</SelectItem>
                      <SelectItem value="12">12 Months</SelectItem>
                    </SelectContent>
                  </Select>
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
    </div>
  );
}
