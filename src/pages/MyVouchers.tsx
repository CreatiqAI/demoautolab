import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tag, Calendar, Percent, DollarSign, Copy, Check, ShoppingCart, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Voucher {
  id: string;
  code: string;
  name: string;
  description: string;
  discount_type: string;
  discount_value: number;
  max_discount_amount: number | null;
  min_purchase_amount: number;
  max_usage_per_user: number;
  valid_until: string | null;
  times_used: number;
  can_still_use: boolean;
}

export default function MyVouchers() {
  const { user } = useAuth();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchAvailableVouchers();
    }
  }, [user]);

  const fetchAvailableVouchers = async () => {
    try {
      // Get customer profile ID
      const { data: profile } = await supabase
        .from('customer_profiles' as any)
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) {
        setLoading(false);
        return;
      }

      // Get available vouchers using the function
      const { data, error } = await (supabase.rpc as any)('get_available_vouchers_for_customer', {
        p_customer_id: (profile as any).id
      });

      if (error) throw error;

      setVouchers((data as any) || []);
    } catch (error: any) {
      console.error('Error fetching vouchers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load vouchers',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No expiry';
    return new Date(dateString).toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDiscountDisplay = (voucher: Voucher) => {
    if (voucher.discount_type === 'PERCENTAGE') {
      const maxCap = voucher.max_discount_amount ? ` (max RM ${voucher.max_discount_amount})` : '';
      return `${voucher.discount_value}% OFF${maxCap}`;
    }
    return `RM ${voucher.discount_value} OFF`;
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast({
      title: 'Copied!',
      description: `Voucher code "${code}" copied to clipboard`
    });

    setTimeout(() => {
      setCopiedCode(null);
    }, 2000);
  };

  const getUsageColor = (voucher: Voucher) => {
    const usagePercentage = (voucher.times_used / voucher.max_usage_per_user) * 100;
    if (usagePercentage >= 100) return 'text-red-600';
    if (usagePercentage >= 50) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Vouchers</h1>
          <p className="text-muted-foreground">
            View and use your available discount vouchers
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : vouchers.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Tag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No vouchers available</h3>
              <p className="text-muted-foreground mb-4">
                There are currently no vouchers available for your account
              </p>
              <Button onClick={() => window.location.href = '/catalog'}>
                <ShoppingCart className="h-4 w-4 mr-2" />
                Start Shopping
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vouchers.map((voucher) => (
                <Card
                  key={voucher.id}
                  className={`hover:shadow-lg transition-shadow ${!voucher.can_still_use ? 'opacity-60' : ''}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {voucher.discount_type === 'PERCENTAGE' ? (
                          <div className="p-2 bg-green-100 rounded-lg">
                            <Percent className="h-5 w-5 text-green-600" />
                          </div>
                        ) : (
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <DollarSign className="h-5 w-5 text-blue-600" />
                          </div>
                        )}
                        <div>
                          <Badge variant="secondary" className="text-sm font-mono">
                            {voucher.code}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyCode(voucher.code)}
                        className="h-8 w-8 p-0"
                      >
                        {copiedCode === voucher.code ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    <CardTitle className="text-lg">{voucher.name}</CardTitle>
                    <CardDescription>{voucher.description}</CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    {/* Discount Amount */}
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-purple-700">
                        {getDiscountDisplay(voucher)}
                      </p>
                    </div>

                    {/* Minimum Purchase */}
                    {voucher.min_purchase_amount > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Min. Purchase</span>
                        <span className="font-medium">RM {voucher.min_purchase_amount}</span>
                      </div>
                    )}

                    {/* Usage Status */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Usage</span>
                      <span className={`font-medium ${getUsageColor(voucher)}`}>
                        {voucher.times_used} / {voucher.max_usage_per_user} used
                      </span>
                    </div>

                    {/* Valid Until */}
                    <div className="flex items-center justify-between text-sm pt-2 border-t">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>Valid until</span>
                      </div>
                      <span className="font-medium">{formatDate(voucher.valid_until)}</span>
                    </div>

                    {/* Status Badge */}
                    <div className="pt-2">
                      {voucher.can_still_use ? (
                        <Badge className="w-full justify-center bg-green-100 text-green-800 hover:bg-green-100">
                          <Check className="h-3 w-3 mr-1" />
                          Available to Use
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="w-full justify-center">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Usage Limit Reached
                        </Badge>
                      )}
                    </div>

                    {/* Copy Code Button */}
                    {voucher.can_still_use && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => handleCopyCode(voucher.code)}
                      >
                        {copiedCode === voucher.code ? (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Code
                          </>
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Info Card */}
            <Card className="mt-8 bg-blue-50 border-blue-200">
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-blue-900 mb-1">How to use vouchers</h4>
                    <p className="text-sm text-blue-800">
                      1. Copy your voucher code<br />
                      2. Add items to cart and proceed to checkout<br />
                      3. Enter the voucher code in the "Apply Voucher" section<br />
                      4. Your discount will be automatically applied to the total
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
