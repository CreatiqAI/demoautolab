import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import ImageUpload from '@/components/ui/image-upload';
import { Plus, Edit, Trash2, Package, Tag, Layers, Search, DollarSign, PackagePlus, Clock, RotateCcw, AlertTriangle, Copy, ChevronUp, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';

interface ComponentItem {
  id: string;
  component_sku: string;
  name: string;
  description: string;
  component_type: string;
  component_value: string;
  stock_level: number;
  normal_price: number;
  merchant_price: number;
  default_image_url?: string;
  is_active: boolean;
  products_used_in?: number;
  total_allocated_stock?: number;
  created_at: string;
  updated_at?: string;
}


// Component types will be fetched from database
// Users can also create new types on the fly
const DEFAULT_COMPONENT_ICON = '📦';

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return date.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' });
}

export default function ComponentLibraryPro() {
  const [components, setComponents] = useState<ComponentItem[]>([]);
  const [componentTypes, setComponentTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<ComponentItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreatingNewType, setIsCreatingNewType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<ComponentItem | null>(null);
  const [stockAdjustment, setStockAdjustment] = useState({ type: 'add', quantity: 0, reason: '' });
  const [batchDeleteIds, setBatchDeleteIds] = useState<Set<string>>(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [batchBarExpanded, setBatchBarExpanded] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [deletedComponents, setDeletedComponents] = useState<ComponentItem[]>([]);
  const [activeTab, setActiveTab] = useState('active');
  const [duplicateSkus, setDuplicateSkus] = useState<{sku: string; count: number; items: ComponentItem[]}[]>([]);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    id: '',
    component_sku: '',
    name: '',
    description: '',
    component_type: '',
    component_value: '',
    stock_level: 0,
    normal_price: 0,
    merchant_price: 0,
    default_image_url: ''
  });

  useEffect(() => {
    fetchComponents();
    fetchComponentTypes();
    fetchDeletedComponents();
  }, []);

  const fetchComponentTypes = async () => {
    try {
      // Get unique component types from existing components
      const { data, error } = await supabase
        .from('component_library' as any)
        .select('component_type')
        .not('component_type', 'is', null);

      if (error) throw error;

      // Extract unique types
      const uniqueTypes = [...new Set((data || []).map((item: any) => item.component_type))].sort();
      setComponentTypes(uniqueTypes);
    } catch (error: any) {
    }
  };

  const fetchDeletedComponents = async () => {
    try {
      const { data, error } = await supabase
        .from('component_library' as any)
        .select('*')
        .eq('is_active', false)
        .order('updated_at', { ascending: false, nullsFirst: false });

      if (error) throw error;
      setDeletedComponents((data as any) || []);
    } catch {
      // Table might not have inactive rows
    }
  };

  const detectDuplicateSkus = (items: ComponentItem[]) => {
    const skuMap = new Map<string, ComponentItem[]>();
    items.forEach(item => {
      const sku = item.component_sku.toLowerCase().trim();
      if (!skuMap.has(sku)) skuMap.set(sku, []);
      skuMap.get(sku)!.push(item);
    });
    const dupes = Array.from(skuMap.entries())
      .filter(([, items]) => items.length > 1)
      .map(([sku, items]) => ({ sku: items[0].component_sku, count: items.length, items }));
    setDuplicateSkus(dupes);
  };

  // Debounced search effect
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchTerm.trim()) {
        performSearch(searchTerm);
      } else {
        setSearchResults(components);
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm, components]);

  const fetchComponents = async () => {
    try {
      setLoading(true);

      // Use basic query first, then get supplier info separately
      const { data: basicData, error: basicError } = await supabase
        .from('component_library' as any)
        .select(`
          id,
          component_sku,
          name,
          description,
          component_type,
          component_value,
          stock_level,
          normal_price,
          merchant_price,
          default_image_url,
          is_active,
          created_at,
          updated_at,
          min_stock_level,
          max_stock_level,
          reorder_point,
          warehouse_location,
          last_restocked
        `)
        .eq('is_active', true)
        .order('updated_at', { ascending: false, nullsFirst: false });

      if (basicError) throw basicError;

      const componentData = (basicData as any) || [];

      // Add usage stats without supplier information
      const componentsWithUsage = (componentData as any[]).map((comp: any) => {
        return {
          ...comp,
          products_used_in: 0,
          total_allocated_stock: 0
        };
      });

      setComponents(componentsWithUsage as any);
      setSearchResults(componentsWithUsage as any);
      detectDuplicateSkus(componentsWithUsage as any);

    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load components. Please check permissions and ensure the database schema is updated.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };


  const performSearch = async (term: string) => {
    try {
      const { data, error } = await (supabase.rpc as any)('search_components', { search_term: term });

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error: any) {
      // Fallback to client-side search if function doesn't exist
      const filtered = components.filter(comp => 
        comp.component_sku.toLowerCase().includes(term.toLowerCase()) ||
        comp.name.toLowerCase().includes(term.toLowerCase()) ||
        comp.description.toLowerCase().includes(term.toLowerCase())
      );
      setSearchResults(filtered);
    }
  };

  const generateSKU = (type: string, name: string) => {
    const typePrefix = type.toUpperCase();
    const nameSlug = name.toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 15);
    const timestamp = Date.now().toString().slice(-4);
    return `${typePrefix}-${nameSlug}-${timestamp}`;
  };

  const handleTypeChange = (type: string) => {
    setFormData(prev => ({ 
      ...prev, 
      component_type: type
    }));
  };

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.component_sku.trim()) {
      toast({
        title: "Error",
        description: "Component SKU is required",
        variant: "destructive"
      });
      return;
    }

    // Use new type name if creating new, otherwise use selected type
    const typeToSave = isCreatingNewType
      ? newTypeName.trim()
      : formData.component_type;

    if (!typeToSave) {
      toast({
        title: 'Validation Error',
        description: 'Please select a type or create a new one',
        variant: 'destructive'
      });
      return;
    }

    try {
      const componentData = {
        component_sku: formData.component_sku,
        name: formData.name,
        description: formData.description,
        component_type: typeToSave,
        component_value: formData.component_value,
        stock_level: formData.stock_level,
        normal_price: formData.normal_price,
        merchant_price: formData.merchant_price,
        default_image_url: formData.default_image_url
      };

      if (isEditing) {
        const { error } = await supabase
          .from('component_library' as any)
          .update({
            ...componentData,
            updated_at: new Date().toISOString()
          })
          .eq('id', formData.id);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Component updated successfully"
        });
      } else {
        const { error } = await supabase
          .from('component_library' as any)
          .insert([componentData]);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Component created successfully"
        });
      }

      setDialogOpen(false);
      resetForm();
      fetchComponents();
      fetchComponentTypes(); // Refresh types list
    } catch (error: any) {
      
      if (error.code === '23505') {
        toast({
          title: "Error",
          description: "A component with this SKU already exists",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to save component",
          variant: "destructive"
        });
      }
    }
  };

  const handleEdit = (component: ComponentItem) => {
    setFormData({
      id: component.id,
      component_sku: component.component_sku,
      name: component.name,
      description: component.description,
      component_type: component.component_type,
      component_value: component.component_value,
      stock_level: component.stock_level,
      normal_price: component.normal_price,
      merchant_price: component.merchant_price,
      default_image_url: component.default_image_url || ''
    });
    setIsEditing(true);
    setIsCreatingNewType(false);
    setNewTypeName('');
    setDialogOpen(true);
  };


  const softDeleteComponent = async (id: string) => {
    const { error } = await supabase
      .from('component_library' as any)
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);
    return error;
  };

  const handleDelete = async (id: string, sku: string) => {
    if (!confirm(`Delete component "${sku}"? It will be moved to Recently Deleted.`)) return;

    try {
      const error = await softDeleteComponent(id);
      if (error) throw error;

      // Move to deleted list locally
      const deleted = components.find(c => c.id === id);
      if (deleted) setDeletedComponents(prev => [{ ...deleted, is_active: false }, ...prev]);
      setComponents(prev => prev.filter(c => c.id !== id));
      setSearchResults(prev => prev.filter(c => c.id !== id));

      toast({ title: "Deleted", description: `${sku} moved to Recently Deleted` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete", variant: "destructive" });
    }
  };

  const handleRestore = async (id: string, sku: string) => {
    try {
      const { error } = await supabase
        .from('component_library' as any)
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      const restored = deletedComponents.find(c => c.id === id);
      if (restored) setComponents(prev => [{ ...restored, is_active: true }, ...prev]);
      setDeletedComponents(prev => prev.filter(c => c.id !== id));

      toast({ title: "Restored", description: `${sku} has been restored` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to restore", variant: "destructive" });
    }
  };

  const handlePermanentDelete = async (id: string, sku: string) => {
    if (!confirm(`PERMANENTLY delete "${sku}"? This cannot be undone.`)) return;

    try {
      const { error } = await supabase
        .from('component_library' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
      setDeletedComponents(prev => prev.filter(c => c.id !== id));
      toast({ title: "Permanently Deleted", description: `${sku} has been permanently removed` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to permanently delete", variant: "destructive" });
    }
  };

  const handleBatchDelete = async () => {
    const ids = Array.from(batchDeleteIds);
    if (ids.length === 0) return;
    if (!confirm(`Are you sure you want to PERMANENTLY DELETE ${ids.length} component${ids.length > 1 ? 's' : ''}? This action cannot be undone.`)) return;

    setBatchDeleting(true);
    let successCount = 0;
    let failCount = 0;

    // Move to deleted via soft-delete
    const deletedItems = components.filter(c => batchDeleteIds.has(c.id));
    for (const id of ids) {
      try {
        const error = await softDeleteComponent(id);
        if (!error) successCount++;
        else failCount++;
      } catch {
        failCount++;
      }
    }

    // Update local state
    setDeletedComponents(prev => [...deletedItems.map(c => ({ ...c, is_active: false })), ...prev]);
    setComponents(prev => prev.filter(c => !batchDeleteIds.has(c.id)));
    setSearchResults(prev => prev.filter(c => !batchDeleteIds.has(c.id)));
    setBatchDeleteIds(new Set());
    setBatchDeleting(false);

    toast({
      title: failCount === 0 ? 'Deleted' : 'Partial Success',
      description: `${successCount} component${successCount !== 1 ? 's' : ''} moved to Recently Deleted${failCount > 0 ? `, ${failCount} failed` : ''}`,
      variant: failCount > 0 ? 'destructive' : 'default'
    });
  };

  const resetForm = () => {
    setFormData({
      id: '',
      component_sku: '',
      name: '',
      description: '',
      component_type: '',
      component_value: '',
      stock_level: 0,
      normal_price: 0,
      merchant_price: 0,
      default_image_url: ''
    });
    setIsEditing(false);
    setIsCreatingNewType(false);
    setNewTypeName('');
  };

  const handleStockAdjustment = async () => {
    if (!selectedComponent || stockAdjustment.quantity <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid quantity",
        variant: "destructive"
      });
      return;
    }

    try {
      const newStockLevel = stockAdjustment.type === 'add' 
        ? selectedComponent.stock_level + stockAdjustment.quantity
        : Math.max(0, selectedComponent.stock_level - stockAdjustment.quantity);

      const { error } = await supabase
        .from('component_library' as any)
        .update({
          stock_level: newStockLevel,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedComponent.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Stock ${stockAdjustment.type === 'add' ? 'added' : 'removed'} successfully`
      });

      setStockDialogOpen(false);
      setSelectedComponent(null);
      setStockAdjustment({ type: 'add', quantity: 0, reason: '' });
      fetchComponents();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update stock",
        variant: "destructive"
      });
    }
  };

  const getTypeIcon = (type: string) => {
    // Return default icon for all types
    return DEFAULT_COMPONENT_ICON;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Component Library</h1>
          <p className="text-muted-foreground">Manage your automotive components with SKU tracking</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Component
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Edit Component' : 'Create New Component'}</DialogTitle>
              <DialogDescription>
                {isEditing ? 'Update component details.' : 'Add a new component to your inventory.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center h-5">
                    <Label htmlFor="component_sku">Component SKU *</Label>
                  </div>
                  <Input
                    id="component_sku"
                    value={formData.component_sku}
                    onChange={(e) => setFormData(prev => ({ ...prev, component_sku: e.target.value }))}
                    placeholder="e.g., CASING-AUDI-A4-1234"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between h-5">
                    <Label htmlFor="component_type">Type *</Label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingNewType(!isCreatingNewType);
                        if (!isCreatingNewType) {
                          setFormData(prev => ({ ...prev, component_type: '' }));
                        }
                      }}
                      className="text-xs text-lime-600 hover:text-lime-700 font-medium"
                    >
                      {isCreatingNewType ? 'Select Existing' : '+ Create New'}
                    </button>
                  </div>
                  {isCreatingNewType ? (
                    <Input
                      value={newTypeName}
                      onChange={(e) => setNewTypeName(e.target.value)}
                      placeholder="Enter new type name (e.g., Bracket, Connector)"
                    />
                  ) : (
                    <Select
                      value={formData.component_type}
                      onValueChange={handleTypeChange}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {componentTypes.length > 0 ? (
                          componentTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="General" disabled>No types yet</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Component Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g., Audi A4 9 Inch Casing"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stock_level">Stock Level</Label>
                  <Input
                    id="stock_level"
                    type="number"
                    min="0"
                    value={formData.stock_level}
                    onChange={(e) => setFormData(prev => ({ ...prev, stock_level: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="normal_price">Normal Price (RM)</Label>
                  <Input
                    id="normal_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.normal_price}
                    onChange={(e) => setFormData(prev => ({ ...prev, normal_price: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="merchant_price">Merchant Price (RM)</Label>
                  <Input
                    id="merchant_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.merchant_price}
                    onChange={(e) => setFormData(prev => ({ ...prev, merchant_price: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Detailed component description..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Component Image</Label>
                <ImageUpload
                  value={formData.default_image_url}
                  onChange={(url) => setFormData(prev => ({ ...prev, default_image_url: url }))}
                  placeholder="Upload component image..."
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  {isEditing ? 'Update Component' : 'Create Component'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => { setDialogOpen(false); resetForm(); }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="active">
            Active ({components.length})
          </TabsTrigger>
          <TabsTrigger value="deleted" className="gap-1.5">
            <Trash2 className="h-3.5 w-3.5" />
            Recently Deleted ({deletedComponents.length})
          </TabsTrigger>
          {duplicateSkus.length > 0 && (
            <TabsTrigger value="duplicates" className="gap-1.5 text-amber-600">
              <AlertTriangle className="h-3.5 w-3.5" />
              Duplicated SKUs ({duplicateSkus.length})
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="active">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center gap-3">
            <div className="flex items-center gap-3">
              <CardTitle>Components</CardTitle>
              {batchDeleteIds.size > 0 && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleBatchDelete}
                  disabled={batchDeleting}
                  className="h-8"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  {batchDeleting ? 'Deleting...' : `Delete ${batchDeleteIds.size} Selected`}
                </Button>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by SKU, name, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-80"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading components...</div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={searchResults.length > 0 && searchResults.every(c => batchDeleteIds.has(c.id))}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setBatchDeleteIds(new Set(searchResults.map(c => c.id)));
                        } else {
                          setBatchDeleteIds(new Set());
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Image</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Normal Price</TableHead>
                  <TableHead>Merchant Price</TableHead>
                  <TableHead>Last Edited</TableHead>
                  <TableHead>Stock Actions</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {searchResults.map((component) => {
                  const typeIcon = getTypeIcon(component.component_type);
                  return (
                    <TableRow key={component.id} id={`component-row-${component.id}`} className={`transition-colors duration-700 ${highlightedId === component.id ? 'bg-lime-100' : batchDeleteIds.has(component.id) ? 'bg-red-50/50' : ''}`}>
                      <TableCell>
                        <Checkbox
                          checked={batchDeleteIds.has(component.id)}
                          onCheckedChange={(checked) => {
                            setBatchDeleteIds(prev => {
                              const next = new Set(prev);
                              if (checked) next.add(component.id);
                              else next.delete(component.id);
                              return next;
                            });
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        {component.default_image_url ? (
                          <img
                            src={component.default_image_url}
                            alt={component.name}
                            className="w-12 h-12 rounded object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center text-lg">
                            {typeIcon}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-sm">{component.component_sku}</div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{component.name}</div>
                          {component.description && (
                            <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {component.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          <span className="mr-1">{typeIcon}</span>
                          {component.component_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={component.stock_level > 10 ? 'default' : component.stock_level > 0 ? 'secondary' : 'destructive'}>
                          {component.stock_level}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <span className="text-sm">RM</span>
                          <span className="ml-1 font-medium">{component.normal_price.toFixed(2)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-muted-foreground">
                          <span className="text-sm">RM</span>
                          <span className="ml-1">{component.merchant_price.toFixed(2)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {component.updated_at ? (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground" title={new Date(component.updated_at).toLocaleString()}>
                            <Clock className="h-3.5 w-3.5" />
                            {formatTimeAgo(component.updated_at)}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedComponent(component);
                            setStockAdjustment({ type: 'add', quantity: 0, reason: '' });
                            setStockDialogOpen(true);
                          }}
                        >
                          <PackagePlus className="h-4 w-4 mr-1" />
                          Stock
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(component)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(component.id, component.component_sku)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          )}

          {!loading && searchResults.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No components found matching your search.' : 'No components created yet.'}
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="deleted">
          <Card>
            <CardHeader>
              <CardTitle>Recently Deleted Components</CardTitle>
              <CardDescription>Components that have been soft-deleted. You can restore or permanently delete them.</CardDescription>
            </CardHeader>
            <CardContent>
              {deletedComponents.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Trash2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>No recently deleted components</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Image</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Deleted</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deletedComponents.map((component) => (
                      <TableRow key={component.id} className="opacity-70">
                        <TableCell>
                          {component.default_image_url ? (
                            <img src={component.default_image_url} alt={component.name} className="w-10 h-10 rounded object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center text-sm">📦</div>
                          )}
                        </TableCell>
                        <TableCell><span className="font-mono text-sm">{component.component_sku}</span></TableCell>
                        <TableCell><span className="font-medium">{component.name}</span></TableCell>
                        <TableCell><Badge variant="secondary">{component.component_type}</Badge></TableCell>
                        <TableCell>
                          {component.updated_at && (
                            <span className="text-sm text-muted-foreground">{formatTimeAgo(component.updated_at)}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => handleRestore(component.id, component.component_sku)}>
                              <RotateCcw className="h-3.5 w-3.5 mr-1" />
                              Restore
                            </Button>
                            <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => handlePermanentDelete(component.id, component.component_sku)}>
                              <Trash2 className="h-3.5 w-3.5" />
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
        </TabsContent>

        {duplicateSkus.length > 0 && (
          <TabsContent value="duplicates">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Duplicated SKUs
                </CardTitle>
                <CardDescription>These SKUs appear on multiple components. Review and resolve duplicates.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {duplicateSkus.map(({ sku, count, items }) => (
                    <div key={sku} className="border border-amber-200 bg-amber-50/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Copy className="h-4 w-4 text-amber-600" />
                        <span className="font-mono font-medium text-amber-800">{sku}</span>
                        <Badge variant="secondary" className="bg-amber-100 text-amber-700">{count} duplicates</Badge>
                      </div>
                      <div className="space-y-2">
                        {items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between bg-white rounded-md px-3 py-2 border">
                            <div className="flex items-center gap-3">
                              {item.default_image_url ? (
                                <img src={item.default_image_url} alt={item.name} className="w-8 h-8 rounded object-cover" />
                              ) : (
                                <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-xs">📦</div>
                              )}
                              <div>
                                <p className="text-sm font-medium">{item.name}</p>
                                <p className="text-xs text-muted-foreground">{item.component_type} · RM{item.normal_price}</p>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" onClick={() => handleEdit(item)}>
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDelete(item.id, item.component_sku)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Stock Adjustment Dialog */}
      <Dialog open={stockDialogOpen} onOpenChange={setStockDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
            <DialogDescription>
              {selectedComponent && `Update stock for ${selectedComponent.component_sku}`}
            </DialogDescription>
          </DialogHeader>
          {selectedComponent && (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">Current Stock: {selectedComponent.stock_level}</Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Action</Label>
                  <Select 
                    value={stockAdjustment.type} 
                    onValueChange={(value) => setStockAdjustment(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="add">Add Stock</SelectItem>
                      <SelectItem value="remove">Remove Stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={stockAdjustment.quantity}
                    onChange={(e) => setStockAdjustment(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                    placeholder="Enter quantity"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Reason (Optional)</Label>
                <Textarea
                  value={stockAdjustment.reason}
                  onChange={(e) => setStockAdjustment(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="e.g., New stock arrival, damaged items..."
                  rows={2}
                />
              </div>

              {stockAdjustment.quantity > 0 && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm">
                    <span className="text-muted-foreground">New stock level will be: </span>
                    <span className="font-medium">
                      {stockAdjustment.type === 'add' 
                        ? selectedComponent.stock_level + stockAdjustment.quantity
                        : Math.max(0, selectedComponent.stock_level - stockAdjustment.quantity)
                      }
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button onClick={handleStockAdjustment} className="flex-1">
                  {stockAdjustment.type === 'add' ? 'Add Stock' : 'Remove Stock'}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setStockDialogOpen(false);
                    setSelectedComponent(null);
                    setStockAdjustment({ type: 'add', quantity: 0, reason: '' });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Sticky Batch Delete Bar */}
      {batchDeleteIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.1)]">
          {/* Expandable preview panel */}
          {batchBarExpanded && (
            <div className="border-b border-gray-100 max-h-[40vh] overflow-y-auto">
              <div className="container mx-auto px-6 py-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {components.filter(c => batchDeleteIds.has(c.id)).map((component) => (
                    <div
                      key={component.id}
                      className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2 cursor-pointer hover:bg-red-100/70 transition-colors"
                      onClick={() => {
                        setBatchBarExpanded(false);
                        setActiveTab('active');
                        setTimeout(() => {
                          const row = document.getElementById(`component-row-${component.id}`);
                          if (row) {
                            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            setHighlightedId(component.id);
                            setTimeout(() => setHighlightedId(null), 2000);
                          }
                        }, 100);
                      }}
                    >
                      {component.default_image_url ? (
                        <img src={component.default_image_url} alt={component.name} className="w-8 h-8 rounded object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center flex-shrink-0 text-xs">📦</div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-mono text-red-600">{component.component_sku}</p>
                        <p className="text-sm font-medium truncate">{component.name}</p>
                      </div>
                      <button
                        onClick={() => setBatchDeleteIds(prev => {
                          const next = new Set(prev);
                          next.delete(component.id);
                          return next;
                        })}
                        className="text-gray-400 hover:text-red-500 flex-shrink-0"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {/* Action bar */}
          <div className="container mx-auto px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setBatchBarExpanded(!batchBarExpanded)}
                className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                <ChevronUp className={`h-4 w-4 transition-transform ${batchBarExpanded ? 'rotate-180' : ''}`} />
                {batchDeleteIds.size} component{batchDeleteIds.size !== 1 ? 's' : ''} selected
              </button>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs text-gray-500"
                onClick={() => { setBatchDeleteIds(new Set()); setBatchBarExpanded(false); }}
              >
                Clear
              </Button>
            </div>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleBatchDelete}
              disabled={batchDeleting}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              {batchDeleting ? 'Deleting...' : `Delete ${batchDeleteIds.size} Selected`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}