import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Badge } from '@/components/ui/badge';
import { Tag, Calendar, Percent, DollarSign, Copy, Check, ShoppingCart, AlertCircle, Ticket, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

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
      const { data: profile } = await supabase
        .from('customer_profiles' as any)
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) {
        setLoading(false);
        return;
      }

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
      const maxCap = voucher.max_discount_amount ? ` (max RM${voucher.max_discount_amount})` : '';
      return `${voucher.discount_value}% OFF${maxCap}`;
    }
    return `RM${voucher.discount_value} OFF`;
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

  const getUsagePercentage = (voucher: Voucher) => {
    return (voucher.times_used / voucher.max_usage_per_user) * 100;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 flex-1">
        {/* Back Button */}
        <Link
          to="/catalog"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-lime-700 mb-6 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Shop
        </Link>

        {/* Page Header */}
        <div className="mb-6 border-b border-gray-200 pb-4">
          <h1 className="text-3xl font-heading font-bold text-gray-900 uppercase italic mb-2">My Vouchers</h1>
          <p className="text-sm text-gray-500 uppercase tracking-wider font-medium">Redeem your available discount codes at checkout.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Ticket className="h-12 w-12 animate-pulse mx-auto mb-4 text-lime-600" />
              <p className="text-gray-500 text-[15px]">Loading vouchers...</p>
            </div>
          </div>
        ) : vouchers.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-xl border border-gray-100 rounded-xl p-8 text-center shadow-md">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Ticket className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-heading font-bold uppercase italic text-gray-900 mb-2">No Vouchers Available</h3>
            <p className="text-[15px] text-gray-500 mb-6 max-w-md mx-auto">
              There are currently no vouchers available for your account. Check back later for exclusive deals!
            </p>
            <Link
              to="/catalog"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-lime-600 text-white font-bold uppercase tracking-wide text-[13px] hover:bg-lime-700 transition-all rounded-lg"
            >
              <ShoppingCart className="h-4 w-4" />
              Start Shopping
            </Link>
          </div>
        ) : (
          <>
            {/* Vouchers Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {vouchers.map((voucher) => (
                <div
                  key={voucher.id}
                  className={`bg-white/80 backdrop-blur-xl border border-gray-100 rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 group ${
                    !voucher.can_still_use ? 'opacity-60' : ''
                  }`}
                >
                  {/* Voucher Header - Ticket Style */}
                  <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 p-4 text-white">
                    {/* Decorative circles for ticket effect */}
                    <div className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 bg-gray-50 rounded-full"></div>
                    <div className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 bg-gray-50 rounded-full"></div>

                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          voucher.discount_type === 'PERCENTAGE' ? 'bg-lime-600' : 'bg-blue-600'
                        }`}>
                          {voucher.discount_type === 'PERCENTAGE' ? (
                            <Percent className="h-4 w-4 text-white" />
                          ) : (
                            <DollarSign className="h-4 w-4 text-white" />
                          )}
                        </div>
                        <div>
                          <p className="text-[8px] font-medium uppercase tracking-wider text-gray-400">Voucher Code</p>
                          <code className="text-xs font-bold tracking-wider">{voucher.code}</code>
                        </div>
                      </div>
                      <button
                        onClick={() => handleCopyCode(voucher.code)}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        {copiedCode === voucher.code ? (
                          <Check className="h-4 w-4 text-lime-400" />
                        ) : (
                          <Copy className="h-4 w-4 text-gray-400 hover:text-white" />
                        )}
                      </button>
                    </div>

                    {/* Discount Amount */}
                    <div className="text-center py-2 border-t border-dashed border-white/20">
                      <p className="text-2xl font-heading font-bold uppercase italic text-lime-400">
                        {getDiscountDisplay(voucher)}
                      </p>
                    </div>
                  </div>

                  {/* Voucher Details */}
                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="font-bold text-gray-900 text-[15px] mb-0.5">{voucher.name}</h3>
                      <p className="text-[13px] text-gray-500">{voucher.description}</p>
                    </div>

                    {/* Usage Progress */}
                    <div>
                      <div className="flex items-center justify-between text-[10px] mb-1.5">
                        <span className="text-gray-500 font-medium uppercase tracking-wider">Usage</span>
                        <span className={`font-bold ${
                          getUsagePercentage(voucher) >= 100 ? 'text-red-600' :
                          getUsagePercentage(voucher) >= 50 ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {voucher.times_used} / {voucher.max_usage_per_user}
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            getUsagePercentage(voucher) >= 100 ? 'bg-red-500' :
                            getUsagePercentage(voucher) >= 50 ? 'bg-yellow-500' : 'bg-lime-500'
                          }`}
                          style={{ width: `${Math.min(getUsagePercentage(voucher), 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Min Purchase & Expiry */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                      {voucher.min_purchase_amount > 0 && (
                        <div className="text-gray-500">
                          Min. <span className="font-bold text-gray-900">RM{voucher.min_purchase_amount}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-gray-500 ml-auto">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{formatDate(voucher.valid_until)}</span>
                      </div>
                    </div>

                    {/* Status & Action */}
                    <div className="pt-2">
                      {voucher.can_still_use ? (
                        <button
                          onClick={() => handleCopyCode(voucher.code)}
                          className="w-full py-2.5 bg-lime-600 text-white font-bold uppercase tracking-wide text-[13px] hover:bg-lime-700 transition-all rounded-lg flex items-center justify-center gap-1.5"
                        >
                          {copiedCode === voucher.code ? (
                            <>
                              <Check className="h-4 w-4" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4" />
                              Copy & Use
                            </>
                          )}
                        </button>
                      ) : (
                        <div className="w-full py-2.5 bg-gray-100 text-gray-500 font-bold uppercase tracking-wide text-[13px] rounded-lg flex items-center justify-center gap-1.5">
                          <AlertCircle className="h-4 w-4" />
                          Limit Reached
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* How to Use Card */}
            <div className="bg-white/80 backdrop-blur-xl border border-lime-200 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-lime-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-lime-700" />
                </div>
                <div className="flex-1">
                  <h4 className="font-heading font-bold uppercase italic text-gray-900 text-[15px] mb-3">How to Use Vouchers</h4>
                  <ol className="text-[15px] text-gray-600 space-y-2.5">
                    <li className="flex items-start gap-2.5">
                      <span className="w-6 h-6 bg-lime-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                      <span>Copy your voucher code by clicking the copy button</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-6 h-6 bg-lime-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                      <span>Add items to your cart and proceed to checkout</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-6 h-6 bg-lime-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
                      <span>Enter the voucher code in the "Apply Voucher" section</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-6 h-6 bg-lime-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">4</span>
                      <span>Your discount will be automatically applied to the total</span>
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
