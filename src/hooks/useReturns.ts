import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

// ============================================================================
// Types
// ============================================================================

export type ReturnStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'ITEM_SHIPPED'
  | 'ITEM_RECEIVED'
  | 'INSPECTING'
  | 'REFUND_PROCESSING'
  | 'EXCHANGE_PROCESSING'
  | 'COMPLETED'
  | 'CANCELLED';

export type ReturnReason = 'DEFECTIVE' | 'WRONG_ITEM';

export type RefundMethod = 'ORIGINAL_PAYMENT' | 'EXCHANGE';

export interface ReturnItem {
  id: string;
  return_id: string;
  order_item_id: string;
  component_sku: string;
  component_name: string;
  quantity: number;
  unit_price: number;
  item_condition: string | null;
  created_at: string;
}

export interface ReturnImage {
  id: string;
  return_id: string;
  image_url: string;
  description: string | null;
  uploaded_at: string;
}

export interface Return {
  id: string;
  return_no: string;
  order_id: string;
  customer_id: string;
  reason: ReturnReason;
  reason_details: string | null;
  refund_method: RefundMethod;
  status: ReturnStatus;
  return_shipping_free: boolean;
  return_tracking_number: string | null;
  return_courier: string | null;
  refund_amount: number | null;
  exchange_order_id: string | null;
  admin_notes: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  approved_by: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  item_shipped_at: string | null;
  item_received_at: string | null;
  completed_at: string | null;
  // Joined data
  return_items?: ReturnItem[];
  return_images?: ReturnImage[];
  order?: {
    order_no: string;
    customer_name: string;
    customer_phone: string;
    customer_email: string | null;
  };
}

export interface ReturnEligibility {
  eligible: boolean;
  reason: string;
  days_remaining: number;
  order_status: string | null;
  delivery_date: string | null;
}

export interface CreateReturnData {
  order_id: string;
  reason: ReturnReason;
  reason_details?: string;
  refund_method: RefundMethod;
  items: {
    order_item_id: string;
    component_sku: string;
    component_name: string;
    quantity: number;
    unit_price: number;
    item_condition?: string;
  }[];
}

// ============================================================================
// Hook
// ============================================================================

export function useReturns() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [returns, setReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // Fetch customer's returns
  // ============================================================================
  const fetchReturns = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('returns' as any)
        .select(`
          *,
          return_items (*),
          return_images (*)
        `)
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setReturns((data as Return[]) || []);
    } catch (err: any) {
      console.error('Error fetching returns:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // ============================================================================
  // Check return eligibility for an order
  // ============================================================================
  const checkEligibility = async (orderId: string): Promise<ReturnEligibility | null> => {
    try {
      const { data, error } = await supabase
        .rpc('check_return_eligibility', { p_order_id: orderId });

      if (error) {
        console.error('Error checking eligibility:', error);
        // Fallback: manual check
        return await checkEligibilityFallback(orderId);
      }

      if (data && data.length > 0) {
        return data[0] as ReturnEligibility;
      }

      return null;
    } catch (err) {
      console.error('Error in checkEligibility:', err);
      return await checkEligibilityFallback(orderId);
    }
  };

  // Fallback eligibility check (if function doesn't exist)
  const checkEligibilityFallback = async (orderId: string): Promise<ReturnEligibility | null> => {
    try {
      // Get order details
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('id, status, updated_at, delivered_at')
        .eq('id', orderId)
        .single();

      if (orderError || !order) {
        return {
          eligible: false,
          reason: 'Order not found',
          days_remaining: 0,
          order_status: null,
          delivery_date: null
        };
      }

      // Check if delivered
      if (!['DELIVERED', 'COMPLETED'].includes(order.status)) {
        return {
          eligible: false,
          reason: 'Order has not been delivered yet. Returns can only be requested for delivered orders.',
          days_remaining: 0,
          order_status: order.status,
          delivery_date: null
        };
      }

      // Calculate days since delivery
      const deliveryDate = order.delivered_at || order.updated_at;
      const daysSinceDelivery = Math.floor(
        (Date.now() - new Date(deliveryDate).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceDelivery > 7) {
        return {
          eligible: false,
          reason: 'Return window has expired. Returns must be requested within 7 days of delivery.',
          days_remaining: 0,
          order_status: order.status,
          delivery_date: deliveryDate
        };
      }

      // Check for existing active returns
      const { data: existingReturns } = await supabase
        .from('returns' as any)
        .select('id')
        .eq('order_id', orderId)
        .not('status', 'in', '(CANCELLED,REJECTED,COMPLETED)');

      if (existingReturns && existingReturns.length > 0) {
        return {
          eligible: false,
          reason: 'An active return request already exists for this order.',
          days_remaining: 0,
          order_status: order.status,
          delivery_date: deliveryDate
        };
      }

      return {
        eligible: true,
        reason: 'Eligible for return',
        days_remaining: 7 - daysSinceDelivery,
        order_status: order.status,
        delivery_date: deliveryDate
      };
    } catch (err) {
      console.error('Fallback eligibility check error:', err);
      return null;
    }
  };

  // ============================================================================
  // Create a new return request
  // ============================================================================
  const createReturn = async (data: CreateReturnData): Promise<Return | null> => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to create a return request',
        variant: 'destructive'
      });
      return null;
    }

    setLoading(true);

    try {
      // First check eligibility
      const eligibility = await checkEligibility(data.order_id);
      if (!eligibility?.eligible) {
        toast({
          title: 'Cannot Create Return',
          description: eligibility?.reason || 'This order is not eligible for return',
          variant: 'destructive'
        });
        return null;
      }

      // Create the return record
      const { data: returnRecord, error: returnError } = await supabase
        .from('returns' as any)
        .insert({
          order_id: data.order_id,
          customer_id: user.id,
          reason: data.reason,
          reason_details: data.reason_details || null,
          refund_method: data.refund_method,
          status: 'PENDING'
        })
        .select()
        .single();

      if (returnError) throw returnError;

      // Add return items
      const returnItems = data.items.map(item => ({
        return_id: returnRecord.id,
        order_item_id: item.order_item_id,
        component_sku: item.component_sku,
        component_name: item.component_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        item_condition: item.item_condition || null
      }));

      const { error: itemsError } = await supabase
        .from('return_items' as any)
        .insert(returnItems);

      if (itemsError) {
        console.error('Error adding return items:', itemsError);
        // Don't fail the whole operation, items might be added manually
      }

      toast({
        title: 'Return Request Submitted',
        description: `Your return request ${returnRecord.return_no} has been submitted successfully.`
      });

      // Refresh returns list
      await fetchReturns();

      return returnRecord as Return;
    } catch (err: any) {
      console.error('Error creating return:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to create return request',
        variant: 'destructive'
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // Upload return images
  // ============================================================================
  const uploadReturnImages = async (
    returnId: string,
    files: File[]
  ): Promise<ReturnImage[]> => {
    const uploadedImages: ReturnImage[] = [];

    for (const file of files) {
      try {
        // Upload to storage
        const fileName = `returns/${returnId}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('return-images')
          .upload(fileName, file);

        if (uploadError) {
          console.error('Error uploading image:', uploadError);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('return-images')
          .getPublicUrl(fileName);

        // Save to database
        const { data: imageRecord, error: dbError } = await supabase
          .from('return_images' as any)
          .insert({
            return_id: returnId,
            image_url: urlData.publicUrl,
            description: file.name
          })
          .select()
          .single();

        if (dbError) {
          console.error('Error saving image record:', dbError);
          continue;
        }

        uploadedImages.push(imageRecord as ReturnImage);
      } catch (err) {
        console.error('Error processing image:', err);
      }
    }

    return uploadedImages;
  };

  // ============================================================================
  // Update return tracking info (customer adding tracking number)
  // ============================================================================
  const updateTracking = async (
    returnId: string,
    trackingNumber: string,
    courier?: string
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('returns' as any)
        .update({
          return_tracking_number: trackingNumber,
          return_courier: courier || null,
          status: 'ITEM_SHIPPED',
          item_shipped_at: new Date().toISOString()
        })
        .eq('id', returnId)
        .eq('customer_id', user?.id);

      if (error) throw error;

      toast({
        title: 'Tracking Updated',
        description: 'Your return tracking information has been saved.'
      });

      await fetchReturns();
      return true;
    } catch (err: any) {
      console.error('Error updating tracking:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to update tracking information',
        variant: 'destructive'
      });
      return false;
    }
  };

  // ============================================================================
  // Cancel a pending return
  // ============================================================================
  const cancelReturn = async (returnId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('returns' as any)
        .update({
          status: 'CANCELLED'
        })
        .eq('id', returnId)
        .eq('customer_id', user?.id)
        .eq('status', 'PENDING');

      if (error) throw error;

      toast({
        title: 'Return Cancelled',
        description: 'Your return request has been cancelled.'
      });

      await fetchReturns();
      return true;
    } catch (err: any) {
      console.error('Error cancelling return:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to cancel return',
        variant: 'destructive'
      });
      return false;
    }
  };

  // ============================================================================
  // Get a single return by ID
  // ============================================================================
  const getReturn = async (returnId: string): Promise<Return | null> => {
    try {
      const { data, error } = await supabase
        .from('returns' as any)
        .select(`
          *,
          return_items (*),
          return_images (*)
        `)
        .eq('id', returnId)
        .single();

      if (error) throw error;
      return data as Return;
    } catch (err) {
      console.error('Error fetching return:', err);
      return null;
    }
  };

  // ============================================================================
  // Admin Functions
  // ============================================================================

  // Fetch all returns (admin)
  const fetchAllReturns = async (statusFilter?: string): Promise<Return[]> => {
    try {
      let query = supabase
        .from('returns' as any)
        .select(`
          *,
          return_items (*),
          return_images (*)
        `)
        .order('created_at', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data as Return[]) || [];
    } catch (err) {
      console.error('Error fetching all returns:', err);
      return [];
    }
  };

  // Approve a return (admin)
  const approveReturn = async (returnId: string, notes?: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('returns' as any)
        .update({
          status: 'APPROVED',
          admin_notes: notes || null,
          approved_at: new Date().toISOString(),
          approved_by: user?.id
        })
        .eq('id', returnId);

      if (error) throw error;

      toast({
        title: 'Return Approved',
        description: 'The return request has been approved.'
      });

      return true;
    } catch (err: any) {
      console.error('Error approving return:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to approve return',
        variant: 'destructive'
      });
      return false;
    }
  };

  // Reject a return (admin)
  const rejectReturn = async (returnId: string, reason: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('returns' as any)
        .update({
          status: 'REJECTED',
          rejection_reason: reason,
          rejected_at: new Date().toISOString(),
          rejected_by: user?.id
        })
        .eq('id', returnId);

      if (error) throw error;

      toast({
        title: 'Return Rejected',
        description: 'The return request has been rejected.'
      });

      return true;
    } catch (err: any) {
      console.error('Error rejecting return:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to reject return',
        variant: 'destructive'
      });
      return false;
    }
  };

  // Update return status (admin)
  const updateReturnStatus = async (
    returnId: string,
    status: ReturnStatus,
    additionalData?: Partial<Return>
  ): Promise<boolean> => {
    try {
      const updateData: any = {
        status,
        ...additionalData
      };

      // Add timestamp based on status
      switch (status) {
        case 'ITEM_RECEIVED':
          updateData.item_received_at = new Date().toISOString();
          break;
        case 'COMPLETED':
          updateData.completed_at = new Date().toISOString();
          break;
      }

      const { error } = await supabase
        .from('returns' as any)
        .update(updateData)
        .eq('id', returnId);

      if (error) throw error;

      toast({
        title: 'Status Updated',
        description: `Return status changed to ${status.replace(/_/g, ' ')}`
      });

      return true;
    } catch (err: any) {
      console.error('Error updating return status:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to update return status',
        variant: 'destructive'
      });
      return false;
    }
  };

  // Load returns on mount
  useEffect(() => {
    if (user) {
      fetchReturns();
    }
  }, [user, fetchReturns]);

  return {
    // State
    returns,
    loading,
    error,

    // Customer functions
    fetchReturns,
    checkEligibility,
    createReturn,
    uploadReturnImages,
    updateTracking,
    cancelReturn,
    getReturn,

    // Admin functions
    fetchAllReturns,
    approveReturn,
    rejectReturn,
    updateReturnStatus
  };
}

// ============================================================================
// Helper functions
// ============================================================================

export function getReturnStatusLabel(status: ReturnStatus): string {
  const labels: Record<ReturnStatus, string> = {
    PENDING: 'Pending Review',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    ITEM_SHIPPED: 'Item Shipped',
    ITEM_RECEIVED: 'Item Received',
    INSPECTING: 'Inspecting',
    REFUND_PROCESSING: 'Processing Refund',
    EXCHANGE_PROCESSING: 'Processing Exchange',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled'
  };
  return labels[status] || status;
}

export function getReturnStatusColor(status: ReturnStatus): {
  bg: string;
  text: string;
  border: string;
} {
  const colors: Record<ReturnStatus, { bg: string; text: string; border: string }> = {
    PENDING: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
    APPROVED: { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' },
    REJECTED: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
    ITEM_SHIPPED: { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
    ITEM_RECEIVED: { bg: '#e0e7ff', text: '#3730a3', border: '#a5b4fc' },
    INSPECTING: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
    REFUND_PROCESSING: { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
    EXCHANGE_PROCESSING: { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
    COMPLETED: { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' },
    CANCELLED: { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' }
  };
  return colors[status] || colors.PENDING;
}

export function getReturnReasonLabel(reason: ReturnReason): string {
  const labels: Record<ReturnReason, string> = {
    DEFECTIVE: 'Defective / Damaged',
    WRONG_ITEM: 'Wrong Item Received'
  };
  return labels[reason] || reason;
}

export function getRefundMethodLabel(method: RefundMethod): string {
  const labels: Record<RefundMethod, string> = {
    ORIGINAL_PAYMENT: 'Refund to Original Payment',
    EXCHANGE: 'Exchange for Replacement'
  };
  return labels[method] || method;
}
