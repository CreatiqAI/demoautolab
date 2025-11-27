import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Crown,
  Star,
  Shield,
  Award,
  Users,
  Edit,
  Trash2,
  Plus,
  Save,
  X,
  TrendingUp,
  Gift,
  Zap
} from 'lucide-react';

interface CustomerTier {
  id: string;
  tier_name: string;
  tier_level: number;
  description: string;
  discount_percentage: number;
  points_multiplier: number;
  free_shipping_threshold: number | null;
  has_priority_support: boolean;
  has_early_access: boolean;
  min_monthly_spending: number;
  badge_color: string;
  badge_icon: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

const ICON_OPTIONS = [
  { value: 'crown', label: 'Crown', icon: Crown },
  { value: 'star', label: 'Star', icon: Star },
  { value: 'shield', label: 'Shield', icon: Shield },
  { value: 'award', label: 'Award', icon: Award },
  { value: 'zap', label: 'Zap', icon: Zap },
  { value: 'gift', label: 'Gift', icon: Gift }
];

const COLOR_OPTIONS = [
  { value: 'purple', label: 'Purple', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { value: 'gold', label: 'Gold', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { value: 'silver', label: 'Silver', color: 'bg-gray-100 text-gray-800 border-gray-200' },
  { value: 'bronze', label: 'Bronze', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { value: 'blue', label: 'Blue', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'green', label: 'Green', color: 'bg-green-100 text-green-800 border-green-200' }
];

export default function CustomerTiers() {
  const { toast } = useToast();
  const [tiers, setTiers] = useState<CustomerTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<CustomerTier | null>(null);
  const [formData, setFormData] = useState<Partial<CustomerTier>>({
    tier_name: '',
    tier_level: 1,
    description: '',
    discount_percentage: 0,
    points_multiplier: 1.0,
    free_shipping_threshold: null,
    has_priority_support: false,
    has_early_access: false,
    min_monthly_spending: 0,
    badge_color: 'gray',
    badge_icon: 'award',
    is_active: true,
    display_order: 0
  });

  useEffect(() => {
    // Check authentication state
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('[CustomerTiers] Current user:', user);

      if (user) {
        // Check if user is admin
        const { data: profile } = await supabase
          .from('customer_profiles')
          .select('customer_type, email')
          .eq('user_id', user.id)
          .single();

        console.log('[CustomerTiers] User profile:', profile);
      }
    };

    checkAuth();
    fetchTiers();
  }, []);

  const fetchTiers = async () => {
    try {
      console.log('[CustomerTiers] Fetching tiers...');
      setLoading(true);

      const { data, error } = await supabase
        .from('customer_tiers')
        .select('*')
        .order('tier_level', { ascending: true });

      console.log('[CustomerTiers] Fetch result:', { data, error });

      if (error) {
        console.error('[CustomerTiers] Fetch error details:', error);
        throw error;
      }

      console.log('[CustomerTiers] Number of tiers fetched:', data?.length || 0);
      setTiers(data || []);
    } catch (error: any) {
      console.error('[CustomerTiers] Error fetching tiers:', error);
      toast({
        title: 'Error',
        description: `Failed to load customer tiers: ${error.message || 'Unknown error'}`,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingTier(null);
    setFormData({
      tier_name: '',
      tier_level: tiers.length + 1,
      description: '',
      discount_percentage: 0,
      points_multiplier: 1.0,
      free_shipping_threshold: null,
      has_priority_support: false,
      has_early_access: false,
      min_monthly_spending: 0,
      badge_color: 'gray',
      badge_icon: 'award',
      is_active: true,
      display_order: tiers.length
    });
    setIsEditModalOpen(true);
  };

  const handleEdit = (tier: CustomerTier) => {
    setEditingTier(tier);
    setFormData(tier);
    setIsEditModalOpen(true);
  };

  const handleSave = async () => {
    try {
      if (!formData.tier_name || formData.tier_level === undefined) {
        toast({
          title: 'Validation Error',
          description: 'Tier name and level are required',
          variant: 'destructive'
        });
        return;
      }

      // Prepare data with only the fields that exist in the database
      const tierData = {
        tier_name: formData.tier_name,
        tier_level: formData.tier_level,
        description: formData.description || '',
        discount_percentage: formData.discount_percentage || 0,
        points_multiplier: formData.points_multiplier || 1.0,
        free_shipping_threshold: formData.free_shipping_threshold,
        has_priority_support: formData.has_priority_support || false,
        has_early_access: formData.has_early_access || false,
        min_monthly_spending: formData.min_monthly_spending || 0,
        badge_color: formData.badge_color || 'gray',
        badge_icon: formData.badge_icon || 'award',
        is_active: formData.is_active !== undefined ? formData.is_active : true,
        display_order: formData.display_order || 0
      };

      if (editingTier) {
        // Update existing tier
        const { data, error } = await supabase
          .from('customer_tiers')
          .update(tierData)
          .eq('id', editingTier.id)
          .select();

        if (error) {
          console.error('Update error:', error);
          throw error;
        }

        console.log('Tier updated successfully:', data);

        toast({
          title: 'Tier Updated',
          description: `${formData.tier_name} has been updated successfully`
        });
      } else {
        // Create new tier
        const { data, error } = await supabase
          .from('customer_tiers')
          .insert([tierData])
          .select();

        if (error) {
          console.error('Insert error:', error);
          throw error;
        }

        console.log('Tier created successfully:', data);

        toast({
          title: 'Tier Created',
          description: `${formData.tier_name} has been created successfully`
        });
      }

      setIsEditModalOpen(false);
      fetchTiers();
    } catch (error: any) {
      console.error('Error saving tier:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save tier',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (tier: CustomerTier) => {
    if (!confirm(`Are you sure you want to delete the ${tier.tier_name} tier? This cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('customer_tiers')
        .delete()
        .eq('id', tier.id);

      if (error) throw error;

      toast({
        title: 'Tier Deleted',
        description: `${tier.tier_name} has been deleted`
      });
      fetchTiers();
    } catch (error: any) {
      console.error('Error deleting tier:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete tier. There may be customers using this tier.',
        variant: 'destructive'
      });
    }
  };

  const toggleActive = async (tier: CustomerTier) => {
    try {
      const newStatus = !tier.is_active;

      const { data, error } = await supabase
        .from('customer_tiers')
        .update({ is_active: newStatus })
        .eq('id', tier.id)
        .select();

      if (error) {
        console.error('Toggle active error:', error);
        throw error;
      }

      console.log('Tier status toggled successfully:', data);

      toast({
        title: newStatus ? 'Tier Activated' : 'Tier Deactivated',
        description: `${tier.tier_name} is now ${newStatus ? 'active' : 'inactive'}`
      });
      fetchTiers();
    } catch (error: any) {
      console.error('Error toggling tier:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update tier status',
        variant: 'destructive'
      });
    }
  };

  const getIconComponent = (iconName: string) => {
    const iconOption = ICON_OPTIONS.find(opt => opt.value === iconName);
    return iconOption ? iconOption.icon : Award;
  };

  const getTierBadge = (tier: CustomerTier) => {
    const Icon = getIconComponent(tier.badge_icon);
    const colorClass = COLOR_OPTIONS.find(c => c.value === tier.badge_color)?.color || 'bg-gray-100 text-gray-800 border-gray-200';

    return (
      <Badge className={`${colorClass} border`}>
        <Icon className="h-3 w-3 mr-1" />
        {tier.tier_name}
      </Badge>
    );
  };

  const stats = {
    totalTiers: tiers.length,
    activeTiers: tiers.filter(t => t.is_active).length,
    highestDiscount: Math.max(...tiers.map(t => t.discount_percentage), 0),
    highestMultiplier: Math.max(...tiers.map(t => t.points_multiplier), 1)
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Customer Tiers</h2>
          <p className="text-muted-foreground">
            Manage customer tier levels and their benefits
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Create New Tier
        </Button>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Tiers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTiers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Tiers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeTiers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Max Discount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.highestDiscount}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Max Points Multiplier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.highestMultiplier}x</div>
          </CardContent>
        </Card>
      </div>

      {/* Tiers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tier Configuration</CardTitle>
          <CardDescription>Configure tier levels and requirements</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Level</TableHead>
                  <TableHead>Tier Name</TableHead>
                  <TableHead>Requirements</TableHead>
                  <TableHead>Benefits</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tiers.map((tier) => (
                  <TableRow key={tier.id}>
                    <TableCell>
                      <div className="font-bold text-lg">{tier.tier_level}</div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {getTierBadge(tier)}
                        <div className="text-xs text-muted-foreground">{tier.description}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm space-y-1">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">Monthly Min:</span>
                          <span className="font-medium">RM {tier.min_monthly_spending}/mo</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Resets every 1st of month
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm space-y-1">
                        <div className="font-medium text-green-600">{tier.discount_percentage}% Discount</div>
                        <div className="font-medium text-blue-600">{tier.points_multiplier}x Points</div>
                        {tier.has_priority_support && (
                          <Badge variant="outline" className="text-xs">Priority Support</Badge>
                        )}
                        {tier.has_early_access && (
                          <Badge variant="outline" className="text-xs">Early Access</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={tier.is_active ? 'default' : 'secondary'}>
                        {tier.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(tier)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleActive(tier)}
                        >
                          {tier.is_active ? <X className="h-4 w-4" /> : <Star className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600"
                          onClick={() => handleDelete(tier)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit/Create Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTier ? 'Edit Tier' : 'Create New Tier'}</DialogTitle>
            <DialogDescription>
              {editingTier ? 'Update tier configuration' : 'Configure a new customer tier'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Tier Name *</label>
                <Input
                  value={formData.tier_name}
                  onChange={(e) => setFormData({ ...formData, tier_name: e.target.value })}
                  placeholder="e.g., Platinum"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Tier Level * (1 = highest)</label>
                <Input
                  type="number"
                  min="1"
                  value={formData.tier_level}
                  onChange={(e) => setFormData({ ...formData, tier_level: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                placeholder="Describe this tier..."
              />
            </div>

            {/* Appearance */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Badge Color</label>
                <select
                  value={formData.badge_color}
                  onChange={(e) => setFormData({ ...formData, badge_color: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  {COLOR_OPTIONS.map(color => (
                    <option key={color.value} value={color.value}>{color.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Badge Icon</label>
                <select
                  value={formData.badge_icon}
                  onChange={(e) => setFormData({ ...formData, badge_icon: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  {ICON_OPTIONS.map(icon => (
                    <option key={icon.value} value={icon.value}>{icon.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Benefits */}
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3">Benefits</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Discount %</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.discount_percentage}
                    onChange={(e) => setFormData({ ...formData, discount_percentage: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Points Multiplier</label>
                  <Input
                    type="number"
                    step="0.1"
                    min="1"
                    value={formData.points_multiplier}
                    onChange={(e) => setFormData({ ...formData, points_multiplier: parseFloat(e.target.value) || 1 })}
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="text-sm font-medium mb-1 block">Free Shipping Threshold (RM)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.free_shipping_threshold || ''}
                  onChange={(e) => setFormData({ ...formData, free_shipping_threshold: e.target.value ? parseFloat(e.target.value) : null })}
                  placeholder="Leave empty for no free shipping"
                />
              </div>

              <div className="mt-4 space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.has_priority_support}
                    onChange={(e) => setFormData({ ...formData, has_priority_support: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Priority Customer Support</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.has_early_access}
                    onChange={(e) => setFormData({ ...formData, has_early_access: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Early Access to New Products</span>
                </label>
              </div>
            </div>

            {/* Requirements */}
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3">Requirements to Achieve</h4>
              <div>
                <label className="text-sm font-medium mb-1 block">Minimum Monthly Spending (RM)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.min_monthly_spending || 0}
                  onChange={(e) => setFormData({ ...formData, min_monthly_spending: parseFloat(e.target.value) || 0 })}
                  placeholder="e.g., 3000 for RM3,000/month"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Customer must spend this amount each month to maintain this tier. Spending resets on the 1st of each month.
                </p>
              </div>
            </div>

            {/* Settings */}
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3">Settings</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Display Order</label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium">Active</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} className="gap-2">
                <Save className="h-4 w-4" />
                {editingTier ? 'Update Tier' : 'Create Tier'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
