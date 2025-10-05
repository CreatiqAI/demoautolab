import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Store,
  Wallet,
  ShoppingCart,
  TrendingUp,
  Package,
  Star,
  Clock,
  CreditCard,
  Gift,
  BarChart3,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface MerchantProfile {
  id: string;
  customer_type: string;
  full_name: string;
  phone: string;
  credit_limit: number;
  merchant_tier?: string;
  points_rate?: number;
  pricing_type?: string;
}

interface MerchantRegistration {
  id: string;
  company_name: string;
  business_type: string;
  status: string;
  created_at: string;
}

interface WalletData {
  points_balance: number;
  credit_balance: number;
  total_earned_points: number;
  total_spent_points: number;
}

interface WalletTransaction {
  id: string;
  type: string;
  amount: number;
  balance_after: number;
  description: string;
  created_at: string;
}

interface Promotion {
  id: string;
  code: string;
  name: string;
  description: string;
  type: string;
  discount_value: number;
  min_purchase_amount: number;
  valid_until: string;
}

const MerchantDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<MerchantProfile | null>(null);
  const [registration, setRegistration] = useState<MerchantRegistration | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [orderStats, setOrderStats] = useState<any>(null);

  useEffect(() => {
    loadMerchantData();
  }, []);

  const loadMerchantData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error('Please log in to access merchant dashboard');
        navigate('/auth');
        return;
      }

      // Load customer profile
      const { data: profileData, error: profileError } = await supabase
        .from('customer_profiles' as any)
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;

      // Check if user has merchant registration
      const { data: regData, error: regError } = await supabase
        .from('merchant_registrations' as any)
        .select('*')
        .eq('customer_id', (profileData as any).id)
        .single();

      if (regError && regError.code !== 'PGRST116') {
        console.error('Registration error:', regError);
      }

      // If not a merchant and no pending application, redirect
      if ((profileData as any).customer_type !== 'merchant' && !regData) {
        toast.error('You need to apply for merchant status first');
        navigate('/merchant-register');
        return;
      }

      setProfile(profileData as any);
      setRegistration(regData as any);

      // If merchant is approved, load merchant-specific data
      if ((profileData as any).customer_type === 'merchant') {
        await Promise.all([
          loadWalletData((profileData as any).id),
          loadPromotions(),
          loadFavorites((profileData as any).id),
          loadOrderStats((profileData as any).id)
        ]);
      }

      setLoading(false);
    } catch (error: any) {
      console.error('Error loading merchant data:', error);
      toast.error('Failed to load merchant dashboard');
      setLoading(false);
    }
  };

  const loadWalletData = async (customerId: string) => {
    try {
      const { data: walletData, error: walletError } = await supabase
        .from('merchant_wallets' as any)
        .select('*')
        .eq('customer_id', customerId)
        .single();

      if (walletError && walletError.code === 'PGRST116') {
        // No wallet yet, create one
        const { data: newWallet } = await supabase
          .from('merchant_wallets' as any)
          .insert({ customer_id: customerId } as any)
          .select()
          .single();
        setWallet(newWallet as any);
      } else if (!walletError) {
        setWallet(walletData as any);
      }

      // Load transactions
      const { data: txData } = await supabase
        .from('wallet_transactions' as any)
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (txData) setTransactions(txData as any);
    } catch (error) {
      console.error('Error loading wallet:', error);
    }
  };

  const loadPromotions = async () => {
    try {
      const { data, error } = await supabase
        .from('merchant_promotions' as any)
        .select('*')
        .eq('is_active', true)
        .gte('valid_until', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (!error && data) setPromotions(data as any);
    } catch (error) {
      console.error('Error loading promotions:', error);
    }
  };

  const loadFavorites = async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from('merchant_favorites' as any)
        .select(`
          *,
          products:product_id (
            id,
            name,
            sku,
            price_merchant,
            stock_on_hand
          )
        `)
        .eq('customer_id', customerId)
        .order('sort_order', { ascending: true });

      if (!error && data) setFavorites(data as any);
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  const loadOrderStats = async (customerId: string) => {
    try {
      // Need to get user_id from customer profile first
      const { data: profileData } = await supabase
        .from('customer_profiles' as any)
        .select('user_id')
        .eq('id', customerId)
        .single();

      if (!(profileData as any)?.user_id) return;

      const { data, error } = await supabase
        .from('orders')
        .select('total, status, created_at')
        .eq('user_id', (profileData as any).user_id);

      if (!error && data) {
        const stats = {
          totalOrders: data.length,
          totalSpent: data.reduce((sum, order) => sum + parseFloat(order.total.toString()), 0),
          pendingOrders: data.filter(o => ['PLACED', 'PENDING_VERIFICATION'].includes(o.status)).length,
          completedOrders: data.filter(o => o.status === 'COMPLETED').length
        };
        setOrderStats(stats);
      }
    } catch (error) {
      console.error('Error loading order stats:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      'PENDING': { variant: 'secondary', icon: Clock, text: 'Pending Approval' },
      'APPROVED': { variant: 'default', icon: CheckCircle2, text: 'Approved' },
      'REJECTED': { variant: 'destructive', icon: XCircle, text: 'Rejected' }
    };

    const config = variants[status] || variants['PENDING'];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.text}
      </Badge>
    );
  };

  const getTierBadge = (tier?: string) => {
    const colors: any = {
      'BRONZE': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      'SILVER': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
      'GOLD': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'PLATINUM': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
    };

    return (
      <Badge className={colors[tier || 'BRONZE']}>
        {tier || 'BRONZE'}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center">
          <Store className="h-12 w-12 animate-pulse mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading merchant dashboard...</p>
        </div>
      </div>
    );
  }

  // Pending Approval Screen
  if (registration && registration.status === 'PENDING') {
    return (
      <div className="min-h-screen bg-gradient-subtle p-4">
        <div className="max-w-2xl mx-auto pt-12">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Merchant Application Status</CardTitle>
                {getStatusBadge(registration.status)}
              </div>
              <CardDescription>
                Your application is being reviewed by our team
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900 dark:text-blue-100">
                      Application Under Review
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      We're reviewing your merchant application. You'll receive a notification once it's approved.
                      This usually takes 1-2 business days.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Application Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Company Name</p>
                    <p className="font-medium">{registration.company_name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Business Type</p>
                    <p className="font-medium">{registration.business_type}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Application Date</p>
                    <p className="font-medium">
                      {new Date(registration.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Rejected Screen
  if (registration && registration.status === 'REJECTED') {
    return (
      <div className="min-h-screen bg-gradient-subtle p-4">
        <div className="max-w-2xl mx-auto pt-12">
          <Button variant="ghost" onClick={() => navigate('/')} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Merchant Application Status</CardTitle>
                {getStatusBadge(registration.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-900 dark:text-red-100">
                  Unfortunately, your merchant application was not approved. Please contact support for more information.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Approved Merchant Dashboard
  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Store
              </Button>
              <div className="h-8 w-px bg-border" />
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Store className="h-6 w-6 text-primary" />
                  Merchant Dashboard
                </h1>
                <p className="text-sm text-muted-foreground">
                  {registration?.company_name || profile?.full_name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getTierBadge(profile?.merchant_tier)}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Points Balance</p>
                  <p className="text-2xl font-bold">{wallet?.points_balance?.toFixed(2) || '0.00'}</p>
                </div>
                <Wallet className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                  <p className="text-2xl font-bold">{orderStats?.totalOrders || 0}</p>
                </div>
                <ShoppingCart className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Spent</p>
                  <p className="text-2xl font-bold">RM {orderStats?.totalSpent?.toFixed(2) || '0.00'}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Credit Limit</p>
                  <p className="text-2xl font-bold">RM {profile?.credit_limit?.toFixed(2) || '0.00'}</p>
                </div>
                <CreditCard className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="wallet">Wallet</TabsTrigger>
            <TabsTrigger value="promotions">Promotions</TabsTrigger>
            <TabsTrigger value="favorites">Quick Order</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Account Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Merchant Tier</p>
                    <div className="mt-1">{getTierBadge(profile?.merchant_tier)}</div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Points Earning Rate</p>
                    <p className="font-medium">{profile?.points_rate || 1}x points per RM</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{profile?.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Business Type</p>
                    <p className="font-medium">{registration?.business_type}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button className="w-full justify-start" onClick={() => navigate('/catalog')}>
                    <Package className="h-4 w-4 mr-2" />
                    Browse Products (Merchant Prices)
                  </Button>
                  <Button className="w-full justify-start" variant="outline" onClick={() => navigate('/my-orders')}>
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    View My Orders
                  </Button>
                  <Button className="w-full justify-start" variant="outline" onClick={() => navigate('/cart')}>
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Go to Cart
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Active Promotions Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5" />
                  Active Promotions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {promotions.length > 0 ? (
                  <div className="space-y-2">
                    {promotions.slice(0, 3).map(promo => (
                      <div key={promo.id} className="p-3 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{promo.name}</p>
                            <p className="text-sm text-muted-foreground">{promo.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Code: <code className="bg-muted px-1 rounded">{promo.code}</code>
                            </p>
                          </div>
                          <Badge>{promo.type}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No active promotions</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Wallet Tab */}
          <TabsContent value="wallet" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Available Points</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-primary">
                    {wallet?.points_balance?.toFixed(2) || '0.00'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    = RM {wallet?.points_balance?.toFixed(2) || '0.00'} credit value
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Total Earned</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-green-600">
                    {wallet?.total_earned_points?.toFixed(2) || '0.00'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Lifetime points earned</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Total Spent</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-orange-600">
                    {wallet?.total_spent_points?.toFixed(2) || '0.00'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Lifetime points used</p>
                </CardContent>
              </Card>
            </div>

            {/* Transaction History */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                {transactions.length > 0 ? (
                  <div className="space-y-2">
                    {transactions.map(tx => (
                      <div key={tx.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{tx.type.replace(/_/g, ' ')}</p>
                          <p className="text-xs text-muted-foreground">{tx.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(tx.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {tx.amount >= 0 ? '+' : ''}{tx.amount.toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Balance: {tx.balance_after.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No transactions yet
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Promotions Tab */}
          <TabsContent value="promotions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Available Promotions</CardTitle>
                <CardDescription>
                  Exclusive offers for merchant partners
                </CardDescription>
              </CardHeader>
              <CardContent>
                {promotions.length > 0 ? (
                  <div className="grid gap-4">
                    {promotions.map(promo => (
                      <Card key={promo.id} className="border-2 border-primary/20">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h3 className="font-bold text-lg">{promo.name}</h3>
                              <p className="text-sm text-muted-foreground">{promo.description}</p>
                            </div>
                            <Badge variant="secondary">{promo.type}</Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Discount</p>
                              <p className="font-bold">
                                {promo.type === 'PERCENTAGE_DISCOUNT'
                                  ? `${promo.discount_value}%`
                                  : `RM ${promo.discount_value}`}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Min Purchase</p>
                              <p className="font-bold">RM {promo.min_purchase_amount}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Valid Until</p>
                              <p className="font-bold">
                                {new Date(promo.valid_until).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="mt-4 p-2 bg-muted rounded flex items-center justify-between">
                            <span className="text-sm font-medium">Promo Code:</span>
                            <code className="text-lg font-mono font-bold">{promo.code}</code>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No active promotions at the moment
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Quick Order / Favorites Tab */}
          <TabsContent value="favorites" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Favorite Products - Quick Reorder</CardTitle>
                <CardDescription>
                  Your frequently ordered items for quick access
                </CardDescription>
              </CardHeader>
              <CardContent>
                {favorites.length > 0 ? (
                  <div className="space-y-2">
                    {favorites.map(fav => (
                      <div key={fav.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{fav.products?.name}</p>
                          <p className="text-sm text-muted-foreground">SKU: {fav.products?.sku}</p>
                          {fav.custom_note && (
                            <p className="text-xs text-muted-foreground mt-1">Note: {fav.custom_note}</p>
                          )}
                        </div>
                        <div className="text-right mr-4">
                          <p className="font-bold text-lg">RM {fav.products?.price_merchant}</p>
                          <p className="text-xs text-muted-foreground">
                            Stock: {fav.products?.stock_on_hand}
                          </p>
                        </div>
                        <Button size="sm">Add to Cart</Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Star className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">
                      No favorites yet. Browse products and mark your favorites!
                    </p>
                    <Button className="mt-4" onClick={() => navigate('/catalog')}>
                      Browse Products
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Order Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Orders</span>
                    <span className="font-bold text-xl">{orderStats?.totalOrders || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Completed</span>
                    <span className="font-bold text-green-600">{orderStats?.completedOrders || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Pending</span>
                    <span className="font-bold text-orange-600">{orderStats?.pendingOrders || 0}</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t">
                    <span className="text-muted-foreground">Total Spent</span>
                    <span className="font-bold text-xl">RM {orderStats?.totalSpent?.toFixed(2) || '0.00'}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Membership Benefits</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span>Merchant-only pricing</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span>Bulk purchase discounts</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span>Exclusive promotions</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span>Points rewards program</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span>Credit payment terms</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span>Priority support</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MerchantDashboard;
