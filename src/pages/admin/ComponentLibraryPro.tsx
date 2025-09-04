import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import ImageUpload from '@/components/ui/image-upload';
import { Plus, Edit, Trash2, Package, Tag, Layers, Search, DollarSign, PackagePlus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
}

const COMPONENT_TYPES = [
  { value: 'Casing', label: 'Casing', icon: '📱' },
  { value: 'Socket', label: 'Socket', icon: '🔌' },
  { value: 'Canbus', label: 'Canbus', icon: '🔗' },
  { value: 'Cable', label: 'Cable', icon: '🔌' },
  { value: 'Adapter', label: 'Adapter', icon: '⚡' },
  { value: 'Screen', label: 'Screen', icon: '📺' },
  { value: 'Frame', label: 'Frame', icon: '🖼️' },
  { value: 'Others', label: 'Others', icon: '📦' }
];

export default function ComponentLibraryPro() {
  const [components, setComponents] = useState<ComponentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<ComponentItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<ComponentItem | null>(null);
  const [stockAdjustment, setStockAdjustment] = useState({ type: 'add', quantity: 0, reason: '' });
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
  }, []);

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
      
      // Try using the helper function first
      const { data: functionData, error: functionError } = await supabase
        .rpc('get_components_with_usage');

      if (!functionError && functionData) {
        const componentData = functionData || [];
        setComponents(componentData);
        setSearchResults(componentData);
        return;
      }

      console.warn('Helper function failed, trying direct view query:', functionError);

      // Fallback to direct view query
      const { data, error } = await supabase
        .from('component_library_with_usage')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const componentData = data || [];
        setComponents(componentData);
        setSearchResults(componentData);
        return;
      }

      console.warn('View query failed, trying basic table query:', error);

      // Final fallback to basic table query
      const { data: basicData, error: basicError } = await supabase
        .from('component_library')
        .select('*')
        .order('created_at', { ascending: false });

      if (basicError) throw basicError;
      
      const componentData = basicData || [];
      // Add default usage stats for basic query
      const componentsWithUsage = componentData.map(comp => ({
        ...comp,
        products_used_in: 0,
        total_allocated_stock: 0
      }));
      
      setComponents(componentsWithUsage);
      setSearchResults(componentsWithUsage);
      
    } catch (error: any) {
      console.error('Error fetching components:', error);
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
      const { data, error } = await supabase
        .rpc('search_components', { search_term: term });

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error: any) {
      console.error('Search error:', error);
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
        default_image_url: formData.default_image_url
      };

      if (isEditing) {
        const { error } = await supabase
          .from('component_library')
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
    setDialogOpen(true);
  };


  const handleDelete = async (id: string, sku: string) => {
    if (!confirm(`Are you sure you want to PERMANENTLY DELETE component "${sku}"? This action cannot be undone.`)) return;

    try {
      console.log('Attempting to permanently delete component:', { id, sku });
      
      // Try using the hard delete function first
      const { data: functionData, error: functionError } = await supabase
        .rpc('delete_component', { component_id: id });

      if (!functionError && functionData) {
        console.log('Function delete response:', functionData);
        
        if (functionData.success) {
          toast({
            title: "Success",
            description: functionData.message || "Component permanently deleted"
          });
          fetchComponents();
          return;
        } else {
          // If safe delete fails due to usage, offer force delete option
          if (functionData.message?.includes('used in') && 
              confirm(`${functionData.message}\n\nDo you want to FORCE DELETE this component and remove it from all products/orders? This is DANGEROUS and cannot be undone.`)) {
            
            // Try force delete
            const { data: forceData, error: forceError } = await supabase
              .rpc('force_delete_component', { component_id: id });
              
            if (!forceError && forceData?.success) {
              toast({
                title: "Force Delete Success",
                description: forceData.message,
                variant: "destructive"
              });
              fetchComponents();
              return;
            } else {
              throw new Error(forceData?.message || forceError?.message || 'Force delete failed');
            }
          } else {
            throw new Error(functionData.message || 'Failed to delete component');
          }
        }
      }

      console.warn('Helper function failed, trying direct delete:', functionError);
      
      // Fallback: Direct hard delete from table
      const { data, error } = await supabase
        .from('component_library')
        .delete()
        .eq('id', id)
        .select();

      console.log('Direct hard delete response:', { data, error });

      if (error) throw error;
      
      if (!data || data.length === 0) {
        throw new Error('Delete operation completed but no rows were affected. Component may not exist or be protected by foreign key constraints.');
      }
      
      // Success! The direct delete worked
      console.log('✅ Component successfully deleted via direct delete');
      toast({
        title: "Success", 
        description: "Component permanently deleted"
      });
      
      fetchComponents();
    } catch (error: any) {
      console.error('Error deleting component:', error);
      
      let errorMessage = "Failed to delete component";
      if (error.code === '23503') {
        errorMessage = "Cannot delete component - it is referenced by other records (products or orders). Use the force delete option if necessary.";
      } else if (error.code === '42501') {
        errorMessage = "Insufficient permissions to delete component. Please check your admin access.";
      } else if (error.message?.includes('policy')) {
        errorMessage = "Permission denied. Please ensure you have admin privileges.";
      } else if (error.message?.includes('used in')) {
        errorMessage = error.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
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
      default_image_url: ''
    });
    setIsEditing(false);
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
        .from('component_library')
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
      console.error('Error updating stock:', error);
      toast({
        title: "Error",
        description: "Failed to update stock",
        variant: "destructive"
      });
    }
  };

  const getTypeInfo = (type: string) => {
    return COMPONENT_TYPES.find(t => t.value === type) || { value: type, label: type, icon: '📦' };
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
                  <Label htmlFor="component_sku">Component SKU *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="component_sku"
                      value={formData.component_sku}
                      onChange={(e) => setFormData(prev => ({ ...prev, component_sku: e.target.value }))}
                      placeholder="e.g., CASING-AUDI-A4-1234"
                      required
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (formData.component_type && formData.name) {
                          const generatedSku = generateSKU(formData.component_type, formData.name);
                          setFormData(prev => ({ ...prev, component_sku: generatedSku }));
                        }
                      }}
                      disabled={!formData.component_type || !formData.name}
                      title="Generate SKU from type and name"
                    >
                      Generate
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="component_type">Type *</Label>
                  <Select 
                    value={formData.component_type} 
                    onValueChange={handleTypeChange}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
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

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Components</CardTitle>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Normal Price</TableHead>
                  <TableHead>Merchant Price</TableHead>
                  <TableHead>Stock Actions</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {searchResults.map((component) => {
                  const typeInfo = getTypeInfo(component.component_type);
                  return (
                    <TableRow key={component.id}>
                      <TableCell>
                        {component.default_image_url ? (
                          <img 
                            src={component.default_image_url} 
                            alt={component.name}
                            className="w-12 h-12 rounded object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center text-lg">
                            {typeInfo.icon}
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
                          <span className="mr-1">{typeInfo.icon}</span>
                          {typeInfo.label}
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
          )}
          
          {!loading && searchResults.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No components found matching your search.' : 'No components created yet.'}
            </div>
          )}
        </CardContent>
      </Card>

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
    </div>
  );
}