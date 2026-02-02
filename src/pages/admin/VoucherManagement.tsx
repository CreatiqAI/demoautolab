import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tag, Plus, Edit, Trash2, Copy, ToggleLeft, ToggleRight, Calendar } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface Voucher {
  id: string;
  code: string;
  name: string;
  description: string;
  discount_type: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discount_value: number;
  max_discount_amount: number | null;
  min_purchase_amount: number;
  max_usage_total: number | null;
  max_usage_per_user: number;
  current_usage_count: number;
  customer_type_restriction: 'ALL' | 'NORMAL' | 'MERCHANT';
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
  admin_notes: string | null;
}

const VoucherManagement = () => {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    discount_type: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED_AMOUNT',
    discount_value: '',
    max_discount_amount: '',
    min_purchase_amount: '',
    max_usage_total: '',
    max_usage_per_user: '1',
    customer_type_restriction: 'ALL' as 'ALL' | 'NORMAL' | 'MERCHANT',
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: '',
    admin_notes: '',
    is_active: true
  });


  useEffect(() => {
    fetchVouchers();
  }, []);

  const fetchVouchers = async () => {
    try {
      const { data, error } = await supabase
        .from('vouchers' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVouchers((data as unknown as Voucher[]) || []);
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

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      discount_type: 'PERCENTAGE',
      discount_value: '',
      max_discount_amount: '',
      min_purchase_amount: '',
      max_usage_total: '',
      max_usage_per_user: '1',
      customer_type_restriction: 'ALL',
      valid_from: new Date().toISOString().split('T')[0],
      valid_until: '',
      admin_notes: '',
      is_active: true
    });
    setEditingVoucher(null);
  };

  const handleCreate = async () => {
    try {
      const voucherData = {
        code: formData.code.toUpperCase(),
        name: formData.name,
        description: formData.description,
        discount_type: formData.discount_type,
        discount_value: parseFloat(formData.discount_value),
        max_discount_amount: formData.max_discount_amount ? parseFloat(formData.max_discount_amount) : null,
        min_purchase_amount: formData.min_purchase_amount ? parseFloat(formData.min_purchase_amount) : 0,
        max_usage_total: formData.max_usage_total ? parseInt(formData.max_usage_total) : null,
        max_usage_per_user: parseInt(formData.max_usage_per_user),
        customer_type_restriction: formData.customer_type_restriction,
        valid_from: new Date(formData.valid_from).toISOString(),
        valid_until: formData.valid_until ? new Date(formData.valid_until).toISOString() : null,
        admin_notes: formData.admin_notes || null,
        is_active: formData.is_active
      };

      const { error } = await supabase
        .from('vouchers' as any)
        .insert([voucherData]);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Voucher created successfully'
      });

      resetForm();
      setIsCreateModalOpen(false);
      fetchVouchers();
    } catch (error: any) {
      console.error('Error creating voucher:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create voucher',
        variant: 'destructive'
      });
    }
  };

  const handleUpdate = async () => {
    if (!editingVoucher) return;

    try {
      const voucherData = {
        name: formData.name,
        description: formData.description,
        discount_value: parseFloat(formData.discount_value),
        max_discount_amount: formData.max_discount_amount ? parseFloat(formData.max_discount_amount) : null,
        min_purchase_amount: formData.min_purchase_amount ? parseFloat(formData.min_purchase_amount) : 0,
        max_usage_total: formData.max_usage_total ? parseInt(formData.max_usage_total) : null,
        max_usage_per_user: parseInt(formData.max_usage_per_user),
        valid_until: formData.valid_until ? new Date(formData.valid_until).toISOString() : null,
        admin_notes: formData.admin_notes || null,
        is_active: formData.is_active
      };

      const { error } = await supabase
        .from('vouchers' as any)
        .update(voucherData)
        .eq('id', editingVoucher.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Voucher updated successfully'
      });

      resetForm();
      setIsCreateModalOpen(false);
      fetchVouchers();
    } catch (error: any) {
      console.error('Error updating voucher:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update voucher',
        variant: 'destructive'
      });
    }
  };

  const handleEdit = (voucher: Voucher) => {
    setEditingVoucher(voucher);
    setFormData({
      code: voucher.code,
      name: voucher.name,
      description: voucher.description || '',
      discount_type: voucher.discount_type,
      discount_value: voucher.discount_value.toString(),
      max_discount_amount: voucher.max_discount_amount?.toString() || '',
      min_purchase_amount: voucher.min_purchase_amount.toString(),
      max_usage_total: voucher.max_usage_total?.toString() || '',
      max_usage_per_user: voucher.max_usage_per_user.toString(),
      customer_type_restriction: voucher.customer_type_restriction,
      valid_from: new Date(voucher.valid_from).toISOString().split('T')[0],
      valid_until: voucher.valid_until ? new Date(voucher.valid_until).toISOString().split('T')[0] : '',
      admin_notes: voucher.admin_notes || '',
      is_active: voucher.is_active
    });
    setIsCreateModalOpen(true);
  };

  const handleToggleActive = async (voucher: Voucher) => {
    try {
      const { error } = await supabase
        .from('vouchers' as any)
        .update({ is_active: !voucher.is_active })
        .eq('id', voucher.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Voucher ${!voucher.is_active ? 'activated' : 'deactivated'}`
      });

      fetchVouchers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to update voucher status',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this voucher?')) return;

    try {
      const { error } = await supabase
        .from('vouchers' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Voucher deleted successfully'
      });

      fetchVouchers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to delete voucher',
        variant: 'destructive'
      });
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: 'Copied',
      description: `Voucher code "${code}" copied to clipboard`
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDiscountDisplay = (voucher: Voucher) => {
    if (voucher.discount_type === 'PERCENTAGE') {
      return `${voucher.discount_value}%${voucher.max_discount_amount ? ` (max RM ${voucher.max_discount_amount})` : ''}`;
    }
    return `RM ${voucher.discount_value}`;
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Voucher Management</h1>
          <p className="text-muted-foreground">Create and manage discount vouchers for customers</p>
        </div>

        <Dialog
          open={isCreateModalOpen}
          onOpenChange={(open) => {
            if (!open) {
              resetForm();
            }
            setIsCreateModalOpen(open);
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Voucher
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingVoucher ? 'Edit Voucher' : 'Create New Voucher'}</DialogTitle>
              <DialogDescription>
                {editingVoucher ? 'Update voucher details' : 'Create a new discount voucher for customers'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Voucher Code *</Label>
                  <Input
                    id="code"
                    placeholder="SAVE50"
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    disabled={!!editingVoucher}
                    className="uppercase"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    placeholder="50% Off Voucher"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Get 50% discount on your order"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="discount_type">Discount Type *</Label>
                  <Select
                    value={formData.discount_type}
                    onValueChange={(value: 'PERCENTAGE' | 'FIXED_AMOUNT') =>
                      setFormData(prev => ({ ...prev, discount_type: value }))
                    }
                    disabled={!!editingVoucher}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                      <SelectItem value="FIXED_AMOUNT">Fixed Amount (RM)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discount_value">Discount Value *</Label>
                  <Input
                    id="discount_value"
                    type="number"
                    placeholder={formData.discount_type === 'PERCENTAGE' ? '10' : '50'}
                    value={formData.discount_value}
                    onChange={(e) => setFormData(prev => ({ ...prev, discount_value: e.target.value }))}
                  />
                </div>

                {formData.discount_type === 'PERCENTAGE' && (
                  <div className="space-y-2">
                    <Label htmlFor="max_discount">Max Discount (RM)</Label>
                    <Input
                      id="max_discount"
                      type="number"
                      placeholder="100"
                      value={formData.max_discount_amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, max_discount_amount: e.target.value }))}
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="min_purchase">Min Purchase (RM)</Label>
                  <Input
                    id="min_purchase"
                    type="number"
                    placeholder="0"
                    value={formData.min_purchase_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, min_purchase_amount: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_total">Max Total Uses</Label>
                  <Input
                    id="max_total"
                    type="number"
                    placeholder="Unlimited"
                    value={formData.max_usage_total}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_usage_total: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_per_user">Max Per User *</Label>
                  <Input
                    id="max_per_user"
                    type="number"
                    placeholder="1"
                    value={formData.max_usage_per_user}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_usage_per_user: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer_type">Customer Type Restriction</Label>
                <Select
                  value={formData.customer_type_restriction}
                  onValueChange={(value: 'ALL' | 'NORMAL' | 'MERCHANT') =>
                    setFormData(prev => ({ ...prev, customer_type_restriction: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Customers</SelectItem>
                    <SelectItem value="NORMAL">Normal Customers Only</SelectItem>
                    <SelectItem value="MERCHANT">Merchant Customers Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="valid_from">Valid From *</Label>
                  <Input
                    id="valid_from"
                    type="date"
                    value={formData.valid_from}
                    onChange={(e) => setFormData(prev => ({ ...prev, valid_from: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="valid_until">Valid Until</Label>
                  <Input
                    id="valid_until"
                    type="date"
                    value={formData.valid_until}
                    onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin_notes">Admin Notes (Internal)</Label>
                <Textarea
                  id="admin_notes"
                  placeholder="Internal notes about this voucher"
                  value={formData.admin_notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, admin_notes: e.target.value }))}
                  rows={2}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => {
                setIsCreateModalOpen(false);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button onClick={editingVoucher ? handleUpdate : handleCreate}>
                {editingVoucher ? 'Update Voucher' : 'Create Voucher'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Vouchers Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Vouchers ({vouchers.length})</CardTitle>
          <CardDescription>Manage and monitor voucher usage</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : vouchers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Tag className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No vouchers created yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Valid Until</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vouchers.map((voucher) => (
                  <TableRow key={voucher.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="font-mono font-bold">{voucher.code}</code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyCode(voucher.code)}
                          className="h-6 w-6 p-0"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{voucher.name}</p>
                        {voucher.description && (
                          <p className="text-xs text-muted-foreground">{voucher.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getDiscountDisplay(voucher)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{voucher.current_usage_count} / {voucher.max_usage_total || '∞'}</p>
                        <p className="text-xs text-muted-foreground">
                          {voucher.max_usage_per_user} per user
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3" />
                        {voucher.valid_until ? formatDate(voucher.valid_until) : 'No expiry'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={voucher.is_active ? 'default' : 'secondary'}>
                        {voucher.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(voucher)}
                          className="h-8 w-8 p-0"
                        >
                          {voucher.is_active ? (
                            <ToggleRight className="h-4 w-4 text-green-600" />
                          ) : (
                            <ToggleLeft className="h-4 w-4 text-gray-400" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(voucher)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(voucher.id)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VoucherManagement;
