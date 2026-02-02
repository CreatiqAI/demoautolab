import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useReturns, ReturnReason, RefundMethod, getReturnReasonLabel, getRefundMethodLabel } from '@/hooks/useReturns';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  ArrowLeft,
  Package,
  AlertTriangle,
  CheckCircle,
  Clock,
  Camera,
  Upload,
  X,
  Loader2,
  AlertCircle,
  Info
} from 'lucide-react';

interface OrderItem {
  id: string;
  component_sku: string;
  component_name: string;
  component_image: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Order {
  id: string;
  order_no: string;
  customer_name: string;
  status: string;
  total: number;
  created_at: string;
  updated_at: string;
  delivered_at: string | null;
  order_items: OrderItem[];
}

export default function ReturnRequest() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { checkEligibility, createReturn, uploadReturnImages, loading: returnLoading } = useReturns();

  const orderId = searchParams.get('orderId');

  // State
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [eligibility, setEligibility] = useState<{
    eligible: boolean;
    reason: string;
    days_remaining: number;
  } | null>(null);

  // Form state
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [reason, setReason] = useState<ReturnReason | ''>('');
  const [reasonDetails, setReasonDetails] = useState('');
  const [refundMethod, setRefundMethod] = useState<RefundMethod | ''>('');
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);

  // Success dialog
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdReturnNo, setCreatedReturnNo] = useState('');

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth?redirect=/return-request');
    }
  }, [user, authLoading, navigate]);

  // Load order and check eligibility
  useEffect(() => {
    const loadOrderAndCheckEligibility = async () => {
      if (!orderId || !user) return;

      setLoading(true);

      try {
        // Fetch order details
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select(`
            id,
            order_no,
            customer_name,
            status,
            total,
            created_at,
            updated_at,
            delivered_at,
            order_items (
              id,
              component_sku,
              component_name,
              quantity,
              unit_price,
              total_price
            )
          `)
          .eq('id', orderId)
          .eq('user_id', user.id)
          .single();

        if (orderError) throw orderError;

        // Get component images
        const skus = orderData.order_items.map((item: any) => item.component_sku);
        const { data: components } = await supabase
          .from('component_library')
          .select('component_sku, default_image_url')
          .in('component_sku', skus);

        const imageMap = new Map(
          (components || []).map((c: any) => [c.component_sku, c.default_image_url])
        );

        const orderWithImages = {
          ...orderData,
          order_items: orderData.order_items.map((item: any) => ({
            ...item,
            component_image: imageMap.get(item.component_sku) || null
          }))
        };

        setOrder(orderWithImages);

        // Check eligibility
        const eligibilityResult = await checkEligibility(orderId);
        setEligibility(eligibilityResult);
      } catch (err) {
        console.error('Error loading order:', err);
        setEligibility({
          eligible: false,
          reason: 'Failed to load order details',
          days_remaining: 0
        });
      } finally {
        setLoading(false);
      }
    };

    loadOrderAndCheckEligibility();
  }, [orderId, user, checkEligibility]);

  // Handle item selection
  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Limit to 5 images
    const newImages = [...images, ...files].slice(0, 5);
    setImages(newImages);

    // Create preview URLs
    const newUrls = newImages.map(file => URL.createObjectURL(file));
    setImagePreviewUrls(prev => {
      // Revoke old URLs to prevent memory leaks
      prev.forEach(url => URL.revokeObjectURL(url));
      return newUrls;
    });
  };

  // Remove image
  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviewUrls[index]);
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  // Calculate refund amount
  const calculateRefundAmount = () => {
    if (!order) return 0;
    return order.order_items
      .filter(item => selectedItems.has(item.id))
      .reduce((sum, item) => sum + item.total_price, 0);
  };

  // Validate form
  const isFormValid = () => {
    if (selectedItems.size === 0) return false;
    if (!reason) return false;
    if (!refundMethod) return false;
    // Photos required for defective items
    if (reason === 'DEFECTIVE' && images.length === 0) return false;
    return true;
  };

  // Submit return request
  const handleSubmit = async () => {
    if (!order || !reason || !refundMethod) return;

    const selectedOrderItems = order.order_items.filter(item =>
      selectedItems.has(item.id)
    );

    const returnData = {
      order_id: order.id,
      reason: reason as ReturnReason,
      reason_details: reasonDetails || undefined,
      refund_method: refundMethod as RefundMethod,
      items: selectedOrderItems.map(item => ({
        order_item_id: item.id,
        component_sku: item.component_sku,
        component_name: item.component_name,
        quantity: item.quantity,
        unit_price: item.unit_price
      }))
    };

    const createdReturn = await createReturn(returnData);

    if (createdReturn) {
      // Upload images if any
      if (images.length > 0) {
        await uploadReturnImages(createdReturn.id, images);
      }

      setCreatedReturnNo(createdReturn.return_no);
      setShowSuccess(true);
    }
  };

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-lime-600" />
            <p className="text-gray-500">Loading order details...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // No order ID
  if (!orderId) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <Card className="max-w-lg mx-auto">
            <CardContent className="pt-6 text-center">
              <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">No Order Selected</h2>
              <p className="text-gray-500 mb-4">
                Please select an order from your order history to request a return.
              </p>
              <Link to="/my-orders">
                <Button className="bg-lime-600 hover:bg-lime-700">
                  Go to My Orders
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Not eligible
  if (eligibility && !eligibility.eligible) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <Link
            to="/my-orders"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-lime-700 mb-6 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to My Orders
          </Link>

          <Card className="max-w-lg mx-auto">
            <CardContent className="pt-6 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Return Not Available</h2>
              <p className="text-gray-600 mb-4">{eligibility.reason}</p>
              <Link to="/return-policy">
                <Button variant="outline">View Return Policy</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        {/* Back button */}
        <Link
          to="/my-orders"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-lime-700 mb-6 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to My Orders
        </Link>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-heading font-bold text-gray-900 uppercase italic mb-2">
            Request a Return
          </h1>
          <p className="text-sm text-gray-500 uppercase tracking-wider font-medium">
            Order #{order?.order_no}
          </p>
        </div>

        {/* Eligibility banner */}
        {eligibility && eligibility.eligible && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-green-800">Eligible for Return</p>
              <p className="text-sm text-green-700">
                You have <strong>{eligibility.days_remaining} day{eligibility.days_remaining !== 1 ? 's' : ''}</strong> remaining
                to submit a return request.
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Select Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-lime-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    1
                  </span>
                  Select Items to Return
                </CardTitle>
                <CardDescription>
                  Choose which items you want to return from this order
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {order?.order_items.map(item => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-4 p-3 rounded-lg border transition-colors cursor-pointer ${
                      selectedItems.has(item.id)
                        ? 'border-lime-500 bg-lime-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => toggleItemSelection(item.id)}
                  >
                    <Checkbox
                      checked={selectedItems.has(item.id)}
                      onCheckedChange={() => toggleItemSelection(item.id)}
                      className="data-[state=checked]:bg-lime-600"
                    />
                    <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      {item.component_image ? (
                        <img
                          src={item.component_image}
                          alt={item.component_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {item.component_name}
                      </p>
                      <p className="text-sm text-gray-500">
                        SKU: {item.component_sku} · Qty: {item.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        RM {item.total_price.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}

                {selectedItems.size === 0 && (
                  <p className="text-sm text-amber-600 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Please select at least one item to return
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Step 2: Return Reason */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-lime-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    2
                  </span>
                  Reason for Return
                </CardTitle>
                <CardDescription>
                  Why are you returning these items?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <RadioGroup
                  value={reason}
                  onValueChange={(value) => setReason(value as ReturnReason)}
                >
                  <div className="flex items-start space-x-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 cursor-pointer">
                    <RadioGroupItem value="DEFECTIVE" id="defective" className="mt-1" />
                    <Label htmlFor="defective" className="cursor-pointer flex-1">
                      <span className="font-medium">Defective / Damaged</span>
                      <p className="text-sm text-gray-500">
                        The product arrived damaged, broken, or doesn't work properly
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        ✓ Free return shipping
                      </p>
                    </Label>
                  </div>

                  <div className="flex items-start space-x-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 cursor-pointer">
                    <RadioGroupItem value="WRONG_ITEM" id="wrong_item" className="mt-1" />
                    <Label htmlFor="wrong_item" className="cursor-pointer flex-1">
                      <span className="font-medium">Wrong Item Received</span>
                      <p className="text-sm text-gray-500">
                        I received a different product than what I ordered
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Customer pays return shipping
                      </p>
                    </Label>
                  </div>
                </RadioGroup>

                <div>
                  <Label htmlFor="details">Additional Details (Optional)</Label>
                  <Textarea
                    id="details"
                    placeholder="Please describe the issue in detail..."
                    value={reasonDetails}
                    onChange={(e) => setReasonDetails(e.target.value)}
                    className="mt-2"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Step 3: Upload Photos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-lime-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    3
                  </span>
                  Upload Photos
                  {reason === 'DEFECTIVE' && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                      Required
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  {reason === 'DEFECTIVE'
                    ? 'Please upload photos showing the defect or damage'
                    : 'Upload photos to help us process your return faster (optional)'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Image previews */}
                {imagePreviewUrls.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-4">
                    {imagePreviewUrls.map((url, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={url}
                          alt={`Upload ${index + 1}`}
                          className="w-full aspect-square object-cover rounded-lg border"
                        />
                        <button
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload button */}
                {images.length < 5 && (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-lime-500 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Camera className="h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">
                        Click to upload photos
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Max 5 photos · PNG, JPG up to 10MB
                      </p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                )}

                {reason === 'DEFECTIVE' && images.length === 0 && (
                  <p className="text-sm text-amber-600 flex items-center gap-2 mt-3">
                    <Info className="h-4 w-4" />
                    Photos are required for defective item returns
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Step 4: Refund Method */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-lime-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    4
                  </span>
                  Refund Method
                </CardTitle>
                <CardDescription>
                  How would you like to receive your refund?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={refundMethod}
                  onValueChange={(value) => setRefundMethod(value as RefundMethod)}
                >
                  <div className="flex items-start space-x-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 cursor-pointer">
                    <RadioGroupItem value="ORIGINAL_PAYMENT" id="original" className="mt-1" />
                    <Label htmlFor="original" className="cursor-pointer flex-1">
                      <span className="font-medium">Refund to Original Payment Method</span>
                      <p className="text-sm text-gray-500">
                        Refund will be processed to your original payment method (3-5 business days)
                      </p>
                    </Label>
                  </div>

                  <div className="flex items-start space-x-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 cursor-pointer">
                    <RadioGroupItem value="EXCHANGE" id="exchange" className="mt-1" />
                    <Label htmlFor="exchange" className="cursor-pointer flex-1">
                      <span className="font-medium">Exchange for Replacement</span>
                      <p className="text-sm text-gray-500">
                        We'll send you a replacement item once we receive the return
                      </p>
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>
          </div>

          {/* Summary sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Return Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Items Selected</span>
                    <span className="font-medium">{selectedItems.size}</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Reason</span>
                    <span className="font-medium">
                      {reason ? getReturnReasonLabel(reason) : '-'}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Refund Method</span>
                    <span className="font-medium">
                      {refundMethod ? getRefundMethodLabel(refundMethod) : '-'}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Return Shipping</span>
                    <span className={`font-medium ${reason === 'DEFECTIVE' ? 'text-green-600' : ''}`}>
                      {reason === 'DEFECTIVE' ? 'FREE' : 'Customer Pays'}
                    </span>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex justify-between">
                      <span className="font-medium">Refund Amount</span>
                      <span className="font-bold text-lg">
                        RM {calculateRefundAmount().toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <Button
                    onClick={handleSubmit}
                    disabled={!isFormValid() || returnLoading}
                    className="w-full bg-lime-600 hover:bg-lime-700"
                  >
                    {returnLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Return Request'
                    )}
                  </Button>

                  <p className="text-xs text-gray-500 text-center">
                    By submitting, you agree to our{' '}
                    <Link to="/return-policy" className="text-lime-600 hover:underline">
                      Return Policy
                    </Link>
                  </p>
                </CardContent>
              </Card>

              {/* Help card */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-4">
                  <h4 className="font-medium text-blue-900 mb-2">Need Help?</h4>
                  <p className="text-sm text-blue-700 mb-3">
                    If you have questions about our return process, check our return policy or contact support.
                  </p>
                  <Link to="/return-policy">
                    <Button variant="outline" size="sm" className="w-full">
                      View Return Policy
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Success Dialog */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-6 w-6" />
              Return Request Submitted
            </DialogTitle>
            <DialogDescription>
              Your return request has been submitted successfully.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 bg-gray-50 rounded-lg text-center">
              <p className="text-sm text-gray-500 mb-1">Your RMA Number</p>
              <p className="text-2xl font-mono font-bold text-gray-900">
                {createdReturnNo}
              </p>
            </div>

            <div className="space-y-2 text-sm text-gray-600">
              <p className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                We'll review your request within 1-2 business days
              </p>
              <p className="flex items-start gap-2">
                <Package className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                Once approved, you'll receive instructions for shipping the item back
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Link to="/my-returns" className="flex-1">
              <Button className="w-full bg-lime-600 hover:bg-lime-700">
                View My Returns
              </Button>
            </Link>
            <Link to="/my-orders" className="flex-1">
              <Button variant="outline" className="w-full">
                Back to Orders
              </Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
