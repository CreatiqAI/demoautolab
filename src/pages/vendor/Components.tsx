import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useCurrentVendor } from '@/lib/vendorAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import ImageUpload from '@/components/ui/image-upload';
import { Plus, Edit3, Trash2, Search, Loader2, Save, Package, Layers, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface Component {
  id: string;
  component_sku: string;
  name: string;
  component_type: string;
  component_value: string | null;
  description: string | null;
  stock_level: number;
  normal_price: number;
  merchant_price: number;
  default_image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  vendor_id: string;
  approval_status: string;
}

interface FormState {
  component_sku: string;
  name: string;
  component_type: string;
  component_value: string;
  description: string;
  stock_level: string;
  normal_price: string;
  merchant_price: string;
  default_image_url: string;
  is_active: boolean;
}

const emptyForm: FormState = {
  component_sku: '',
  name: '',
  component_type: 'general',
  component_value: '',
  description: '',
  stock_level: '0',
  normal_price: '0',
  merchant_price: '0',
  default_image_url: '',
  is_active: true,
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(amount);

export default function VendorComponents() {
  const { vendor } = useCurrentVendor();
  const { toast } = useToast();
  const [components, setComponents] = useState<Component[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Component | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!vendor?.id) return;
    void fetchComponents();
  }, [vendor?.id]);

  const fetchComponents = async () => {
    if (!vendor?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('component_library' as any)
        .select('*')
        .eq('vendor_id', vendor.id)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      setComponents((data as unknown as Component[]) ?? []);
    } catch (err: any) {
      toast({ title: 'Failed to load components', description: err.message ?? '', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const skuPrefix = vendor?.business_name
    ? vendor.business_name.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase() || 'VND'
    : 'VND';

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, component_sku: `${skuPrefix}-` });
    setOpen(true);
  };

  const openEdit = (c: Component) => {
    setEditing(c);
    setForm({
      component_sku: c.component_sku,
      name: c.name,
      component_type: c.component_type ?? 'general',
      component_value: c.component_value ?? '',
      description: c.description ?? '',
      stock_level: String(c.stock_level ?? 0),
      normal_price: String(c.normal_price ?? 0),
      merchant_price: String(c.merchant_price ?? 0),
      default_image_url: c.default_image_url ?? '',
      is_active: c.is_active ?? true,
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!vendor?.id) return;
    if (!form.component_sku.trim()) {
      toast({ title: 'SKU required', variant: 'destructive' });
      return;
    }
    if (!form.name.trim()) {
      toast({ title: 'Name required', variant: 'destructive' });
      return;
    }
    const normal = Number(form.normal_price);
    const merchant = Number(form.merchant_price);
    const stock = Number(form.stock_level);
    if (isNaN(normal) || normal < 0) {
      toast({ title: 'Invalid price', description: 'Normal price must be a non-negative number.', variant: 'destructive' });
      return;
    }
    if (isNaN(stock) || stock < 0) {
      toast({ title: 'Invalid stock', description: 'Stock level must be a non-negative integer.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        component_sku: form.component_sku.trim(),
        name: form.name.trim(),
        component_type: form.component_type.trim() || 'general',
        component_value: form.component_value.trim() || null,
        description: form.description.trim() || null,
        stock_level: stock,
        normal_price: normal,
        merchant_price: isNaN(merchant) || merchant <= 0 ? normal : merchant,
        default_image_url: form.default_image_url.trim() || null,
        is_active: form.is_active,
        vendor_id: vendor.id,
        approval_status: 'APPROVED',
      };

      if (editing) {
        const { error } = await supabase
          .from('component_library' as any)
          .update(payload as any)
          .eq('id', editing.id)
          .eq('vendor_id', vendor.id);
        if (error) throw error;
        toast({ title: 'Updated', description: `${payload.name} saved.`, variant: 'success' });
      } else {
        const { error } = await supabase
          .from('component_library' as any)
          .insert(payload as any);
        if (error) {
          if (error.message?.includes('duplicate') || error.code === '23505') {
            toast({ title: 'SKU already in use', description: 'Pick a different SKU — they need to be unique across the platform.', variant: 'destructive' });
            setSaving(false);
            return;
          }
          throw error;
        }
        toast({ title: 'Component created', description: `${payload.name} added to your library.`, variant: 'success' });
      }
      setOpen(false);
      void fetchComponents();
    } catch (err: any) {
      toast({ title: 'Save failed', description: err.message ?? 'Please try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: Component) => {
    if (!vendor?.id) return;
    if (!confirm(`Delete component "${c.name}" (${c.component_sku})?\nThis will fail if it's currently used by any of your products.`)) return;
    try {
      const { error } = await supabase
        .from('component_library' as any)
        .delete()
        .eq('id', c.id)
        .eq('vendor_id', vendor.id);
      if (error) {
        if (error.code === '23503') {
          toast({ title: 'In use by products', description: 'Remove this SKU from your products first.', variant: 'destructive' });
          return;
        }
        throw error;
      }
      toast({ title: 'Deleted', description: c.name, variant: 'success' });
      void fetchComponents();
    } catch (err: any) {
      toast({ title: 'Delete failed', description: err.message ?? 'Please try again.', variant: 'destructive' });
    }
  };

  const filtered = components.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.component_sku.toLowerCase().includes(q) ||
      c.component_type?.toLowerCase().includes(q)
    );
  });

  const lowStockCount = components.filter((c) => c.stock_level <= 5).length;
  const activeCount = components.filter((c) => c.is_active).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Components</h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
            Components are the building blocks (SKUs) you bundle into products. Create them here first, then go to Products to publish a listing.
          </p>
        </div>
        <Button onClick={openCreate} className="flex-shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          New component
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total components</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{components.length}</div>
            <p className="text-xs text-muted-foreground mt-1">In your library</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Available for products</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low stock (≤5)</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {lowStockCount > 0 ? 'Needs reorder' : 'Stock healthy'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-base">Your components</CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, SKU, or type"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {loading ? (
            <div className="py-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="py-14 text-center px-6">
              <Package className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <h3 className="text-base font-semibold mb-1">
                {components.length === 0 ? 'No components yet' : 'No matches'}
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">
                {components.length === 0
                  ? 'Create your first SKU to get started. Components describe a single physical part you sell — bundle them into products afterwards.'
                  : 'Try a different search term.'}
              </p>
              {components.length === 0 && (
                <Button variant="outline" onClick={openCreate}>
                  <Plus className="h-4 w-4 mr-2" /> Create first component
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Price (Normal)</TableHead>
                    <TableHead className="text-right">Price (Merchant)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs">{c.component_sku}</TableCell>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-[10px]">{c.component_type}</Badge></TableCell>
                      <TableCell className={`text-right tabular-nums ${c.stock_level <= 5 ? 'text-amber-700 font-medium' : ''}`}>{c.stock_level}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(c.normal_price)}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{formatCurrency(c.merchant_price)}</TableCell>
                      <TableCell>
                        {c.is_active ? (
                          <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(c)} className="h-8 w-8 p-0">
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(c)} className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50">
                            <Trash2 className="h-3.5 w-3.5" />
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

      {/* Edit / Create Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
            <DialogTitle>{editing ? 'Edit component' : 'New component'}</DialogTitle>
            <DialogDescription>
              {editing
                ? `Update SKU ${editing.component_sku}.`
                : `SKU prefix ${skuPrefix}- is suggested to keep your SKUs unique platform-wide. You can override it if you want.`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="sku">SKU <span className="text-red-500">*</span></Label>
                <Input
                  id="sku"
                  value={form.component_sku}
                  onChange={(e) => setForm({ ...form, component_sku: e.target.value.toUpperCase() })}
                  placeholder={`${skuPrefix}-AMP-100`}
                  className="font-mono"
                  disabled={!!editing}
                />
                {editing && <p className="text-[10px] text-muted-foreground">SKU can't change after creation (it's referenced by orders).</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="type">Type</Label>
                <Input
                  id="type"
                  value={form.component_type}
                  onChange={(e) => setForm({ ...form, component_type: e.target.value })}
                  placeholder="e.g. screen, speaker, cable"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
                <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="What's this component called?" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="value">Value / variant (optional)</Label>
                <Input id="value" value={form.component_value} onChange={(e) => setForm({ ...form, component_value: e.target.value })} placeholder="e.g. 10 inch, 800W, Black" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="desc">Description</Label>
                <Textarea id="desc" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Specs, materials, anything that helps customers and admin understand this part." />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stock">Stock level <span className="text-red-500">*</span></Label>
                <Input id="stock" type="number" min={0} step={1} value={form.stock_level} onChange={(e) => setForm({ ...form, stock_level: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="normal">Normal price (MYR) <span className="text-red-500">*</span></Label>
                <Input id="normal" type="number" min={0} step="0.01" value={form.normal_price} onChange={(e) => setForm({ ...form, normal_price: e.target.value })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="merchant">Merchant price (MYR) — optional</Label>
                <Input id="merchant" type="number" min={0} step="0.01" value={form.merchant_price} onChange={(e) => setForm({ ...form, merchant_price: e.target.value })} placeholder="Defaults to normal price if blank or 0" />
                <p className="text-[10px] text-muted-foreground">Shown only to merchant-tier customers. Leave 0 to charge the same as normal.</p>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Component image</Label>
                <ImageUpload
                  value={form.default_image_url}
                  onChange={(url) => setForm({ ...form, default_image_url: url })}
                  placeholder="Upload component photo"
                />
                <p className="text-[10px] text-muted-foreground">Auto-compressed to WebP. Or paste a URL via the second tab.</p>
              </div>
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t flex-shrink-0 bg-background">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {editing ? 'Save changes' : 'Create component'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
