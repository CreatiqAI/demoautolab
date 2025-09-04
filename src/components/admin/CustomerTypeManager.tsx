import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Users, Store, ShoppingCart, DollarSign, Edit } from 'lucide-react';

interface Customer {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  customer_type: 'normal' | 'merchant';
  pricing_type: string;
  created_at: string;
  is_active: boolean;
}

interface CustomerTypeManagerProps {
  customer: Customer;
  onCustomerTypeUpdate?: () => void;
}

export function CustomerTypeManager({ customer, onCustomerTypeUpdate }: CustomerTypeManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newCustomerType, setNewCustomerType] = useState<'normal' | 'merchant'>(customer.customer_type);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const handleUpdateCustomerType = async () => {
    if (newCustomerType === customer.customer_type) {
      setIsDialogOpen(false);
      return;
    }

    try {
      setIsUpdating(true);

      // Get admin user info from localStorage (matches other admin components pattern)
      const adminUserStr = localStorage.getItem('admin_user');
      if (!adminUserStr) {
        throw new Error('Admin authentication required');
      }

      const adminUser = JSON.parse(adminUserStr);
      if (!adminUser.id) {
        throw new Error('Admin authentication required');
      }

      // Call the update function with admin_profiles.id
      const { data, error } = await supabase
        .rpc('update_customer_type', {
          customer_profile_id: customer.id,
          new_customer_type: newCustomerType,
          admin_id: adminUser.id
        });

      if (error) throw error;

      toast({
        title: "Customer Type Updated",
        description: `${customer.full_name} is now a ${newCustomerType} customer`,
      });

      setIsDialogOpen(false);
      if (onCustomerTypeUpdate) {
        onCustomerTypeUpdate();
      }

      // Force refresh pricing context for all users
      window.dispatchEvent(new CustomEvent('customerTypeChanged', {
        detail: { customerId: customer.id, newType: newCustomerType }
      }));

    } catch (error: any) {
      console.error('Error updating customer type:', error);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update customer type",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getCustomerTypeColor = (type: string) => {
    return type === 'merchant' 
      ? 'bg-blue-100 text-blue-800 border-blue-200' 
      : 'bg-green-100 text-green-800 border-green-200';
  };

  const getCustomerTypeIcon = (type: string) => {
    return type === 'merchant' ? Store : ShoppingCart;
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-auto p-2 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border"
        >
          <div className="flex items-center gap-2">
            {React.createElement(getCustomerTypeIcon(customer.customer_type), { 
              className: "h-4 w-4 text-muted-foreground" 
            })}
            <div className="text-left">
              <div className="text-xs font-medium text-foreground">
                {customer.customer_type === 'merchant' ? 'B2B Merchant' : 'B2C Customer'}
              </div>
              <div className="text-xs text-muted-foreground">
                Click to change
              </div>
            </div>
            <Edit className="h-3 w-3 text-muted-foreground ml-1" />
          </div>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-lg">
        <DialogHeader className="text-center">
          <DialogTitle className="text-xl">Change Customer Type</DialogTitle>
          <DialogDescription className="text-base">
            Update pricing category for <span className="font-semibold text-foreground">{customer.full_name}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Status - Cleaner Design */}
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-background rounded-full">
                {React.createElement(getCustomerTypeIcon(customer.customer_type), { 
                  className: "h-5 w-5 text-primary" 
                })}
              </div>
              <div>
                <p className="font-semibold text-sm">Current: {customer.customer_type === 'merchant' ? 'B2B Merchant' : 'B2C Customer'}</p>
                <p className="text-xs text-muted-foreground">
                  {customer.customer_type === 'merchant' 
                    ? 'Sees wholesale pricing' 
                    : 'Sees retail pricing'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Type Selection - Card Style */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-foreground">Select New Customer Type:</label>
            <div className="grid gap-3">
              <div 
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                  newCustomerType === 'normal' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setNewCustomerType('normal')}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-full">
                    <ShoppingCart className="h-4 w-4 text-green-700" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">B2C Customer (Normal)</p>
                      {newCustomerType === 'normal' && (
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">Retail pricing for individual customers</p>
                  </div>
                </div>
              </div>

              <div 
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                  newCustomerType === 'merchant' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setNewCustomerType('merchant')}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <Store className="h-4 w-4 text-blue-700" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">B2B Merchant (Wholesale)</p>
                      {newCustomerType === 'merchant' && (
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">Wholesale pricing for business customers</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Impact Notice */}
          {newCustomerType !== customer.customer_type && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="p-1 bg-amber-100 rounded-full mt-0.5">
                  <DollarSign className="h-3 w-3 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-amber-800">Pricing Will Change</p>
                  <p className="text-xs text-amber-700 mt-1">
                    {customer.full_name} will see {newCustomerType === 'merchant' ? 'wholesale' : 'retail'} prices 
                    immediately after this change.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons - Improved */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="flex-1 h-11"
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateCustomerType}
              disabled={isUpdating || newCustomerType === customer.customer_type}
              className="flex-1 h-11 bg-primary hover:bg-primary/90"
            >
              {isUpdating ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Updating...
                </div>
              ) : (
                <>
                  <Users className="h-4 w-4 mr-2" />
                  Confirm Change
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}