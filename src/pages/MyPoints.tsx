import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Award,
  TrendingUp,
  ShoppingBag,
  Gift,
  Star,
  Package,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  Copy,
  ExternalLink,
  Calendar,
  Tag,
  RefreshCw
} from 'lucide-react';
import Header from '@/components/Header';

export default function MyPoints() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('history');

  // Customer data
  const [customerProfile, setCustomerProfile] = useState<any>(null);
  const [pointsBalance, setPointsBalance] = useState(0);
  const [lifetimePoints, setLifetimePoints] = useState(0);
  const [pointsRedeemed, setPointsRedeemed] = useState(0);
  const [pointsHistory, setPointsHistory] = useState<any[]>([]);
  const [rewardItems, setRewardItems] = useState<any[]>([]);
  const [myRedemptions, setMyRedemptions] = useState<any[]>([]);

  // Dialog states
  const [selectedReward, setSelectedReward] = useState<any>(null);
  const [redeemDialogOpen, setRedeemDialogOpen] = useState(false);
  const [shippingAddress, setShippingAddress] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postcode: ''
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    } else {
      fetchAllData();
    }
  }, [user, navigate]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchCustomerProfile(),
        fetchPointsData(),
        fetchRewardItems(),
        fetchMyRedemptions()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('customer_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!error && data) {
      setCustomerProfile(data);
      // Pre-fill shipping address
      setShippingAddress({
        name: data.full_name || '',
        phone: data.phone || '',
        address: data.shipping_address || '',
        city: data.city || '',
        state: data.state || '',
        postcode: data.postcode || ''
      });
    }
  };

  const fetchPointsData = async () => {
    if (!customerProfile?.id) {
      // Try to get customer ID first
      const { data: profile } = await supabase
        .from('customer_profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) return;

      const customerId = profile.id;

      // Get points balance
      const { data: balanceData } = await (supabase.rpc as any)('get_customer_points_balance', {
        p_customer_id: customerId
      });

      // Get lifetime points
      const { data: lifetimeData } = await (supabase.rpc as any)('get_customer_lifetime_points', {
        p_customer_id: customerId
      });

      // Get points redeemed
      const { data: redeemedData } = await (supabase.rpc as any)('get_customer_points_redeemed', {
        p_customer_id: customerId
      });

      setPointsBalance(balanceData || 0);
      setLifetimePoints(lifetimeData || 0);
      setPointsRedeemed(redeemedData || 0);

      // Get points history
      const { data: historyData } = await supabase
        .from('customer_points_ledger')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (historyData) {
        setPointsHistory(historyData);
      }
    }
  };

  const fetchRewardItems = async () => {
    const { data, error } = await supabase
      .from('reward_items')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (!error && data) {
      const now = new Date();
      const availableItems = data.filter(item => {
        if (item.available_from && new Date(item.available_from) > now) return false;
        if (item.available_until && new Date(item.available_until) < now) return false;
        if (item.stock_quantity !== null && item.stock_quantity <= 0) return false;
        return true;
      });
      setRewardItems(availableItems);
    }
  };

  const fetchMyRedemptions = async () => {
    if (!customerProfile?.id) {
      const { data: profile } = await supabase
        .from('customer_profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) return;

      const { data, error } = await supabase
        .from('point_redemptions')
        .select(`
          *,
          reward_item:reward_items(name, item_type, image_url, description),
          generated_voucher:vouchers(code, valid_until, discount_type, discount_value)
        `)
        .eq('customer_id', profile.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setMyRedemptions(data);
      }
    }
  };

  const handleRedeemClick = (item: any) => {
    setSelectedReward(item);
    setRedeemDialogOpen(true);
  };

  const handleRedeem = async () => {
    if (!selectedReward || !customerProfile) return;

    try {
      const shippingData = selectedReward.item_type === 'MERCHANDISE' && selectedReward.shipping_required
        ? shippingAddress
        : null;

      const { data, error } = await (supabase.rpc as any)('redeem_reward_item', {
        p_customer_id: customerProfile.id,
        p_reward_item_id: selectedReward.id,
        p_shipping_address: shippingData
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: 'Redemption Successful!',
          description: data.voucher_code
            ? `Your voucher code: ${data.voucher_code}`
            : 'Your reward is being processed',
        });

        // Refresh data
        await fetchAllData();
        setRedeemDialogOpen(false);
        setActiveTab('redemptions'); // Switch to redemptions tab
      } else {
        throw new Error(data.error || 'Redemption failed');
      }
    } catch (error: any) {
      console.error('Redemption error:', error);
      toast({
        title: 'Redemption Failed',
        description: error.message || 'An error occurred',
        variant: 'destructive'
      });
    }
  };

  const copyVoucherCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: 'Copied!',
      description: 'Voucher code copied to clipboard'
    });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-96">
            <RefreshCw className="h-8 w-8 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Award className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
            My Points & Rewards
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Earn points with every purchase, redeem amazing rewards
          </p>
        </div>

        {/* Points Balance Cards */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Award className="h-4 w-4" />
                Available Points
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl sm:text-4xl font-bold text-primary">{pointsBalance.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">Ready to redeem</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Lifetime Earned
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold">{lifetimePoints.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                Total Redeemed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold">{pointsRedeemed.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">Points used</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-900">
                <Star className="h-4 w-4" />
                Earning Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-blue-900">1:1</div>
              <p className="text-xs text-blue-700 mt-1">1 point per RM1 spent</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="history" className="gap-2">
              <Award className="h-4 w-4" />
              <span className="hidden sm:inline">Points History</span>
              <span className="sm:hidden">History</span>
            </TabsTrigger>
            <TabsTrigger value="catalog" className="gap-2">
              <Gift className="h-4 w-4" />
              <span className="hidden sm:inline">Rewards Catalog</span>
              <span className="sm:hidden">Rewards</span>
            </TabsTrigger>
            <TabsTrigger value="redemptions" className="gap-2">
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden sm:inline">My Redemptions</span>
              <span className="sm:hidden">Redeemed</span>
            </TabsTrigger>
          </TabsList>

          {/* Points History Tab */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Points Activity</CardTitle>
                <CardDescription>Your complete points transaction history</CardDescription>
              </CardHeader>
              <CardContent>
                {pointsHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No points history yet</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Start shopping to earn points!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pointsHistory.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`p-2 rounded-full ${
                            entry.transaction_type === 'EARNED' ? 'bg-green-100' :
                            entry.transaction_type === 'REDEEMED' ? 'bg-blue-100' : 'bg-gray-100'
                          }`}>
                            {entry.transaction_type === 'EARNED' && <TrendingUp className="h-4 w-4 text-green-600" />}
                            {entry.transaction_type === 'REDEEMED' && <ShoppingBag className="h-4 w-4 text-blue-600" />}
                            {entry.transaction_type === 'ADJUSTED' && <Award className="h-4 w-4 text-gray-600" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{entry.description}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(entry.created_at)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${
                            entry.points_amount > 0 ? 'text-green-600' : 'text-blue-600'
                          }`}>
                            {entry.points_amount > 0 ? '+' : ''}{entry.points_amount}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rewards Catalog Tab */}
          <TabsContent value="catalog" className="space-y-4">
            <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {rewardItems.length === 0 ? (
                <Card className="col-span-full">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Gift className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No rewards available yet</p>
                  </CardContent>
                </Card>
              ) : (
                rewardItems.map((item) => {
                  const canAfford = pointsBalance >= item.points_required;

                  return (
                    <Card key={item.id} className={!canAfford ? 'opacity-75' : ''}>
                      <CardHeader className="pb-3">
                        {item.image_url && (
                          <div className="w-full h-32 sm:h-40 bg-gray-100 rounded-lg mb-3 overflow-hidden">
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="space-y-2">
                          <CardTitle className="text-base">{item.name}</CardTitle>
                          <Badge variant={item.item_type === 'VOUCHER' ? 'default' : 'secondary'} className="text-xs">
                            {item.item_type}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {item.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                        )}

                        <div className="flex items-center justify-between py-2 border-t">
                          <div className="flex items-center gap-1">
                            <Award className="h-4 w-4 text-primary" />
                            <span className="text-lg font-bold text-primary">{item.points_required}</span>
                            <span className="text-xs text-muted-foreground">points</span>
                          </div>
                          {item.stock_quantity !== null && (
                            <span className="text-xs text-muted-foreground">
                              {item.stock_quantity} left
                            </span>
                          )}
                        </div>

                        <Button
                          className="w-full"
                          onClick={() => handleRedeemClick(item)}
                          disabled={!canAfford}
                        >
                          {canAfford ? (
                            <>
                              <Gift className="h-4 w-4 mr-2" />
                              Redeem Now
                            </>
                          ) : (
                            <>
                              🔒 Need {(item.points_required - pointsBalance).toLocaleString()} more
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          {/* My Redemptions Tab */}
          <TabsContent value="redemptions" className="space-y-4">
            {myRedemptions.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <ShoppingBag className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No redemptions yet</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Browse the rewards catalog to redeem your first reward!
                  </p>
                  <Button className="mt-4" onClick={() => setActiveTab('catalog')}>
                    Browse Rewards
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {myRedemptions.map((redemption) => (
                  <Card key={redemption.id}>
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row gap-4">
                        {redemption.reward_item?.image_url && (
                          <div className="w-full sm:w-20 h-32 sm:h-20 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                            <img
                              src={redemption.reward_item.image_url}
                              alt={redemption.reward_item.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}

                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <h3 className="font-semibold text-base">{redemption.reward_item?.name}</h3>
                            {redemption.status === 'PENDING' && (
                              <Badge variant="secondary" className="gap-1 w-fit">
                                <Clock className="h-3 w-3" />
                                Pending
                              </Badge>
                            )}
                            {redemption.status === 'COMPLETED' && (
                              <Badge className="gap-1 w-fit">
                                <CheckCircle className="h-3 w-3" />
                                Completed
                              </Badge>
                            )}
                            {redemption.status === 'CANCELLED' && (
                              <Badge variant="destructive" className="gap-1 w-fit">
                                <XCircle className="h-3 w-3" />
                                Cancelled
                              </Badge>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Award className="h-3 w-3" />
                              {redemption.points_spent} points
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(redemption.created_at)}
                            </span>
                          </div>

                          {/* Voucher Code Display */}
                          {redemption.reward_item?.item_type === 'VOUCHER' && redemption.generated_voucher && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-3">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div>
                                  <p className="text-xs text-green-700 mb-1">Voucher Code:</p>
                                  <p className="text-lg font-mono font-bold text-green-900">
                                    {redemption.generated_voucher.code}
                                  </p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => copyVoucherCode(redemption.generated_voucher.code)}
                                  className="w-full sm:w-auto"
                                >
                                  <Copy className="h-3 w-3 mr-1" />
                                  Copy
                                </Button>
                              </div>
                              <p className="text-xs text-green-700 mt-2">
                                Valid until: {formatDate(redemption.generated_voucher.valid_until)}
                              </p>
                            </div>
                          )}

                          {/* Shipping Info */}
                          {redemption.reward_item?.item_type === 'MERCHANDISE' && redemption.status !== 'CANCELLED' && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                              <div className="flex items-center gap-2 mb-2">
                                <Truck className="h-4 w-4 text-blue-700" />
                                <p className="text-sm font-medium text-blue-900">
                                  {redemption.status === 'COMPLETED' ? 'Shipped' : 'Processing'}
                                </p>
                              </div>
                              {redemption.tracking_number && (
                                <p className="text-sm text-blue-700">
                                  Tracking: <span className="font-mono font-semibold">{redemption.tracking_number}</span>
                                </p>
                              )}
                              {!redemption.tracking_number && (
                                <p className="text-xs text-blue-700">
                                  Your order is being prepared for shipment
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Redemption Confirmation Dialog */}
      <Dialog open={redeemDialogOpen} onOpenChange={setRedeemDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirm Redemption</DialogTitle>
            <DialogDescription>
              Review the details before redeeming your points
            </DialogDescription>
          </DialogHeader>

          {selectedReward && (
            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-2">{selectedReward.name}</h4>
                {selectedReward.description && (
                  <p className="text-sm text-muted-foreground mb-3">{selectedReward.description}</p>
                )}

                <div className="flex items-center justify-between py-2 border-t">
                  <span className="text-sm text-muted-foreground">Points Required:</span>
                  <span className="text-lg font-bold text-primary">{selectedReward.points_required}</span>
                </div>

                <div className="flex items-center justify-between py-2 border-t">
                  <span className="text-sm text-muted-foreground">Your Balance After:</span>
                  <span className="text-lg font-bold">
                    {(pointsBalance - selectedReward.points_required).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Shipping Address Form for Merchandise */}
              {selectedReward.item_type === 'MERCHANDISE' && selectedReward.shipping_required && (
                <div className="space-y-3 border rounded-lg p-4">
                  <h4 className="font-semibold text-sm">Shipping Address</h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Label htmlFor="name" className="text-xs">Full Name *</Label>
                      <Input
                        id="name"
                        value={shippingAddress.name}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, name: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-span-2">
                      <Label htmlFor="phone" className="text-xs">Phone Number *</Label>
                      <Input
                        id="phone"
                        value={shippingAddress.phone}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, phone: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-span-2">
                      <Label htmlFor="address" className="text-xs">Address *</Label>
                      <Textarea
                        id="address"
                        value={shippingAddress.address}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, address: e.target.value })}
                        required
                        rows={2}
                      />
                    </div>

                    <div>
                      <Label htmlFor="city" className="text-xs">City *</Label>
                      <Input
                        id="city"
                        value={shippingAddress.city}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="state" className="text-xs">State *</Label>
                      <Input
                        id="state"
                        value={shippingAddress.state}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-span-2">
                      <Label htmlFor="postcode" className="text-xs">Postcode *</Label>
                      <Input
                        id="postcode"
                        value={shippingAddress.postcode}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, postcode: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setRedeemDialogOpen(false)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleRedeem}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirm Redemption
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
