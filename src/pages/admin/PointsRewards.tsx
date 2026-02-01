import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Award,
  Plus,
  Edit,
  Trash2,
  BarChart3,
  Users,
  Package,
  Gift,
  ShoppingBag,
  TrendingUp,
  RefreshCw,
  Download,
  XCircle,
  CheckCircle,
  Clock,
  Tag,
  Truck,
  Star
} from 'lucide-react';

export default function PointsRewards() {
  const [activeTab, setActiveTab] = useState('items');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Data states
  const [rewardItems, setRewardItems] = useState<any[]>([]);
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>({});

  // Dialog states
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchRewardItems(),
        fetchRedemptions(),
        fetchCustomerPoints(),
        fetchAnalytics()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRewardItems = async () => {
    const { data, error } = await supabase
      .from('reward_items')
      .select('*')
      .order('display_order', { ascending: true });

    if (!error && data) {
      setRewardItems(data);
    }
  };

  const fetchRedemptions = async () => {
    const { data, error } = await supabase
      .from('point_redemptions')
      .select(`
        *,
        customer:customer_profiles(id, full_name, email),
        reward_item:reward_items(name, item_type, image_url)
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRedemptions(data);
    }
  };

  const fetchCustomerPoints = async () => {
    const { data, error } = await supabase.rpc('get_all_customer_profiles');

    if (!error && data) {
      // Get points for each customer
      const customersWithPoints = await Promise.all(
        data.map(async (customer) => {
          console.log(`📊 Fetching points for customer: ${customer.full_name} (${customer.id})`);

          const { data: balanceData, error: balanceError } = await (supabase.rpc as any)('get_customer_points_balance', {
            p_customer_id: customer.id
          });

          if (balanceError) {
            console.error(`❌ Error fetching balance for ${customer.full_name}:`, balanceError);
          } else {
            console.log(`✅ Balance for ${customer.full_name}:`, balanceData);
          }

          const { data: lifetimeData, error: lifetimeError } = await (supabase.rpc as any)('get_customer_lifetime_points', {
            p_customer_id: customer.id
          });

          if (lifetimeError) {
            console.error(`❌ Error fetching lifetime points for ${customer.full_name}:`, lifetimeError);
          } else {
            console.log(`✅ Lifetime points for ${customer.full_name}:`, lifetimeData);
          }

          return {
            ...customer,
            current_points: balanceData ?? 0,
            lifetime_points: lifetimeData ?? 0
          };
        })
      );

      console.log('📊 All customers with points:', customersWithPoints);
      setCustomers(customersWithPoints.sort((a, b) => b.current_points - a.current_points));
    } else if (error) {
      console.error('❌ Error fetching customer profiles:', error);
    }
  };

  const fetchAnalytics = async () => {
    // Get total points issued and redeemed
    const { data: ledgerData } = await supabase
      .from('customer_points_ledger')
      .select('transaction_type, points_amount');

    if (ledgerData) {
      const totalIssued = ledgerData
        .filter(l => l.transaction_type === 'EARNED')
        .reduce((sum, l) => sum + l.points_amount, 0);

      const totalRedeemed = Math.abs(ledgerData
        .filter(l => l.transaction_type === 'REDEEMED')
        .reduce((sum, l) => sum + l.points_amount, 0));

      const activeBalance = ledgerData.reduce((sum, l) => sum + l.points_amount, 0);

      setAnalytics({
        totalIssued,
        totalRedeemed,
        activeBalance,
        redemptionRate: totalIssued > 0 ? ((totalRedeemed / totalIssued) * 100).toFixed(1) : 0
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      'PENDING': { variant: 'secondary', color: 'text-yellow-600', icon: Clock },
      'COMPLETED': { variant: 'default', color: 'text-green-600', icon: CheckCircle },
      'CANCELLED': { variant: 'destructive', color: 'text-red-600', icon: XCircle }
    };

    const config = variants[status] || variants['PENDING'];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading Points & Rewards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Award className="h-8 w-8 text-primary" />
            Points & Rewards Management
          </h2>
          <p className="text-muted-foreground">
            Manage reward items, track redemptions, and view customer points
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchAllData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => { setEditingItem(null); setItemDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Create Reward Item
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="items" className="gap-2">
            <Gift className="h-4 w-4" />
            Reward Items
          </TabsTrigger>
          <TabsTrigger value="redemptions" className="gap-2">
            <ShoppingBag className="h-4 w-4" />
            Redemptions
          </TabsTrigger>
          <TabsTrigger value="customers" className="gap-2">
            <Users className="h-4 w-4" />
            Customer Points
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Reward Items */}
        <TabsContent value="items" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rewardItems.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Gift className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No reward items yet</p>
                  <Button className="mt-4" onClick={() => setItemDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Reward
                  </Button>
                </CardContent>
              </Card>
            ) : (
              rewardItems.map((item) => (
                <Card key={item.id} className={!item.is_active ? 'opacity-60' : ''}>
                  <CardHeader className="pb-3">
                    {item.image_url && (
                      <div className="w-full h-32 bg-gray-100 rounded-lg mb-3 overflow-hidden">
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate">{item.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={item.item_type === 'VOUCHER' ? 'default' : 'secondary'} className="text-xs">
                            {item.item_type}
                          </Badge>
                          {item.is_active ? (
                            <Badge variant="outline" className="text-xs text-green-600">✓ Active</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-gray-600">✗ Inactive</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Points Required:</span>
                      <span className="text-lg font-bold text-primary">{item.points_required}</span>
                    </div>
                    {item.item_type === 'MERCHANDISE' && item.stock_quantity !== null && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Stock:</span>
                        <span className={`text-sm font-medium ${item.stock_quantity <= 5 ? 'text-orange-600' : 'text-green-600'}`}>
                          {item.stock_quantity} left
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Redeemed:</span>
                      <span className="text-sm font-medium">{item.total_redeemed || 0} times</span>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => {
                        setEditingItem(item);
                        setItemDialogOpen(true);
                      }}>
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm">
                        <BarChart3 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Tab 2: Redemptions */}
        <TabsContent value="redemptions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Redemptions</CardTitle>
              <CardDescription>View and manage customer reward redemptions</CardDescription>
            </CardHeader>
            <CardContent>
              {redemptions.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No redemptions yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {redemptions.map((redemption) => (
                    <div key={redemption.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          {redemption.reward_item?.image_url && (
                            <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                              <img
                                src={redemption.reward_item.image_url}
                                alt={redemption.reward_item.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold truncate">{redemption.reward_item?.name}</h4>
                              {getStatusBadge(redemption.status)}
                            </div>
                            <p className="text-sm text-muted-foreground mb-1">
                              Customer: {redemption.customer?.full_name || redemption.customer?.email}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Award className="h-3 w-3" />
                                {redemption.points_spent} points
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(redemption.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          {redemption.status === 'PENDING' && redemption.reward_item?.item_type === 'MERCHANDISE' && (
                            <Button size="sm" variant="outline">
                              <Truck className="h-3 w-3 mr-1" />
                              Mark Shipped
                            </Button>
                          )}
                          {redemption.status === 'PENDING' && (
                            <Button size="sm" variant="outline">
                              <XCircle className="h-3 w-3 mr-1" />
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Customer Points */}
        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer Points Overview</CardTitle>
              <CardDescription>View customer point balances and activity</CardDescription>
            </CardHeader>
            <CardContent>
              {customers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No customers yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {customers.map((customer) => (
                    <div key={customer.id} className="border rounded-lg p-4 flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{customer.full_name || customer.email}</h4>
                        <p className="text-sm text-muted-foreground">{customer.email}</p>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Current Points</p>
                          <p className="text-2xl font-bold text-primary">{customer.current_points}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Lifetime Earned</p>
                          <p className="text-lg font-semibold">{customer.lifetime_points}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Analytics */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Points Issued</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalIssued?.toLocaleString() || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">All time</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Points Redeemed</CardTitle>
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalRedeemed?.toLocaleString() || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">All time</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Point Balance</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{analytics.activeBalance?.toLocaleString() || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Outstanding</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Redemption Rate</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.redemptionRate || 0}%</div>
                <p className="text-xs text-muted-foreground mt-1">Points redeemed</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Reward Item Dialog */}
      <CreateRewardItemDialog
        open={itemDialogOpen}
        onOpenChange={setItemDialogOpen}
        editingItem={editingItem}
        onSuccess={() => {
          fetchRewardItems();
          setItemDialogOpen(false);
          setEditingItem(null);
        }}
      />
    </div>
  );
}

// Create/Edit Reward Item Dialog Component
function CreateRewardItemDialog({ open, onOpenChange, editingItem, onSuccess }: any) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    item_type: 'VOUCHER',
    name: '',
    description: '',
    image_url: '',
    points_required: '',
    voucher_code_prefix: '',
    voucher_discount_type: 'PERCENTAGE',
    voucher_discount_value: '',
    voucher_min_purchase: '0',
    voucher_validity_days: '30',
    stock_quantity: '',
    shipping_required: false,
    estimated_delivery_days: '5',
    is_active: true,
    max_redemptions_per_customer: '',
    total_redemption_limit: ''
  });

  useEffect(() => {
    if (editingItem) {
      setFormData({
        item_type: editingItem.item_type || 'VOUCHER',
        name: editingItem.name || '',
        description: editingItem.description || '',
        image_url: editingItem.image_url || '',
        points_required: editingItem.points_required?.toString() || '',
        voucher_code_prefix: editingItem.voucher_code_prefix || '',
        voucher_discount_type: editingItem.voucher_discount_type || 'PERCENTAGE',
        voucher_discount_value: editingItem.voucher_discount_value?.toString() || '',
        voucher_min_purchase: editingItem.voucher_min_purchase?.toString() || '0',
        voucher_validity_days: editingItem.voucher_validity_days?.toString() || '30',
        stock_quantity: editingItem.stock_quantity?.toString() || '',
        shipping_required: editingItem.shipping_required || false,
        estimated_delivery_days: editingItem.estimated_delivery_days?.toString() || '5',
        is_active: editingItem.is_active !== undefined ? editingItem.is_active : true,
        max_redemptions_per_customer: editingItem.max_redemptions_per_customer?.toString() || '',
        total_redemption_limit: editingItem.total_redemption_limit?.toString() || ''
      });
    } else {
      // Reset form for new item
      setFormData({
        item_type: 'VOUCHER',
        name: '',
        description: '',
        image_url: '',
        points_required: '',
        voucher_code_prefix: '',
        voucher_discount_type: 'PERCENTAGE',
        voucher_discount_value: '',
        voucher_min_purchase: '0',
        voucher_validity_days: '30',
        stock_quantity: '',
        shipping_required: false,
        estimated_delivery_days: '5',
        is_active: true,
        max_redemptions_per_customer: '',
        total_redemption_limit: ''
      });
    }
  }, [editingItem, open]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File',
        description: 'Please select an image file',
        variant: 'destructive'
      });
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Image must be less than 5MB',
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = fileName; // Just the filename, bucket is already 'reward-images'

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('reward-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('reward-images')
        .getPublicUrl(filePath);

      setFormData({ ...formData, image_url: publicUrl });

      toast({
        title: 'Success',
        description: 'Image uploaded successfully'
      });

    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload image',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const dataToSave: any = {
        item_type: formData.item_type,
        name: formData.name,
        description: formData.description,
        image_url: formData.image_url || null,
        points_required: parseInt(formData.points_required),
        is_active: formData.is_active,
        max_redemptions_per_customer: formData.max_redemptions_per_customer ? parseInt(formData.max_redemptions_per_customer) : null,
        total_redemption_limit: formData.total_redemption_limit ? parseInt(formData.total_redemption_limit) : null
      };

      if (formData.item_type === 'VOUCHER') {
        dataToSave.voucher_code_prefix = formData.voucher_code_prefix;
        dataToSave.voucher_discount_type = formData.voucher_discount_type;
        dataToSave.voucher_discount_value = parseFloat(formData.voucher_discount_value);
        dataToSave.voucher_min_purchase = parseFloat(formData.voucher_min_purchase);
        dataToSave.voucher_validity_days = parseInt(formData.voucher_validity_days);
      } else {
        dataToSave.stock_quantity = formData.stock_quantity ? parseInt(formData.stock_quantity) : null;
        dataToSave.shipping_required = formData.shipping_required;
        dataToSave.estimated_delivery_days = parseInt(formData.estimated_delivery_days);
      }

      let error;
      if (editingItem) {
        const result = await supabase
          .from('reward_items')
          .update(dataToSave)
          .eq('id', editingItem.id);
        error = result.error;
      } else {
        const result = await supabase
          .from('reward_items')
          .insert([dataToSave]);
        error = result.error;
      }

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Reward item ${editingItem ? 'updated' : 'created'} successfully`
      });

      onSuccess();
    } catch (error: any) {
      console.error('Error saving reward item:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save reward item',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingItem ? 'Edit' : 'Create'} Reward Item</DialogTitle>
          <DialogDescription>
            {editingItem ? 'Update' : 'Create a new'} reward item that customers can redeem with points
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Item Type */}
          <div className="space-y-2">
            <Label>Item Type *</Label>
            <Select value={formData.item_type} onValueChange={(value) => setFormData({ ...formData, item_type: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="VOUCHER">Voucher</SelectItem>
                <SelectItem value="MERCHANDISE">Merchandise</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g., 10% Discount Voucher"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the reward..."
              rows={3}
            />
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Reward Image</Label>
            <div className="space-y-3">
              {/* Image Preview */}
              {formData.image_url && (
                <div className="relative w-full h-32 bg-gray-100 rounded-lg overflow-hidden border">
                  <img
                    src={formData.image_url}
                    alt="Reward preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, image_url: '' })}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Upload Button */}
              <div className="flex gap-2">
                <label className="flex-1">
                  <div className={`flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    {uploading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        <span className="text-sm">Upload Image</span>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Or use URL */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-muted-foreground">Or enter URL</span>
                </div>
              </div>

              <Input
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                placeholder="https://example.com/image.jpg"
                disabled={uploading}
              />
            </div>
          </div>

          {/* Points Required */}
          <div className="space-y-2">
            <Label htmlFor="points_required">Points Required *</Label>
            <Input
              id="points_required"
              type="number"
              min="1"
              value={formData.points_required}
              onChange={(e) => setFormData({ ...formData, points_required: e.target.value })}
              required
              placeholder="500"
            />
          </div>

          {/* Voucher-specific fields */}
          {formData.item_type === 'VOUCHER' && (
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold">Voucher Details</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="voucher_code_prefix">Code Prefix *</Label>
                  <Input
                    id="voucher_code_prefix"
                    value={formData.voucher_code_prefix}
                    onChange={(e) => setFormData({ ...formData, voucher_code_prefix: e.target.value })}
                    required={formData.item_type === 'VOUCHER'}
                    placeholder="POINTS10"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Discount Type *</Label>
                  <Select value={formData.voucher_discount_type} onValueChange={(value) => setFormData({ ...formData, voucher_discount_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                      <SelectItem value="FIXED">Fixed Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="voucher_discount_value">Discount Value *</Label>
                  <Input
                    id="voucher_discount_value"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.voucher_discount_value}
                    onChange={(e) => setFormData({ ...formData, voucher_discount_value: e.target.value })}
                    required={formData.item_type === 'VOUCHER'}
                    placeholder={formData.voucher_discount_type === 'PERCENTAGE' ? '10' : '50'}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.voucher_discount_type === 'PERCENTAGE' ? '% off' : 'RM off'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="voucher_min_purchase">Min Purchase (RM)</Label>
                  <Input
                    id="voucher_min_purchase"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.voucher_min_purchase}
                    onChange={(e) => setFormData({ ...formData, voucher_min_purchase: e.target.value })}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="voucher_validity_days">Validity (Days)</Label>
                  <Input
                    id="voucher_validity_days"
                    type="number"
                    min="1"
                    value={formData.voucher_validity_days}
                    onChange={(e) => setFormData({ ...formData, voucher_validity_days: e.target.value })}
                    placeholder="30"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Merchandise-specific fields */}
          {formData.item_type === 'MERCHANDISE' && (
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold">Merchandise Details</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stock_quantity">Stock Quantity</Label>
                  <Input
                    id="stock_quantity"
                    type="number"
                    min="0"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                    placeholder="Leave empty for unlimited"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estimated_delivery_days">Delivery Days</Label>
                  <Input
                    id="estimated_delivery_days"
                    type="number"
                    min="1"
                    value={formData.estimated_delivery_days}
                    onChange={(e) => setFormData({ ...formData, estimated_delivery_days: e.target.value })}
                    placeholder="5"
                  />
                </div>

                <div className="flex items-center space-x-2 col-span-2">
                  <input
                    type="checkbox"
                    id="shipping_required"
                    checked={formData.shipping_required}
                    onChange={(e) => setFormData({ ...formData, shipping_required: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="shipping_required" className="cursor-pointer">Shipping Required</Label>
                </div>
              </div>
            </div>
          )}

          {/* Limits */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold">Redemption Limits (Optional)</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max_redemptions_per_customer">Max Per Customer</Label>
                <Input
                  id="max_redemptions_per_customer"
                  type="number"
                  min="1"
                  value={formData.max_redemptions_per_customer}
                  onChange={(e) => setFormData({ ...formData, max_redemptions_per_customer: e.target.value })}
                  placeholder="Unlimited"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="total_redemption_limit">Total Limit</Label>
                <Input
                  id="total_redemption_limit"
                  type="number"
                  min="1"
                  value={formData.total_redemption_limit}
                  onChange={(e) => setFormData({ ...formData, total_redemption_limit: e.target.value })}
                  placeholder="Unlimited"
                />
              </div>
            </div>
          </div>

          {/* Active Status */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="h-4 w-4"
            />
            <Label htmlFor="is_active" className="cursor-pointer">Active (visible to customers)</Label>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : (editingItem ? 'Update' : 'Create')} Reward Item
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
