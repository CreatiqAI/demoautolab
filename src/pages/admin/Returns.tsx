import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import {
  useReturns,
  Return,
  ReturnStatus,
  getReturnStatusLabel,
  getReturnStatusColor,
  getReturnReasonLabel,
  getRefundMethodLabel
} from '@/hooks/useReturns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ResponsiveDataTable } from '@/components/ui/responsive-table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Search,
  RotateCcw,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  Truck,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  RefreshCw,
  Trash2
} from 'lucide-react';

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const colors = getReturnStatusColor(status as any);
  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold"
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        borderColor: colors.border
      }}
    >
      {getReturnStatusLabel(status as any)}
    </span>
  );
}

// Extended Return type with order info
interface ExtendedReturn extends Return {
  orders?: {
    order_no: string;
    customer_name: string;
    customer_phone: string;
    customer_email: string | null;
  };
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'ITEM_SHIPPED', label: 'Item Shipped' },
  { value: 'ITEM_RECEIVED', label: 'Item Received' },
  { value: 'INSPECTING', label: 'Inspecting' },
  { value: 'REFUND_PROCESSING', label: 'Processing Refund' },
  { value: 'EXCHANGE_PROCESSING', label: 'Processing Exchange' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' }
];

const ADMIN_STATUS_OPTIONS: ReturnStatus[] = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'ITEM_RECEIVED',
  'INSPECTING',
  'REFUND_PROCESSING',
  'EXCHANGE_PROCESSING',
  'COMPLETED'
];

export default function AdminReturns() {
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    approveReturn,
    rejectReturn,
    updateReturnStatus
  } = useReturns();

  // State
  const [returns, setReturns] = useState<ExtendedReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedReturnId, setExpandedReturnId] = useState<string | null>(null);
  const [selectedReturnIds, setSelectedReturnIds] = useState<Set<string>>(new Set());

  // Dialog states
  const [selectedReturn, setSelectedReturn] = useState<ExtendedReturn | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);

  // Form states
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [newStatus, setNewStatus] = useState<ReturnStatus | ''>('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch returns
  const fetchReturns = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('returns' as any)
        .select(`
          *,
          return_items (*),
          return_images (*),
          orders!inner (
            order_no,
            customer_name,
            customer_phone,
            customer_email
          )
        `)
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.warn('Primary query failed, trying fallback:', error);
        // Try simpler query
        const { data: basicData, error: basicError } = await supabase
          .from('returns' as any)
          .select('*')
          .order('created_at', { ascending: false });

        if (!basicError && basicData) {
          setReturns(basicData as ExtendedReturn[]);
        }
      } else {
        setReturns((data as ExtendedReturn[]) || []);
      }
    } catch (err) {
      console.error('Error fetching returns:', err);
      toast({
        title: 'Error',
        description: 'Failed to load returns',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, []);

  // Filter returns
  const filteredReturns = returns.filter(r => {
    // Status filter
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesRMA = r.return_no?.toLowerCase().includes(search);
      const matchesOrder = r.orders?.order_no?.toLowerCase().includes(search);
      const matchesCustomer = r.orders?.customer_name?.toLowerCase().includes(search);
      const matchesPhone = r.orders?.customer_phone?.includes(search);

      if (!matchesRMA && !matchesOrder && !matchesCustomer && !matchesPhone) {
        return false;
      }
    }

    return true;
  });

  // Handle selection
  const handleSelectReturn = (returnId: string, checked: boolean) => {
    setSelectedReturnIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(returnId);
      } else {
        newSet.delete(returnId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedReturnIds(new Set(filteredReturns.map(r => r.id)));
    } else {
      setSelectedReturnIds(new Set());
    }
  };

  // Handle approve
  const handleApprove = async () => {
    if (!selectedReturn) return;

    setSubmitting(true);
    const success = await approveReturn(selectedReturn.id, adminNotes);
    setSubmitting(false);

    if (success) {
      setShowApproveDialog(false);
      setAdminNotes('');
      setSelectedReturn(null);
      fetchReturns();
    }
  };

  // Handle reject
  const handleReject = async () => {
    if (!selectedReturn || !rejectionReason) return;

    setSubmitting(true);
    const success = await rejectReturn(selectedReturn.id, rejectionReason);
    setSubmitting(false);

    if (success) {
      setShowRejectDialog(false);
      setRejectionReason('');
      setSelectedReturn(null);
      fetchReturns();
    }
  };

  // Handle status update
  const handleStatusUpdate = async () => {
    if (!selectedReturn || !newStatus) return;

    setSubmitting(true);
    const success = await updateReturnStatus(selectedReturn.id, newStatus, {
      admin_notes: adminNotes || undefined
    });
    setSubmitting(false);

    if (success) {
      setShowStatusDialog(false);
      setNewStatus('');
      setAdminNotes('');
      setSelectedReturn(null);
      fetchReturns();
    }
  };

  // Bulk approve
  const handleBulkApprove = async () => {
    if (selectedReturnIds.size === 0) return;

    const pendingReturns = filteredReturns.filter(
      r => selectedReturnIds.has(r.id) && r.status === 'PENDING'
    );

    if (pendingReturns.length === 0) {
      toast({
        title: 'No Pending Returns',
        description: 'Only pending returns can be approved',
        variant: 'destructive'
      });
      return;
    }

    setSubmitting(true);
    let successCount = 0;

    for (const ret of pendingReturns) {
      const success = await approveReturn(ret.id);
      if (success) successCount++;
    }

    setSubmitting(false);
    setSelectedReturnIds(new Set());

    toast({
      title: 'Bulk Approve Complete',
      description: `${successCount} of ${pendingReturns.length} returns approved`
    });

    fetchReturns();
  };

  // Delete return
  const handleDelete = async (returnId: string) => {
    if (!confirm('Are you sure you want to delete this return?')) return;

    try {
      // Delete images first
      await supabase
        .from('return_images' as any)
        .delete()
        .eq('return_id', returnId);

      // Delete items
      await supabase
        .from('return_items' as any)
        .delete()
        .eq('return_id', returnId);

      // Delete return
      const { error } = await supabase
        .from('returns' as any)
        .delete()
        .eq('id', returnId);

      if (error) throw error;

      toast({
        title: 'Deleted',
        description: 'Return deleted successfully'
      });

      fetchReturns();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to delete return',
        variant: 'destructive'
      });
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format currency
  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '-';
    return `RM ${amount.toFixed(2)}`;
  };

  // Table columns
  const columns = [
    {
      key: 'select',
      header: (
        <Checkbox
          checked={selectedReturnIds.size === filteredReturns.length && filteredReturns.length > 0}
          onCheckedChange={handleSelectAll}
        />
      ),
      render: (item: ExtendedReturn) => (
        <Checkbox
          checked={selectedReturnIds.has(item.id)}
          onCheckedChange={(checked) => handleSelectReturn(item.id, checked as boolean)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
      className: 'w-12'
    },
    {
      key: 'return_no',
      header: 'RMA #',
      render: (item: ExtendedReturn) => (
        <div>
          <span className="font-mono font-bold text-gray-900">{item.return_no}</span>
          <p className="text-xs text-gray-500">Order: {item.orders?.order_no || '-'}</p>
        </div>
      )
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (item: ExtendedReturn) => (
        <div>
          <p className="font-medium text-gray-900">{item.orders?.customer_name || '-'}</p>
          <p className="text-xs text-gray-500">{item.orders?.customer_phone || '-'}</p>
        </div>
      )
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (item: ExtendedReturn) => (
        <div>
          <p className="text-sm">{getReturnReasonLabel(item.reason)}</p>
          <p className="text-xs text-gray-500">{getRefundMethodLabel(item.refund_method)}</p>
        </div>
      )
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (item: ExtendedReturn) => (
        <span className="font-medium">{formatCurrency(item.refund_amount)}</span>
      ),
      className: 'text-right'
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: ExtendedReturn) => <StatusBadge status={item.status} />
    },
    {
      key: 'created_at',
      header: 'Date',
      render: (item: ExtendedReturn) => (
        <span className="text-sm text-gray-500">
          {formatDate(item.created_at)}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: ExtendedReturn) => (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedReturn(item);
              setShowViewDialog(true);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>

          {item.status === 'PENDING' && (
            <>
              <Button
                size="sm"
                variant="ghost"
                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedReturn(item);
                  setShowApproveDialog(true);
                }}
              >
                <CheckCircle className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedReturn(item);
                  setShowRejectDialog(true);
                }}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </>
          )}

          {!['PENDING', 'COMPLETED', 'CANCELLED', 'REJECTED'].includes(item.status) && (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedReturn(item);
                setNewStatus(item.status as ReturnStatus);
                setShowStatusDialog(true);
              }}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}

          <Button
            size="sm"
            variant="ghost"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(item.id);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
      className: 'w-40'
    }
  ];

  // Stats
  const pendingCount = returns.filter(r => r.status === 'PENDING').length;
  const approvedCount = returns.filter(r => r.status === 'APPROVED').length;
  const completedCount = returns.filter(r => r.status === 'COMPLETED').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Returns Management</h1>
        <p className="text-muted-foreground">Manage customer return requests and refunds</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Returns</p>
                <p className="text-2xl font-bold">{returns.length}</p>
              </div>
              <RotateCcw className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending Review</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">{approvedCount}</p>
              </div>
              <Truck className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Completed</p>
                <p className="text-2xl font-bold text-green-600">{completedCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main content */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>All Returns</CardTitle>
              <CardDescription>
                {filteredReturns.length} return{filteredReturns.length !== 1 ? 's' : ''} found
              </CardDescription>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search RMA, order, customer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>

              {/* Status filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Refresh */}
              <Button variant="outline" onClick={fetchReturns}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Bulk actions */}
          {selectedReturnIds.size > 0 && (
            <div className="flex items-center gap-3 p-3 mb-4 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-sm font-medium text-blue-900">
                {selectedReturnIds.size} return{selectedReturnIds.size > 1 ? 's' : ''} selected
              </span>
              <Button
                size="sm"
                onClick={handleBulkApprove}
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-1" />
                )}
                Approve Selected
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedReturnIds(new Set())}
              >
                Clear Selection
              </Button>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          )}

          {/* Empty state */}
          {!loading && filteredReturns.length === 0 && (
            <div className="text-center py-12">
              <RotateCcw className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Returns Found</h3>
              <p className="text-gray-500">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'No return requests have been submitted yet'}
              </p>
            </div>
          )}

          {/* Table */}
          {!loading && filteredReturns.length > 0 && (
            <ResponsiveDataTable
              data={filteredReturns}
              columns={columns}
              onRowClick={(item) => {
                setSelectedReturn(item);
                setShowViewDialog(true);
              }}
              expandedRowId={expandedReturnId}
              expandedRowRender={(item) => (
                <div className="px-6 py-4 bg-gray-50 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Customer Info */}
                    <div>
                      <h4 className="font-medium mb-2 text-sm text-gray-900">Customer Information</h4>
                      <div className="space-y-1 text-sm">
                        <p><span className="text-gray-500">Name:</span> {item.orders?.customer_name || '-'}</p>
                        <p><span className="text-gray-500">Phone:</span> {item.orders?.customer_phone || '-'}</p>
                        <p><span className="text-gray-500">Email:</span> {item.orders?.customer_email || '-'}</p>
                      </div>
                    </div>

                    {/* Return Details */}
                    <div>
                      <h4 className="font-medium mb-2 text-sm text-gray-900">Return Details</h4>
                      <div className="space-y-1 text-sm">
                        <p><span className="text-gray-500">Reason:</span> {getReturnReasonLabel(item.reason)}</p>
                        <p><span className="text-gray-500">Refund Method:</span> {getRefundMethodLabel(item.refund_method)}</p>
                        <p><span className="text-gray-500">Free Shipping:</span> {item.return_shipping_free ? 'Yes' : 'No'}</p>
                      </div>
                    </div>

                    {/* Items */}
                    <div>
                      <h4 className="font-medium mb-2 text-sm text-gray-900">Items ({item.return_items?.length || 0})</h4>
                      <div className="space-y-1 text-sm">
                        {item.return_items?.slice(0, 3).map(ri => (
                          <p key={ri.id} className="truncate">
                            {ri.component_name} x{ri.quantity}
                          </p>
                        ))}
                        {(item.return_items?.length || 0) > 3 && (
                          <p className="text-gray-500">+{(item.return_items?.length || 0) - 3} more items</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Reason details */}
                  {item.reason_details && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="font-medium mb-2 text-sm text-gray-900">Customer Notes</h4>
                      <p className="text-sm text-gray-600 bg-white p-3 rounded border">
                        {item.reason_details}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-4 pt-4 border-t flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedReturn(item);
                        setShowViewDialog(true);
                      }}
                    >
                      View Full Details
                    </Button>
                    {item.status === 'PENDING' && (
                      <>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => {
                            setSelectedReturn(item);
                            setShowApproveDialog(true);
                          }}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setSelectedReturn(item);
                            setShowRejectDialog(true);
                          }}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}
            />
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Return Details
              {selectedReturn && <StatusBadge status={selectedReturn.status} />}
            </DialogTitle>
            <DialogDescription>
              {selectedReturn?.return_no}
            </DialogDescription>
          </DialogHeader>

          {selectedReturn && (
            <div className="space-y-6">
              {/* RMA & Order */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">RMA Number</p>
                  <p className="font-mono font-bold text-lg">{selectedReturn.return_no}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Order Number</p>
                  <p className="font-mono font-bold text-lg">{selectedReturn.orders?.order_no || '-'}</p>
                </div>
              </div>

              {/* Customer info */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Customer Information</h4>
                  <div className="space-y-2 text-sm bg-gray-50 p-3 rounded-lg">
                    <p><span className="text-gray-500">Name:</span> {selectedReturn.orders?.customer_name}</p>
                    <p><span className="text-gray-500">Phone:</span> {selectedReturn.orders?.customer_phone}</p>
                    <p><span className="text-gray-500">Email:</span> {selectedReturn.orders?.customer_email || '-'}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Return Information</h4>
                  <div className="space-y-2 text-sm bg-gray-50 p-3 rounded-lg">
                    <p><span className="text-gray-500">Reason:</span> {getReturnReasonLabel(selectedReturn.reason)}</p>
                    <p><span className="text-gray-500">Refund Method:</span> {getRefundMethodLabel(selectedReturn.refund_method)}</p>
                    <p><span className="text-gray-500">Free Shipping:</span> {selectedReturn.return_shipping_free ? 'Yes (Defective)' : 'No'}</p>
                    <p><span className="text-gray-500">Refund Amount:</span> <strong>{formatCurrency(selectedReturn.refund_amount)}</strong></p>
                  </div>
                </div>
              </div>

              {/* Reason details */}
              {selectedReturn.reason_details && (
                <div>
                  <h4 className="font-medium mb-2">Customer Description</h4>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                    {selectedReturn.reason_details}
                  </p>
                </div>
              )}

              {/* Items */}
              {selectedReturn.return_items && selectedReturn.return_items.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Items Being Returned</h4>
                  <div className="space-y-2">
                    {selectedReturn.return_items.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{item.component_name}</p>
                          <p className="text-xs text-gray-500">
                            SKU: {item.component_sku} · Qty: {item.quantity}
                            {item.item_condition && ` · Condition: ${item.item_condition}`}
                          </p>
                        </div>
                        <p className="font-medium">
                          {formatCurrency(item.quantity * item.unit_price)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Images */}
              {selectedReturn.return_images && selectedReturn.return_images.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Attached Photos</h4>
                  <div className="grid grid-cols-4 gap-2">
                    {selectedReturn.return_images.map(img => (
                      <a
                        key={img.id}
                        href={img.image_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <img
                          src={img.image_url}
                          alt="Return photo"
                          className="w-full aspect-square object-cover rounded-lg border hover:opacity-80"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Tracking */}
              {selectedReturn.return_tracking_number && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-600 mb-1">Return Tracking</p>
                  <p className="font-mono font-bold">{selectedReturn.return_tracking_number}</p>
                  {selectedReturn.return_courier && (
                    <p className="text-xs text-blue-600">via {selectedReturn.return_courier}</p>
                  )}
                </div>
              )}

              {/* Admin notes / Rejection reason */}
              {selectedReturn.admin_notes && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-xs text-yellow-600 mb-1">Admin Notes</p>
                  <p className="text-sm">{selectedReturn.admin_notes}</p>
                </div>
              )}

              {selectedReturn.rejection_reason && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs text-red-600 mb-1">Rejection Reason</p>
                  <p className="text-sm text-red-700">{selectedReturn.rejection_reason}</p>
                </div>
              )}

              {/* Timestamps */}
              <div className="text-xs text-gray-400 space-y-1 border-t pt-4">
                <p>Created: {formatDate(selectedReturn.created_at)}</p>
                {selectedReturn.approved_at && <p>Approved: {formatDate(selectedReturn.approved_at)}</p>}
                {selectedReturn.rejected_at && <p>Rejected: {formatDate(selectedReturn.rejected_at)}</p>}
                {selectedReturn.item_shipped_at && <p>Item Shipped: {formatDate(selectedReturn.item_shipped_at)}</p>}
                {selectedReturn.item_received_at && <p>Item Received: {formatDate(selectedReturn.item_received_at)}</p>}
                {selectedReturn.completed_at && <p>Completed: {formatDate(selectedReturn.completed_at)}</p>}
              </div>

              {/* Action buttons */}
              {selectedReturn.status === 'PENDING' && (
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setShowViewDialog(false);
                      setShowRejectDialog(true);
                    }}
                  >
                    Reject Return
                  </Button>
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      setShowViewDialog(false);
                      setShowApproveDialog(true);
                    }}
                  >
                    Approve Return
                  </Button>
                </div>
              )}

              {!['PENDING', 'COMPLETED', 'CANCELLED', 'REJECTED'].includes(selectedReturn.status) && (
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    onClick={() => {
                      setShowViewDialog(false);
                      setNewStatus(selectedReturn.status as ReturnStatus);
                      setShowStatusDialog(true);
                    }}
                  >
                    Update Status
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Approve Return
            </DialogTitle>
            <DialogDescription>
              Approve return request {selectedReturn?.return_no}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Admin Notes (Optional)</Label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add any notes about this approval..."
                className="mt-2"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleApprove}
              disabled={submitting}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Approve Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Reject Return
            </DialogTitle>
            <DialogDescription>
              Reject return request {selectedReturn?.return_no}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Rejection Reason *</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please provide a reason for rejection..."
                className="mt-2"
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason || submitting}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Reject Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Return Status</DialogTitle>
            <DialogDescription>
              Change status for {selectedReturn?.return_no}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>New Status</Label>
              <Select value={newStatus} onValueChange={(v) => setNewStatus(v as ReturnStatus)}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADMIN_STATUS_OPTIONS.map(status => (
                    <SelectItem key={status} value={status}>
                      {getReturnStatusLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Admin Notes (Optional)</Label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add any notes..."
                className="mt-2"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleStatusUpdate}
              disabled={!newStatus || submitting}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
