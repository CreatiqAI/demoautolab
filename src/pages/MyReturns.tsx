import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  useReturns,
  Return,
  getReturnStatusLabel,
  getReturnStatusColor,
  getReturnReasonLabel,
  getRefundMethodLabel
} from '@/hooks/useReturns';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowLeft,
  Package,
  RotateCcw,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  Eye,
  AlertTriangle,
  Loader2,
  Copy,
  ExternalLink
} from 'lucide-react';

// Return timeline component
function ReturnTimeline({ status }: { status: string }) {
  const steps = [
    { key: 'PENDING', label: 'Submitted', icon: Clock },
    { key: 'APPROVED', label: 'Approved', icon: CheckCircle },
    { key: 'ITEM_SHIPPED', label: 'Shipped Back', icon: Truck },
    { key: 'ITEM_RECEIVED', label: 'Received', icon: Package },
    { key: 'COMPLETED', label: 'Completed', icon: CheckCircle }
  ];

  const statusOrder = ['PENDING', 'APPROVED', 'ITEM_SHIPPED', 'ITEM_RECEIVED', 'INSPECTING', 'REFUND_PROCESSING', 'EXCHANGE_PROCESSING', 'COMPLETED'];
  const currentIndex = statusOrder.indexOf(status);

  // Handle rejected/cancelled differently
  if (status === 'REJECTED' || status === 'CANCELLED') {
    return (
      <div className={`p-4 rounded-lg ${status === 'REJECTED' ? 'bg-red-50 border border-red-200' : 'bg-gray-50 border border-gray-200'}`}>
        <div className="flex items-center gap-3">
          <XCircle className={`h-6 w-6 ${status === 'REJECTED' ? 'text-red-500' : 'text-gray-500'}`} />
          <div>
            <p className={`font-medium ${status === 'REJECTED' ? 'text-red-700' : 'text-gray-700'}`}>
              {status === 'REJECTED' ? 'Return Rejected' : 'Return Cancelled'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Progress line */}
      <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-200">
        <div
          className="h-full bg-lime-500 transition-all duration-500"
          style={{ width: `${Math.min((currentIndex / (steps.length - 1)) * 100, 100)}%` }}
        />
      </div>

      {/* Steps */}
      <div className="flex justify-between relative">
        {steps.map((step, index) => {
          const StepIcon = step.icon;
          const stepIndex = statusOrder.indexOf(step.key);
          const isComplete = currentIndex >= stepIndex;
          const isCurrent = status === step.key ||
            (status === 'INSPECTING' && step.key === 'ITEM_RECEIVED') ||
            (['REFUND_PROCESSING', 'EXCHANGE_PROCESSING'].includes(status) && step.key === 'ITEM_RECEIVED');

          return (
            <div key={step.key} className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center z-10 transition-colors ${
                  isComplete
                    ? 'bg-lime-500 text-white'
                    : isCurrent
                      ? 'bg-lime-500 text-white ring-4 ring-lime-100'
                      : 'bg-gray-200 text-gray-400'
                }`}
              >
                <StepIcon className="h-4 w-4" />
              </div>
              <span className={`text-xs mt-2 text-center ${
                isComplete || isCurrent ? 'text-gray-900 font-medium' : 'text-gray-400'
              }`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

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

export default function MyReturns() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { returns, loading, fetchReturns, updateTracking, cancelReturn } = useReturns();

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Dialog states
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showTrackingDialog, setShowTrackingDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Tracking form
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingCourier, setTrackingCourier] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth?redirect=/my-returns');
    }
  }, [user, authLoading, navigate]);

  // Filter returns
  const filteredReturns = returns.filter(r => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'active') {
      return !['COMPLETED', 'CANCELLED', 'REJECTED'].includes(r.status);
    }
    return r.status === statusFilter;
  });

  // Handle tracking submission
  const handleSubmitTracking = async () => {
    if (!selectedReturn || !trackingNumber) return;

    setSubmitting(true);
    const success = await updateTracking(selectedReturn.id, trackingNumber, trackingCourier);
    setSubmitting(false);

    if (success) {
      setShowTrackingDialog(false);
      setTrackingNumber('');
      setTrackingCourier('');
      setSelectedReturn(null);
    }
  };

  // Handle cancel
  const handleCancel = async () => {
    if (!selectedReturn) return;

    setSubmitting(true);
    const success = await cancelReturn(selectedReturn.id);
    setSubmitting(false);

    if (success) {
      setShowCancelDialog(false);
      setSelectedReturn(null);
    }
  };

  // Copy RMA number
  const copyRMA = (rmaNumber: string) => {
    navigator.clipboard.writeText(rmaNumber);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-lime-600" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
        {/* Back button */}
        <Link
          to="/my-orders"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-lime-700 mb-6 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to My Orders
        </Link>

        {/* Header */}
        <div className="mb-6 border-b border-gray-200 pb-4">
          <h1 className="text-3xl font-heading font-bold text-gray-900 uppercase italic mb-2">
            My Returns
          </h1>
          <p className="text-sm text-gray-500 uppercase tracking-wider font-medium">
            Track and manage your return requests
          </p>
        </div>

        {/* Filter */}
        <div className="mb-6 flex items-center gap-4">
          <Label className="text-sm text-gray-600">Filter by status:</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Returns</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="ITEM_SHIPPED">Shipped</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-lime-600" />
              <p className="text-gray-500">Loading returns...</p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredReturns.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <RotateCcw className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {statusFilter === 'all' ? 'No Returns Yet' : 'No Returns Found'}
              </h3>
              <p className="text-gray-500 mb-4">
                {statusFilter === 'all'
                  ? "You haven't made any return requests yet."
                  : "No returns match the selected filter."}
              </p>
              <Link to="/my-orders">
                <Button variant="outline">
                  Go to My Orders
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Returns list */}
        {!loading && filteredReturns.length > 0 && (
          <div className="space-y-4">
            {filteredReturns.map(returnItem => (
              <Card
                key={returnItem.id}
                className={`hover:shadow-md transition-shadow cursor-pointer border-l-4 ${
                  returnItem.status === 'REJECTED' ? 'border-l-red-500' :
                  returnItem.status === 'CANCELLED' ? 'border-l-gray-400' :
                  returnItem.status === 'COMPLETED' ? 'border-l-green-500' :
                  'border-l-lime-500'
                }`}
                onClick={() => {
                  setSelectedReturn(returnItem);
                  setShowDetailDialog(true);
                }}
              >
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Left section */}
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <RotateCcw className="h-6 w-6 text-gray-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-bold text-gray-900">
                            {returnItem.return_no}
                          </span>
                          <StatusBadge status={returnItem.status} />
                        </div>
                        <p className="text-sm text-gray-500">
                          {returnItem.return_items?.length || 0} item(s) ·{' '}
                          {getReturnReasonLabel(returnItem.reason)}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Submitted on {formatDate(returnItem.created_at)}
                        </p>
                      </div>
                    </div>

                    {/* Right section */}
                    <div className="flex items-center gap-3">
                      {returnItem.refund_amount && (
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Refund Amount</p>
                          <p className="font-bold text-gray-900">
                            RM {returnItem.refund_amount.toFixed(2)}
                          </p>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex gap-2">
                        {returnItem.status === 'APPROVED' && !returnItem.return_tracking_number && (
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedReturn(returnItem);
                              setShowTrackingDialog(true);
                            }}
                          >
                            Add Tracking
                          </Button>
                        )}

                        {returnItem.status === 'PENDING' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedReturn(returnItem);
                              setShowCancelDialog(true);
                            }}
                          >
                            Cancel
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedReturn(returnItem);
                            setShowDetailDialog(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Footer />

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
              {/* Timeline */}
              <ReturnTimeline status={selectedReturn.status} />

              {/* RMA Number */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">RMA Number</p>
                    <p className="font-mono font-bold text-lg">{selectedReturn.return_no}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyRMA(selectedReturn.return_no)}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </Button>
                </div>
              </div>

              {/* Return details grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Return Reason</p>
                  <p className="font-medium">{getReturnReasonLabel(selectedReturn.reason)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Refund Method</p>
                  <p className="font-medium">{getRefundMethodLabel(selectedReturn.refund_method)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Return Shipping</p>
                  <p className={`font-medium ${selectedReturn.return_shipping_free ? 'text-green-600' : ''}`}>
                    {selectedReturn.return_shipping_free ? 'FREE (Prepaid Label)' : 'Customer Pays'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Refund Amount</p>
                  <p className="font-bold text-lg">
                    RM {(selectedReturn.refund_amount || 0).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Reason details */}
              {selectedReturn.reason_details && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Additional Details</p>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                    {selectedReturn.reason_details}
                  </p>
                </div>
              )}

              {/* Return items */}
              {selectedReturn.return_items && selectedReturn.return_items.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Items Being Returned</p>
                  <div className="space-y-2">
                    {selectedReturn.return_items.map(item => (
                      <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Package className="h-8 w-8 text-gray-400" />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.component_name}</p>
                          <p className="text-xs text-gray-500">
                            SKU: {item.component_sku} · Qty: {item.quantity}
                          </p>
                        </div>
                        <p className="font-medium">
                          RM {(item.quantity * item.unit_price).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tracking info */}
              {selectedReturn.return_tracking_number && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-600 mb-1">Return Tracking Number</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-mono font-bold">{selectedReturn.return_tracking_number}</p>
                      {selectedReturn.return_courier && (
                        <p className="text-xs text-blue-600">via {selectedReturn.return_courier}</p>
                      )}
                    </div>
                    {selectedReturn.return_courier === 'J&T' && (
                      <a
                        href={`https://www.jtexpress.my/tracking?awb=${selectedReturn.return_tracking_number}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <ExternalLink className="h-5 w-5" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Rejection reason */}
              {selectedReturn.status === 'REJECTED' && selectedReturn.rejection_reason && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs text-red-600 mb-1">Rejection Reason</p>
                  <p className="text-sm text-red-700">{selectedReturn.rejection_reason}</p>
                </div>
              )}

              {/* Images */}
              {selectedReturn.return_images && selectedReturn.return_images.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Attached Photos</p>
                  <div className="grid grid-cols-4 gap-2">
                    {selectedReturn.return_images.map(img => (
                      <a
                        key={img.id}
                        href={img.image_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <img
                          src={img.image_url}
                          alt="Return photo"
                          className="w-full aspect-square object-cover rounded-lg border hover:opacity-80 transition-opacity"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="text-xs text-gray-400 space-y-1 border-t pt-4">
                <p>Submitted: {formatDate(selectedReturn.created_at)}</p>
                {selectedReturn.approved_at && (
                  <p>Approved: {formatDate(selectedReturn.approved_at)}</p>
                )}
                {selectedReturn.item_shipped_at && (
                  <p>Item Shipped: {formatDate(selectedReturn.item_shipped_at)}</p>
                )}
                {selectedReturn.item_received_at && (
                  <p>Item Received: {formatDate(selectedReturn.item_received_at)}</p>
                )}
                {selectedReturn.completed_at && (
                  <p>Completed: {formatDate(selectedReturn.completed_at)}</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Tracking Dialog */}
      <Dialog open={showTrackingDialog} onOpenChange={setShowTrackingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Return Tracking</DialogTitle>
            <DialogDescription>
              Enter the tracking number for your return shipment
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="courier">Courier (Optional)</Label>
              <Select value={trackingCourier} onValueChange={setTrackingCourier}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select courier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="J&T">J&T Express</SelectItem>
                  <SelectItem value="Pos Laju">Pos Laju</SelectItem>
                  <SelectItem value="DHL">DHL</SelectItem>
                  <SelectItem value="FedEx">FedEx</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="tracking">Tracking Number *</Label>
              <Input
                id="tracking"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="e.g., JNT123456789"
                className="mt-2"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowTrackingDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitTracking}
              disabled={!trackingNumber || submitting}
              className="bg-lime-600 hover:bg-lime-700"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Tracking'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Cancel Return Request?
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this return request? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(false)}
            >
              Keep Return
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Yes, Cancel Return'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
