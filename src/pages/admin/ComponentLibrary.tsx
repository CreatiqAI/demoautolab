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
import { Plus, Edit, Trash2, Package, Tag, Layers } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface ComponentLibraryItem {
  id: string;
  component_sku: string;
  name: string;
  description: string;
  component_type: string;
  component_value: string;
  stock_level: number;
  normal_price: number;
  merchant_price: number;
  supplier_id?: string;
  supplier_name?: string;
  is_active: boolean;
  default_image_url?: string;
  created_at: string;
}

interface Supplier {
  id: string;
  name: string;
  company_name: string;
  is_active: boolean;
}

const COMPONENT_TYPES = [
  { value: 'color', label: 'Color', icon: '🎨' },
  { value: 'size', label: 'Size', icon: '📏' },
  { value: 'storage', label: 'Storage', icon: '💾' },
  { value: 'component', label: 'Component', icon: '🔧' },
  { value: 'compatibility', label: 'Compatibility', icon: '✅' },
  { value: 'bundle', label: 'Bundle', icon: '📦' },
  { value: 'material', label: 'Material', icon: '🏗️' },
  { value: 'brand', label: 'Brand', icon: '🏷️' },
  { value: 'other', label: 'Other', icon: '📋' }
];

export default function ComponentLibrary() {
  const [components, setComponents] = useState<ComponentLibraryItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
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
    supplier_id: '',
    default_image_url: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchComponents();
    fetchSuppliers();
  }, []);

  const fetchComponents = async () => {
    try {
      setLoading(true);

      // First try with supplier relationship
      let { data, error } = await supabase
        .from('component_library')
        .select(`
          *,
          supplier:supplier_id(
            id,
            name,
            company_name
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      // If supplier relationship fails (column doesn't exist), try without it
      if (error && error.message?.includes('supplier_id')) {
        console.warn('Supplier relationship failed, fetching without supplier data:', error);
        const fallback = await supabase
          .from('component_library')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        data = fallback.data;
        error = fallback.error;
      }

      if (error) throw error;

      // Transform data to include supplier name
      const transformedData = data?.map(item => ({
        ...item,
        supplier_name: item.supplier?.name || 'No Supplier',
        // Set defaults for missing fields
        stock_level: item.stock_level || 0,
        normal_price: item.normal_price || 0,
        merchant_price: item.merchant_price || 0,
        component_sku: item.component_sku || 'NO-SKU'
      })) || [];

      console.log('Fetched components:', transformedData);
      setComponents(transformedData);
    } catch (error: any) {
      console.error('Error fetching components:', error);
      toast({
        title: "Error",
        description: "Failed to load component library: " + (error.message || 'Unknown error'),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name, company_name, is_active')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.warn('Suppliers table may not exist yet:', error);
        setSuppliers([]);
        return;
      }

      console.log('Fetched suppliers:', data);
      setSuppliers(data || []);
    } catch (error: any) {
      console.error('Error fetching suppliers:', error);
      setSuppliers([]);
      // Don't show error toast if suppliers table doesn't exist yet
      if (!error.message?.includes('does not exist')) {
        toast({
          title: "Error",
          description: "Failed to load suppliers: " + (error.message || 'Unknown error'),
          variant: "destructive"
        });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.component_sku || !formData.name || !formData.component_type) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const componentData = {
        component_sku: formData.component_sku,
        name: formData.name,
        description: formData.description,
        component_type: formData.component_type,
        component_value: formData.component_value,
        stock_level: formData.stock_level,
        normal_price: formData.normal_price,
        merchant_price: formData.merchant_price,
        supplier_id: formData.supplier_id === 'no-supplier' ? null : formData.supplier_id,
        default_image_url: formData.default_image_url,
        is_active: true
      };

      if (isEditing) {
        const { error } = await supabase
          .from('component_library')
          .update(componentData)
          .eq('id', formData.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Component updated successfully"
        });
      } else {
        const { error } = await supabase
          .from('component_library')
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
    } catch (error: any) {
      console.error('Error saving component:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save component",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (component: ComponentLibraryItem) => {
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
      supplier_id: component.supplier_id || 'no-supplier',
      default_image_url: component.default_image_url || ''
    });
    setIsEditing(true);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      const { error } = await supabase
        .from('component_library')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Component "${name}" deleted successfully`
      });

      fetchComponents();
    } catch (error: any) {
      console.error('Error deleting component:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete component",
        variant: "destructive"
      });
    }
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
      supplier_id: 'no-supplier',
      default_image_url: ''
    });
    setIsEditing(false);
  };

  const getTypeInfo = (type: string) => {
    return COMPONENT_TYPES.find(t => t.value === type) || { value: type, label: type, icon: '📋' };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Component Library</h1>
          <p className="text-muted-foreground">Manage reusable components for your products</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Component
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Edit Component' : 'Create Component'}</DialogTitle>
              <DialogDescription>
                {isEditing ? 'Update the component details below.' : 'Add a new reusable component to your library.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="component_sku">SKU Code *</Label>
                  <Input
                    id="component_sku"
                    value={formData.component_sku}
                    onChange={(e) => setFormData(prev => ({ ...prev, component_sku: e.target.value }))}
                    placeholder="e.g., BM-026N"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Component Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., BMW X3 9 Inch Casing"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="component_type">Component Type *</Label>
                  <Select
                    value={formData.component_type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, component_type: value }))}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select component type" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPONENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <span className="flex items-center gap-2">
                            <span>{type.icon}</span>
                            {type.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier_id">Supplier</Label>
                  <Select
                    value={formData.supplier_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, supplier_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no-supplier">No Supplier</SelectItem>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{supplier.name}</span>
                            <span className="text-xs text-muted-foreground">{supplier.company_name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="component_value">Component Value</Label>
                <Input
                  id="component_value"
                  value={formData.component_value}
                  onChange={(e) => setFormData(prev => ({ ...prev, component_value: e.target.value }))}
                  placeholder="e.g., black, large, 9-inch"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe this component..."
                  rows={3}
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
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="merchant_price">Cost Price (RM)</Label>
                  <Input
                    id="merchant_price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.merchant_price}
                    onChange={(e) => setFormData(prev => ({ ...prev, merchant_price: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="normal_price">Selling Price (RM)</Label>
                  <Input
                    id="normal_price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.normal_price}
                    onChange={(e) => setFormData(prev => ({ ...prev, normal_price: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Component Image</Label>
                <ImageUpload
                  value={formData.default_image_url}
                  onChange={(url) => setFormData(prev => ({ ...prev, default_image_url: url }))}
                  placeholder="Upload component image..."
                />
                <p className="text-xs text-muted-foreground">
                  This image will be used when adding this component to products
                </p>
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

      {loading ? (
        <div className="text-center py-8">Loading components...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {components.map((component) => {
            const typeInfo = getTypeInfo(component.component_type);
            return (
              <Card key={component.id} className="relative">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {component.default_image_url ? (
                        <img
                          src={component.default_image_url}
                          alt={component.name}
                          className="w-12 h-12 rounded object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center">
                          <span className="text-lg">{typeInfo.icon}</span>
                        </div>
                      )}
                      <div className="flex-1">
                        <CardTitle className="text-lg">{component.name}</CardTitle>
                        <p className="text-sm text-blue-600 font-mono">{component.component_sku}</p>
                        <CardDescription>{component.description}</CardDescription>
                      </div>
                    </div>
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
                        onClick={() => handleDelete(component.id, component.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="secondary">{typeInfo.label}</Badge>
                      {component.component_value && (
                        <Badge variant="outline">{component.component_value}</Badge>
                      )}
                      {component.supplier_name && (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          🏭 {component.supplier_name}
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-1">
                        <Package className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Stock:</span>
                        <span className="font-medium text-blue-600">{component.stock_level}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Cost:</span>
                        <span className="font-medium text-green-600">RM{component.merchant_price?.toFixed(2) || '0.00'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Price:</span>
                        <span className="font-medium text-orange-600">RM{component.normal_price?.toFixed(2) || '0.00'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Margin:</span>
                        <span className="font-medium">
                          {component.normal_price && component.merchant_price
                            ? Math.round(((component.normal_price - component.merchant_price) / component.normal_price) * 100) + '%'
                            : '0%'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!loading && components.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Components Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create reusable components that can be shared across multiple products.
            </p>
            <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Component
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}