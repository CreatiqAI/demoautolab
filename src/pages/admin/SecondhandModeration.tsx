import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle,
  XCircle,
  Eye,
  Package,
  Search,
  Calendar,
  DollarSign,
  Filter,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface SecondhandListing {
  id: string;
  seller_id: string;
  title: string;
  description: string;
  selling_price: number;
  original_price: number;
  condition: string;
  images: string[];
  status: string;
  product_category: string;
  car_brand: string;
  car_model: string;
  compatible_years: string;
  year_purchased: number;
  months_used: number;
  reason_for_selling: string;
  is_negotiable: boolean;
  views_count: number;
  inquiry_count: number;
  admin_notes: string;
  created_at: string;
  seller?: {
    id: string;
    user_id: string;
    customer_type: string;
  };
}

export default function SecondhandModeration() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [listings, setListings] = useState<SecondhandListing[]>([]);
  const [filteredListings, setFilteredListings] = useState<SecondhandListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedListing, setSelectedListing] = useState<SecondhandListing | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    fetchListings();
  }, []);

  useEffect(() => {
    filterListings();
  }, [listings, searchQuery, statusFilter]);

  const fetchListings = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('secondhand_listings')
        .select(`
          *,
          seller:customer_profiles!seller_id(
            id,
            user_id,
            customer_type
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setListings(data || []);
    } catch (error: any) {
      console.error('Error fetching listings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load listings',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filterListings = () => {
    let filtered = [...listings];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(l => l.status === statusFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(l =>
        l.title.toLowerCase().includes(query) ||
        l.product_category?.toLowerCase().includes(query) ||
        l.car_brand?.toLowerCase().includes(query)
      );
    }

    setFilteredListings(filtered);
  };

  const handleApprove = async (listing: SecondhandListing) => {
    if (!user) return;

    try {
      setProcessing(true);

      const { error } = await supabase
        .from('secondhand_listings')
        .update({
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', listing.id);

      if (error) throw error;

      toast({
        title: 'Listing Approved',
        description: `"${listing.title}" is now live on the marketplace`
      });

      await fetchListings();
      setShowDetailModal(false);
    } catch (error: any) {
      console.error('Approve error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve listing',
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedListing || !user) return;

    if (!rejectReason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a rejection reason',
        variant: 'destructive'
      });
      return;
    }

    try {
      setProcessing(true);

      const { error } = await supabase
        .from('secondhand_listings')
        .update({
          status: 'rejected',
          admin_notes: rejectReason,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', selectedListing.id);

      if (error) throw error;

      toast({
        title: 'Listing Rejected',
        description: 'Seller has been notified with your feedback'
      });

      await fetchListings();
      setShowRejectModal(false);
      setShowDetailModal(false);
      setRejectReason('');
    } catch (error: any) {
      console.error('Reject error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject listing',
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
    }
  };

  const openRejectModal = (listing: SecondhandListing) => {
    setSelectedListing(listing);
    setShowRejectModal(true);
  };

  const getStatusBadge = (status: string) => {
    const styles: any = {
      pending: 'bg-yellow-500 text-white',
      approved: 'bg-green-500 text-white',
      rejected: 'bg-red-500 text-white',
      sold: 'bg-purple-500 text-white',
      expired: 'bg-gray-500 text-white'
    };
    return <Badge className={styles[status] || ''}>{status.toUpperCase()}</Badge>;
  };

  const getConditionColor = (condition: string) => {
    const colors: any = {
      like_new: 'text-green-600',
      good: 'text-blue-600',
      fair: 'text-yellow-600',
      damaged: 'text-red-600'
    };
    return colors[condition] || 'text-gray-600';
  };

  const stats = {
    total: listings.length,
    pending: listings.filter(l => l.status === 'pending').length,
    approved: listings.filter(l => l.status === 'approved').length,
    rejected: listings.filter(l => l.status === 'rejected').length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900 uppercase italic">
            2nd Hand Marketplace Moderation
          </h1>
          <p className="text-sm text-gray-500 mt-1">Review and moderate merchant 2nd hand listings</p>
        </div>
        <Button onClick={fetchListings} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Total Listings</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Package className="w-8 h-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-yellow-700 uppercase font-medium">Pending Review</p>
              <p className="text-2xl font-bold text-yellow-900">{stats.pending}</p>
            </div>
            <Eye className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-green-700 uppercase font-medium">Approved</p>
              <p className="text-2xl font-bold text-green-900">{stats.approved}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-red-700 uppercase font-medium">Rejected</p>
              <p className="text-2xl font-bold text-red-900">{stats.rejected}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by title, category, or car brand..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-48">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="sold">Sold</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Listings Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4 animate-pulse" />
            <p className="text-gray-500">Loading listings...</p>
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No listings found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Listing</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Seller</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Price</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Condition</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Submitted</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredListings.map((listing) => (
                  <tr key={listing.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                          {listing.images && listing.images.length > 0 ? (
                            <img
                              src={listing.images[0]}
                              alt={listing.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-6 h-6 text-gray-300" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{listing.title}</p>
                          {listing.product_category && (
                            <p className="text-xs text-gray-500">{listing.product_category}</p>
                          )}
                          {listing.car_brand && (
                            <p className="text-xs text-gray-500">{listing.car_brand} {listing.car_model}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-gray-900">
                        Merchant ID: {listing.seller?.id?.substring(0, 8) || 'Unknown'}
                      </p>
                      {listing.seller?.customer_type && (
                        <p className="text-xs text-gray-500 capitalize">{listing.seller.customer_type}</p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-gray-900">RM {listing.selling_price.toFixed(2)}</p>
                      {listing.original_price && (
                        <p className="text-xs text-gray-400 line-through">RM {listing.original_price.toFixed(2)}</p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-sm font-medium ${getConditionColor(listing.condition)}`}>
                        {listing.condition.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {getStatusBadge(listing.status)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        {new Date(listing.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedListing(listing);
                            setCurrentImageIndex(0);
                            setShowDetailModal(true);
                          }}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
                        {listing.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleApprove(listing)}
                              disabled={processing}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => openRejectModal(listing)}
                              disabled={processing}
                            >
                              <XCircle className="w-3 h-3 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{selectedListing?.title}</DialogTitle>
            <DialogDescription>
              Review listing details before approval or rejection
            </DialogDescription>
          </DialogHeader>

          {selectedListing && (
            <div className="space-y-6">
              {/* Image Gallery */}
              {selectedListing.images && selectedListing.images.length > 0 && (
                <div>
                  <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden relative">
                    <img
                      src={selectedListing.images[currentImageIndex]}
                      alt={`Product ${currentImageIndex + 1}`}
                      className="w-full h-full object-contain"
                    />
                    {selectedListing.images.length > 1 && (
                      <>
                        <button
                          onClick={() => setCurrentImageIndex((currentImageIndex - 1 + selectedListing.images.length) % selectedListing.images.length)}
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-2 hover:bg-black/70"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setCurrentImageIndex((currentImageIndex + 1) % selectedListing.images.length)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-2 hover:bg-black/70"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-xs">
                          {currentImageIndex + 1} / {selectedListing.images.length}
                        </div>
                      </>
                    )}
                  </div>
                  {selectedListing.images.length > 1 && (
                    <div className="flex gap-2 mt-2 overflow-x-auto">
                      {selectedListing.images.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentImageIndex(idx)}
                          className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                            idx === currentImageIndex ? 'border-lime-600' : 'border-gray-200'
                          }`}
                        >
                          <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium mb-1">Price</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold text-lime-600">RM {selectedListing.selling_price.toFixed(2)}</p>
                    {selectedListing.original_price && (
                      <p className="text-sm text-gray-400 line-through">RM {selectedListing.original_price.toFixed(2)}</p>
                    )}
                  </div>
                  {selectedListing.is_negotiable && (
                    <Badge variant="outline" className="mt-1">Negotiable</Badge>
                  )}
                </div>

                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium mb-1">Condition</p>
                  <p className={`text-lg font-semibold ${getConditionColor(selectedListing.condition)}`}>
                    {selectedListing.condition.replace('_', ' ').toUpperCase()}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium mb-1">Category</p>
                  <p className="text-sm font-medium text-gray-900">{selectedListing.product_category || 'N/A'}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium mb-1">Status</p>
                  {getStatusBadge(selectedListing.status)}
                </div>

                {selectedListing.car_brand && (
                  <>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-medium mb-1">Car Brand</p>
                      <p className="text-sm font-medium text-gray-900">{selectedListing.car_brand}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-medium mb-1">Car Model</p>
                      <p className="text-sm font-medium text-gray-900">{selectedListing.car_model || 'N/A'}</p>
                    </div>
                  </>
                )}

                {selectedListing.year_purchased && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-medium mb-1">Year Purchased</p>
                    <p className="text-sm font-medium text-gray-900">{selectedListing.year_purchased}</p>
                  </div>
                )}

                {selectedListing.months_used && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-medium mb-1">Months Used</p>
                    <p className="text-sm font-medium text-gray-900">{selectedListing.months_used} months</p>
                  </div>
                )}
              </div>

              {/* Description */}
              {selectedListing.description && (
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium mb-2">Description</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedListing.description}</p>
                </div>
              )}

              {/* Reason for Selling */}
              {selectedListing.reason_for_selling && (
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium mb-2">Reason for Selling</p>
                  <p className="text-sm text-gray-700">{selectedListing.reason_for_selling}</p>
                </div>
              )}

              {/* Admin Notes (if rejected) */}
              {selectedListing.admin_notes && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-xs text-red-700 uppercase font-medium mb-2">Admin Notes</p>
                  <p className="text-sm text-red-800">{selectedListing.admin_notes}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {selectedListing?.status === 'pending' && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setShowDetailModal(false);
                    openRejectModal(selectedListing);
                  }}
                  disabled={processing}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={() => handleApprove(selectedListing)}
                  disabled={processing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => setShowDetailModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Listing</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting "{selectedListing?.title}". This will be visible to the seller.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Textarea
              placeholder="Enter rejection reason (e.g., Poor image quality, Incomplete information, Not suitable for marketplace...)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={5}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectModal(false)} disabled={processing}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={processing || !rejectReason.trim()}>
              {processing ? 'Rejecting...' : 'Reject Listing'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
