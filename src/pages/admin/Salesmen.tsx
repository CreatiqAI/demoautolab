import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Search,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  UserCheck,
  UserX,
  Copy,
  Users,
  DollarSign,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Salesman {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  referral_code: string;
  commission_rate: number;
  is_active: boolean;
  total_referrals: number;
  total_commission: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface SalesmanFormData {
  name: string;
  phone: string;
  email: string;
  referral_code: string;
  commission_rate: number;
  is_active: boolean;
  notes: string;
}

const initialFormData: SalesmanFormData = {
  name: '',
  phone: '',
  email: '',
  referral_code: '',
  commission_rate: 5.00,
  is_active: true,
  notes: ''
};

export default function Salesmen() {
  const [salesmen, setSalesmen] = useState<Salesman[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedSalesman, setSelectedSalesman] = useState<Salesman | null>(null);
  const [formData, setFormData] = useState<SalesmanFormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Stats
  const totalSalesmen = salesmen.length;
  const activeSalesmen = salesmen.filter(s => s.is_active).length;
  const totalReferrals = salesmen.reduce((sum, s) => sum + (s.total_referrals || 0), 0);
  const totalCommission = salesmen.reduce((sum, s) => sum + (s.total_commission || 0), 0);

  useEffect(() => {
    fetchSalesmen();
  }, []);

  const fetchSalesmen = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('salesmen')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSalesmen(data || []);
    } catch (error: any) {
      console.error('Error fetching salesmen:', error);
      toast({
        title: 'Error',
        description: 'Failed to load salesmen. The table may not exist yet.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const generateReferralCode = () => {
    const prefix = formData.name
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .slice(0, 6) || 'REF';
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${suffix}`;
  };

  const handleCreateSalesman = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'Error', description: 'Name is required', variant: 'destructive' });
      return;
    }
    if (!formData.referral_code.trim()) {
      toast({ title: 'Error', description: 'Referral code is required', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('salesmen')
        .insert({
          name: formData.name.trim(),
          phone: formData.phone.trim() || null,
          email: formData.email.trim() || null,
          referral_code: formData.referral_code.trim().toUpperCase(),
          commission_rate: formData.commission_rate,
          is_active: formData.is_active,
          notes: formData.notes.trim() || null
        });

      if (error) {
        if (error.code === '23505') {
          throw new Error('A salesman with this referral code already exists');
        }
        throw error;
      }

      toast({ title: 'Success', description: 'Salesman created successfully' });
      setIsCreateDialogOpen(false);
      setFormData(initialFormData);
      fetchSalesmen();
    } catch (error: any) {
      console.error('Error creating salesman:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create salesman',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateSalesman = async () => {
    if (!selectedSalesman) return;
    if (!formData.name.trim()) {
      toast({ title: 'Error', description: 'Name is required', variant: 'destructive' });
      return;
    }
    if (!formData.referral_code.trim()) {
      toast({ title: 'Error', description: 'Referral code is required', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('salesmen')
        .update({
          name: formData.name.trim(),
          phone: formData.phone.trim() || null,
          email: formData.email.trim() || null,
          referral_code: formData.referral_code.trim().toUpperCase(),
          commission_rate: formData.commission_rate,
          is_active: formData.is_active,
          notes: formData.notes.trim() || null
        })
        .eq('id', selectedSalesman.id);

      if (error) {
        if (error.code === '23505') {
          throw new Error('A salesman with this referral code already exists');
        }
        throw error;
      }

      toast({ title: 'Success', description: 'Salesman updated successfully' });
      setIsEditDialogOpen(false);
      setSelectedSalesman(null);
      setFormData(initialFormData);
      fetchSalesmen();
    } catch (error: any) {
      console.error('Error updating salesman:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update salesman',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSalesman = async () => {
    if (!selectedSalesman) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('salesmen')
        .delete()
        .eq('id', selectedSalesman.id);

      if (error) throw error;

      toast({ title: 'Success', description: 'Salesman deleted successfully' });
      setIsDeleteDialogOpen(false);
      setSelectedSalesman(null);
      fetchSalesmen();
    } catch (error: any) {
      console.error('Error deleting salesman:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete salesman',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (salesman: Salesman) => {
    try {
      const { error } = await supabase
        .from('salesmen')
        .update({ is_active: !salesman.is_active })
        .eq('id', salesman.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Salesman ${salesman.is_active ? 'deactivated' : 'activated'} successfully`
      });
      fetchSalesmen();
    } catch (error: any) {
      console.error('Error toggling salesman status:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update status',
        variant: 'destructive'
      });
    }
  };

  const copyReferralCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: 'Copied', description: `Referral code "${code}" copied to clipboard` });
  };

  const openEditDialog = (salesman: Salesman) => {
    setSelectedSalesman(salesman);
    setFormData({
      name: salesman.name,
      phone: salesman.phone || '',
      email: salesman.email || '',
      referral_code: salesman.referral_code,
      commission_rate: salesman.commission_rate,
      is_active: salesman.is_active,
      notes: salesman.notes || ''
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (salesman: Salesman) => {
    setSelectedSalesman(salesman);
    setIsDeleteDialogOpen(true);
  };

  const filteredSalesmen = salesmen.filter(salesman => {
    const matchesSearch =
      salesman.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      salesman.referral_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (salesman.email?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (salesman.phone?.includes(searchTerm) ?? false);

    const matchesActive = !showActiveOnly || salesman.is_active;

    return matchesSearch && matchesActive;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Salesmen Management</h2>
          <p className="text-muted-foreground">
            Manage sales representatives and their referral codes
          </p>
        </div>
        <Button onClick={() => {
          setFormData(initialFormData);
          setIsCreateDialogOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Salesman
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Salesmen</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSalesmen}</div>
            <p className="text-xs text-muted-foreground">
              {activeSalesmen} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Salesmen</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSalesmen}</div>
            <p className="text-xs text-muted-foreground">
              {totalSalesmen > 0 ? Math.round((activeSalesmen / totalSalesmen) * 100) : 0}% of total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReferrals}</div>
            <p className="text-xs text-muted-foreground">
              Successful merchant signups
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Commission</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalCommission)}</div>
            <p className="text-xs text-muted-foreground">
              Earned commission
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Salesmen Table */}
      <Card>
        <CardHeader>
          <CardTitle>Salesmen List</CardTitle>
          <CardDescription>
            All registered sales representatives
          </CardDescription>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, code, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="active-only"
                checked={showActiveOnly}
                onCheckedChange={setShowActiveOnly}
              />
              <Label htmlFor="active-only">Active only</Label>
            </div>
            <Button variant="outline" size="icon" onClick={fetchSalesmen}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
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
                  <TableHead>Salesman</TableHead>
                  <TableHead>Referral Code</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Referrals</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSalesmen.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      {searchTerm || showActiveOnly
                        ? 'No salesmen found matching your filters.'
                        : 'No salesmen registered yet. Click "Add Salesman" to create one.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSalesmen.map((salesman) => (
                    <TableRow key={salesman.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{salesman.name}</div>
                          {salesman.email && (
                            <div className="text-sm text-muted-foreground">{salesman.email}</div>
                          )}
                          {salesman.phone && (
                            <div className="text-sm text-muted-foreground">{salesman.phone}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                            {salesman.referral_code}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyReferralCode(salesman.referral_code)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{salesman.commission_rate}%</div>
                          <div className="text-sm text-muted-foreground">
                            {formatCurrency(salesman.total_commission || 0)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {salesman.total_referrals || 0} referrals
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={salesman.is_active ? 'default' : 'destructive'}>
                          {salesman.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(salesman.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(salesman)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleActive(salesman)}>
                              {salesman.is_active ? (
                                <>
                                  <UserX className="mr-2 h-4 w-4" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <UserCheck className="mr-2 h-4 w-4" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openDeleteDialog(salesman)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Salesman Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Salesman</DialogTitle>
            <DialogDescription>
              Create a new sales representative with a unique referral code.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">Name *</Label>
              <Input
                id="create-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ahmad Salesman"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-phone">Phone</Label>
              <Input
                id="create-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+60123456789"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-email">Email</Label>
              <Input
                id="create-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="ahmad@autolab.my"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-referral">Referral Code *</Label>
              <div className="flex gap-2">
                <Input
                  id="create-referral"
                  value={formData.referral_code}
                  onChange={(e) => setFormData({ ...formData, referral_code: e.target.value.toUpperCase() })}
                  placeholder="AHMAD001"
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFormData({ ...formData, referral_code: generateReferralCode() })}
                >
                  Generate
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Unique code for tracking merchant referrals
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-commission">Commission Rate (%)</Label>
              <Input
                id="create-commission"
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={formData.commission_rate}
                onChange={(e) => setFormData({ ...formData, commission_rate: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-notes">Notes</Label>
              <Textarea
                id="create-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Region, specialty, etc."
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="create-active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="create-active">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSalesman} disabled={isSaving}>
              {isSaving ? 'Creating...' : 'Create Salesman'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Salesman Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Salesman</DialogTitle>
            <DialogDescription>
              Update salesman details and settings.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-referral">Referral Code *</Label>
              <Input
                id="edit-referral"
                value={formData.referral_code}
                onChange={(e) => setFormData({ ...formData, referral_code: e.target.value.toUpperCase() })}
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-commission">Commission Rate (%)</Label>
              <Input
                id="edit-commission"
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={formData.commission_rate}
                onChange={(e) => setFormData({ ...formData, commission_rate: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="edit-active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="edit-active">Active</Label>
            </div>

            {selectedSalesman && (
              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground">
                  Total Referrals: <strong>{selectedSalesman.total_referrals || 0}</strong>
                </p>
                <p className="text-sm text-muted-foreground">
                  Total Commission: <strong>{formatCurrency(selectedSalesman.total_commission || 0)}</strong>
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateSalesman} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Salesman</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this salesman? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {selectedSalesman && (
            <div className="py-4">
              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <p><strong>Name:</strong> {selectedSalesman.name}</p>
                <p><strong>Referral Code:</strong> {selectedSalesman.referral_code}</p>
                <p><strong>Total Referrals:</strong> {selectedSalesman.total_referrals || 0}</p>
                {selectedSalesman.total_referrals > 0 && (
                  <p className="text-amber-600 text-sm">
                    Warning: This salesman has {selectedSalesman.total_referrals} referral(s).
                    Deleting will not affect existing merchant records.
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteSalesman} disabled={isSaving}>
              {isSaving ? 'Deleting...' : 'Delete Salesman'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
