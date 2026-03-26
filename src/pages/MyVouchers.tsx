import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Percent, DollarSign, ShoppingCart, AlertCircle, Ticket, ArrowLeft, Coins, Gift, Clock, ChevronRight, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link, useSearchParams } from 'react-router-dom';
import MyPoints from './MyPoints';

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
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'vouchers';
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (user) fetchAvailableVouchers();
  }, [user]);

  const fetchAvailableVouchers = async () => {
    try {
      const { data: profile } = await supabase
        .from('customer_profiles' as any)
        .select('id')
        .eq('user_id', user?.id)
        .single();
      if (!profile) { setLoading(false); return; }
      const { data, error } = await (supabase.rpc as any)('get_available_vouchers_for_customer', { p_customer_id: (profile as any).id });
      if (error) throw error;
      setVouchers((data as any) || []);
    } catch {
      toast({ title: 'Error', description: 'Failed to load vouchers', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No expiry';
    return new Date(dateString).toLocaleDateString('en-MY', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getDiscountDisplay = (voucher: Voucher) => {
    if (voucher.discount_type === 'PERCENTAGE') return `${voucher.discount_value}%`;
    return `RM${voucher.discount_value}`;
  };

  const getDiscountLabel = (voucher: Voucher) => {
    if (voucher.discount_type === 'PERCENTAGE' && voucher.max_discount_amount) return `Capped at RM${voucher.max_discount_amount}`;
    return '';
  };

  const isExpiringSoon = (dateString: string | null) => {
    if (!dateString) return false;
    const daysLeft = Math.ceil((new Date(dateString).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysLeft <= 7 && daysLeft > 0;
  };

  const isExpired = (dateString: string | null) => {
    if (!dateString) return false;
    return new Date(dateString).getTime() < Date.now();
  };

  return (
    <div className="bg-gray-50 flex flex-col">
      <Header />
      <main className="container mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8 min-h-[calc(100vh-80px)]">
        <Link to="/catalog" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-gray-900 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Shop
        </Link>

        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Rewards & Vouchers</h2>
          <p className="text-sm text-muted-foreground">Your rewards, vouchers, and loyalty points</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-6 border-b border-gray-200">
          <button
            onClick={() => setSearchParams({})}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
              activeTab === 'vouchers'
                ? 'text-gray-900 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-gray-900'
                : 'text-muted-foreground hover:text-gray-900'
            }`}
          >
            <Ticket className="h-4 w-4 inline mr-1.5 -mt-0.5" />
            Vouchers
          </button>
          <button
            onClick={() => setSearchParams({ tab: 'points' })}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
              activeTab === 'points'
                ? 'text-gray-900 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-gray-900'
                : 'text-muted-foreground hover:text-gray-900'
            }`}
          >
            <Coins className="h-4 w-4 inline mr-1.5 -mt-0.5" />
            My Points
          </button>
        </div>

        {activeTab === 'points' ? (
          <MyPoints embedded />
        ) : loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          </div>
        ) : vouchers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Gift className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Vouchers Available</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                Check back later for exclusive deals and promotions.
              </p>
              <Button asChild>
                <Link to="/catalog">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Start Shopping
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Voucher Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {vouchers.map((voucher) => (
                <Card
                  key={voucher.id}
                  className={`overflow-hidden ${!voucher.can_still_use ? 'opacity-50' : ''}`}
                >
                  <CardContent className="p-0">
                    {/* Discount header */}
                    <div className="flex items-center gap-4 p-4 border-b">
                      <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${
                        voucher.discount_type === 'PERCENTAGE' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'
                      }`}>
                        <span className="text-lg font-bold leading-none">{getDiscountDisplay(voucher)}</span>
                        <span className="text-[9px] font-semibold uppercase mt-0.5">OFF</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-gray-900 truncate">{voucher.name}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2">{voucher.description}</p>
                        {getDiscountLabel(voucher) && <p className="text-xs text-muted-foreground mt-0.5">{getDiscountLabel(voucher)}</p>}
                      </div>
                      {voucher.can_still_use && isExpiringSoon(voucher.valid_until) && (
                        <Badge variant="outline" className="border-orange-200 text-orange-600 text-[10px] flex-shrink-0">
                          <Clock className="h-3 w-3 mr-1" />Expiring
                        </Badge>
                      )}
                    </div>

                    {/* Details */}
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        {voucher.min_purchase_amount > 0 && (
                          <span>Min. spend <span className="font-medium text-gray-900">RM{voucher.min_purchase_amount}</span></span>
                        )}
                        <span className="flex items-center gap-1 ml-auto">
                          <Calendar className="h-3 w-3" />
                          {formatDate(voucher.valid_until)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{voucher.times_used}/{voucher.max_usage_per_user} used</span>
                        <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              voucher.times_used >= voucher.max_usage_per_user ? 'bg-red-400' : 'bg-green-400'
                            }`}
                            style={{ width: `${Math.min((voucher.times_used / voucher.max_usage_per_user) * 100, 100)}%` }}
                          />
                        </div>
                      </div>

                      {voucher.can_still_use ? (
                        <Button asChild className="w-full" size="sm">
                          <Link to="/catalog">
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            Shop Now
                          </Link>
                        </Button>
                      ) : (
                        <div className="w-full py-2 bg-gray-100 text-muted-foreground font-medium text-xs rounded-md flex items-center justify-center gap-1.5">
                          <AlertCircle className="h-3.5 w-3.5" />
                          {isExpired(voucher.valid_until) ? 'Expired' : 'Limit Reached'}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* How to Use */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  <h4 className="font-semibold text-sm">How to Use Your Vouchers</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { step: '1', title: 'Browse & Add to Cart', desc: 'Browse the catalog and add items to your shopping cart.' },
                    { step: '2', title: 'Proceed to Checkout', desc: 'Open your cart and click "Proceed to Checkout".' },
                    { step: '3', title: 'Select Your Voucher', desc: 'Eligible vouchers appear automatically. Select one to apply.' },
                    { step: '4', title: 'Discount Applied', desc: 'Your discount is deducted from the total before payment.' },
                  ].map(s => (
                    <div key={s.step} className="flex items-start gap-3">
                      <span className="w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{s.step}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{s.title}</p>
                        <p className="text-xs text-muted-foreground">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-4 pt-3 border-t">
                  Vouchers are auto-detected at checkout based on your cart total and applied directly — no code entry needed.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
