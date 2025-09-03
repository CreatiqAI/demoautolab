import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, RefreshCw, Package2, Gift, Trash2, Edit, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ImageUpload from '@/components/ui/image-upload';

interface ComponentOption {
  id: string;
  name: string;
  description: string;
  component_type: string;
  default_image_url?: string;
  selected: boolean;
  price: number;
  stock: number;
  cost: number;
}

interface ProductFormData {
  name: string;
  description: string;
  brand: string;
  model: string;
  slug: string;
  active: boolean;
  featured: boolean;
  images: Array<{ url: string; is_primary: boolean; alt_text?: string }>;
  components: ComponentOption[];
  createBundle: boolean;
  bundleName: string;
  bundleDiscount: number;
}

export default function ProductsSimple() {
  const [products, setProducts] = useState<any[]>([]);
  const [availableComponents, setAvailableComponents] = useState<ComponentOption[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('basic');
  const { toast } = useToast();

  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    brand: '',
    model: '',
    slug: '',
    active: true,
    featured: false,
    images: [],
    components: [],
    createBundle: false,
    bundleName: 'Complete Package',
    bundleDiscount: 10
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch products and component library
      const [productsRes, componentsRes] = await Promise.all([
        supabase.from('products_new').select('*').order('created_at', { ascending: false }),
        supabase.from('component_library').select('*').eq('is_active', true).order('name')
      ]);

      if (productsRes.error) throw productsRes.error;
      if (componentsRes.error) throw componentsRes.error;

      setProducts(productsRes.data || []);
      
      // Convert library items to component options
      const componentOptions: ComponentOption[] = (componentsRes.data || []).map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        component_type: item.component_type,
        default_image_url: item.default_image_url,
        selected: false,
        price: 0,
        stock: 0,
        cost: 0
      }));
      
      setAvailableComponents(componentOptions);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate slug when name changes
  const generateSlug = async (name: string) => {
    if (!name.trim()) return '';
    
    try {
      const { data, error } = await supabase
        .rpc('generate_unique_slug', { 
          base_name: name,
          table_name: 'products_new'
        });
        
      if (error) throw error;
      return data || '';
    } catch (error) {
      console.error('Error generating slug:', error);
      return name.toLowerCase()
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .trim();
    }
  };

  const handleNameChange = async (name: string) => {
    setFormData(prev => ({ ...prev, name }));
    
    if (name) {
      const slug = await generateSlug(name);
      setFormData(prev => ({ ...prev, slug }));
    }
  };

  const toggleComponent = (componentId: string) => {
    setFormData(prev => ({
      ...prev,
      components: prev.components.map(comp =>
        comp.id === componentId ? { ...comp, selected: !comp.selected } : comp
      )
    }));
  };

  const updateComponentPrice = (componentId: string, field: 'price' | 'stock' | 'cost', value: number) => {
    setFormData(prev => ({
      ...prev,
      components: prev.components.map(comp =>
        comp.id === componentId ? { ...comp, [field]: value } : comp
      )
    }));
  };

  const addComponentsToProduct = () => {
    const newComponents = availableComponents
      .filter(comp => !formData.components.find(existing => existing.id === comp.id))
      .map(comp => ({ ...comp, selected: false }));
    
    setFormData(prev => ({
      ...prev,
      components: [...prev.components, ...newComponents]
    }));
  };

  const removeComponent = (componentId: string) => {
    setFormData(prev => ({
      ...prev,
      components: prev.components.filter(comp => comp.id !== componentId)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const selectedComponents = formData.components.filter(comp => comp.selected);
      
      if (selectedComponents.length === 0) {
        toast({
          title: "Error",
          description: "Please select at least one component",
          variant: "destructive"
        });
        return;
      }

      // 1. Create the product
      const productData = {
        name: formData.name,
        description: formData.description,
        brand: formData.brand,
        model: formData.model,
        slug: formData.slug,
        active: formData.active,
        featured: formData.featured
      };

      const { data: product, error: productError } = await supabase
        .from('products_new')
        .insert([productData])
        .select()
        .single();

      if (productError) throw productError;

      // 2. Add product images
      if (formData.images.length > 0) {
        const imageInserts = formData.images.map((image, index) => ({
          product_id: product.id,
          url: image.url,
          alt_text: image.alt_text,
          is_primary: image.is_primary,
          sort_order: index
        }));

        const { error: imageError } = await supabase
          .from('product_images_new')
          .insert(imageInserts);
        
        if (imageError) throw imageError;
      }

      // 3. Create component variants from selected components
      const componentVariants = [];
      
      for (let i = 0; i < selectedComponents.length; i++) {
        const comp = selectedComponents[i];
        
        // Generate unique SKU
        const { data: sku } = await supabase.rpc('generate_unique_sku', {
          base_name: comp.name,
          component_type: comp.component_type
        });

        const variantData = {
          sku: sku || `${comp.component_type.toUpperCase()}-${comp.name.toUpperCase().replace(/\s/g, '-')}`,
          name: comp.name,
          description: comp.description,
          cost_price: comp.cost,
          selling_price: comp.price,
          stock_quantity: comp.stock,
          reorder_level: 5,
          component_type: comp.component_type,
          component_value: comp.name.toLowerCase().replace(/\s/g, '-'),
          active: true,
          is_bundle: false,
          bundle_component_ids: [],
          bundle_discount_percentage: 0,
          component_library_id: comp.id
        };

        const { data: variant, error: variantError } = await supabase
          .from('component_variants')
          .insert([variantData])
          .select()
          .single();

        if (variantError) throw variantError;
        componentVariants.push(variant);

        // Add component image if it has one
        if (comp.default_image_url) {
          await supabase
            .from('component_variant_images')
            .insert([{
              component_variant_id: variant.id,
              url: comp.default_image_url,
              alt_text: comp.name,
              is_primary: true
            }]);
        }

        // Link component to product
        await supabase
          .from('product_component_variants')
          .insert([{
            product_id: product.id,
            component_variant_id: variant.id,
            is_required: false,
            is_default: i === 0, // First component is default
            display_order: i
          }]);
      }

      // 4. Create bundle if requested
      if (formData.createBundle && selectedComponents.length >= 2) {
        const bundleData = {
          sku: `BUNDLE-${Date.now()}`,
          name: formData.bundleName,
          description: `Bundle package with ${selectedComponents.length} components - Save ${formData.bundleDiscount}%!`,
          cost_price: componentVariants.reduce((sum, v) => sum + v.cost_price, 0),
          selling_price: componentVariants.reduce((sum, v) => sum + v.selling_price, 0),
          stock_quantity: Math.min(...componentVariants.map(v => v.stock_quantity)),
          reorder_level: 5,
          component_type: 'bundle',
          component_value: 'complete-package',
          active: true,
          is_bundle: true,
          bundle_component_ids: componentVariants.map(v => v.id),
          bundle_discount_percentage: formData.bundleDiscount,
          bundle_description: `Complete package deal with all components included`
        };

        const { data: bundle, error: bundleError } = await supabase
          .from('component_variants')
          .insert([bundleData])
          .select()
          .single();

        if (bundleError) throw bundleError;

        // Link bundle to product (as first option)
        await supabase
          .from('product_component_variants')
          .insert([{
            product_id: product.id,
            component_variant_id: bundle.id,
            is_required: false,
            is_default: true, // Bundle is the default option
            display_order: 0
          }]);

        // Update other components to not be default
        await supabase
          .from('product_component_variants')
          .update({ is_default: false })
          .eq('product_id', product.id)
          .neq('component_variant_id', bundle.id);
      }

      toast({
        title: "Success",
        description: `Product "${formData.name}" created successfully!`
      });

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save product",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      brand: '',
      model: '',
      slug: '',
      active: true,
      featured: false,
      images: [],
      components: [],
      createBundle: false,
      bundleName: 'Complete Package',
      bundleDiscount: 10
    });
    setActiveTab('basic');
  };

  const selectedComponentsCount = formData.components.filter(comp => comp.selected).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground">Simple product creation with components</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); addComponentsToProduct(); setIsDialogOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" />
                Create Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Product</DialogTitle>
                <DialogDescription>
                  Build your product by selecting components and setting pricing
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit}>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="basic">Product Details</TabsTrigger>
                    <TabsTrigger value="components">
                      Components {selectedComponentsCount > 0 && `(${selectedComponentsCount})`}
                    </TabsTrigger>
                    <TabsTrigger value="images">Images</TabsTrigger>
                  </TabsList>

                  {/* Basic Product Info */}
                  <TabsContent value="basic" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Product Name *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => handleNameChange(e.target.value)}
                          placeholder="e.g., Audi A4 9/10 Inch Casing"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="slug">URL Slug</Label>
                        <Input
                          id="slug"
                          value={formData.slug}
                          onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                          placeholder="auto-generated"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="brand">Brand</Label>
                        <Input
                          id="brand"
                          value={formData.brand}
                          onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                          placeholder="e.g., Audi"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="model">Model</Label>
                        <Input
                          id="model"
                          value={formData.model}
                          onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                          placeholder="e.g., A4"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe your product..."
                        rows={4}
                      />
                    </div>

                    <div className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={formData.active}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
                        />
                        <Label>Active</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={formData.featured}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, featured: checked }))}
                        />
                        <Label>Featured</Label>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Component Selection */}
                  <TabsContent value="components" className="space-y-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-medium">Select Components</h3>
                        <p className="text-sm text-muted-foreground">Choose components for your product and set pricing</p>
                      </div>
                      <Badge variant="outline">
                        {selectedComponentsCount} of {formData.components.length} selected
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {formData.components.map((component) => (
                        <Card key={component.id} className={component.selected ? 'ring-2 ring-blue-500' : ''}>
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex items-center space-x-3">
                                <Checkbox
                                  checked={component.selected}
                                  onCheckedChange={() => toggleComponent(component.id)}
                                />
                                <div className="flex items-center space-x-2">
                                  {component.default_image_url && (
                                    <img 
                                      src={component.default_image_url} 
                                      alt={component.name}
                                      className="w-10 h-10 rounded object-cover"
                                    />
                                  )}
                                  <div>
                                    <CardTitle className="text-base">{component.name}</CardTitle>
                                    <CardDescription>{component.description}</CardDescription>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Badge variant="secondary">{component.component_type}</Badge>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeComponent(component.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          {component.selected && (
                            <CardContent>
                              <div className="grid grid-cols-3 gap-2">
                                <div className="space-y-1">
                                  <Label className="text-xs">Selling Price ($)</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={component.price}
                                    onChange={(e) => updateComponentPrice(component.id, 'price', parseFloat(e.target.value) || 0)}
                                    placeholder="0.00"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Cost ($)</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={component.cost}
                                    onChange={(e) => updateComponentPrice(component.id, 'cost', parseFloat(e.target.value) || 0)}
                                    placeholder="0.00"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Stock</Label>
                                  <Input
                                    type="number"
                                    value={component.stock}
                                    onChange={(e) => updateComponentPrice(component.id, 'stock', parseInt(e.target.value) || 0)}
                                    placeholder="0"
                                  />
                                </div>
                              </div>
                            </CardContent>
                          )}
                        </Card>
                      ))}
                    </div>

                    {formData.components.length === 0 && (
                      <Card>
                        <CardContent className="text-center py-8">
                          <Package2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                          <h3 className="text-lg font-medium mb-2">No Components Available</h3>
                          <p className="text-muted-foreground">
                            Create components in the Component Library first, then refresh this page.
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    {/* Bundle Option */}
                    {selectedComponentsCount >= 2 && (
                      <Card className="border-orange-200 bg-orange-50">
                        <CardHeader>
                          <div className="flex items-center space-x-2">
                            <Gift className="h-5 w-5 text-orange-600" />
                            <CardTitle className="text-orange-800">Create Bundle Package</CardTitle>
                          </div>
                          <CardDescription className="text-orange-700">
                            Offer selected components as a discounted bundle
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={formData.createBundle}
                              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, createBundle: checked }))}
                            />
                            <Label>Create bundle from selected components</Label>
                          </div>
                          
                          {formData.createBundle && (
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Bundle Name</Label>
                                <Input
                                  value={formData.bundleName}
                                  onChange={(e) => setFormData(prev => ({ ...prev, bundleName: e.target.value }))}
                                  placeholder="Complete Package"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Discount Percentage (%)</Label>
                                <Input
                                  type="number"
                                  step="0.1"
                                  max="50"
                                  value={formData.bundleDiscount}
                                  onChange={(e) => setFormData(prev => ({ ...prev, bundleDiscount: parseFloat(e.target.value) || 0 }))}
                                />
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  {/* Product Images */}
                  <TabsContent value="images" className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium mb-4">Product Images</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {[...Array(4)].map((_, index) => (
                          <div key={index} className="space-y-2">
                            <Label>Image {index + 1} {index === 0 && '(Primary)'}</Label>
                            <ImageUpload
                              value={formData.images[index]?.url || ''}
                              onChange={(url) => {
                                const newImages = [...formData.images];
                                newImages[index] = {
                                  url,
                                  is_primary: index === 0,
                                  alt_text: `${formData.name} - Image ${index + 1}`
                                };
                                setFormData(prev => ({ ...prev, images: newImages.filter(img => img.url) }));
                              }}
                              placeholder={`Upload image ${index + 1}`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="flex gap-4 pt-6 border-t">
                  <Button type="submit" className="flex-1">
                    Create Product
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => { setIsDialogOpen(false); resetForm(); }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Products List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Products</CardTitle>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading products...</div>
          ) : products.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No products created yet. Create your first product!
            </div>
          ) : (
            <div className="space-y-4">
              {products.filter(product => 
                product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                product.brand?.toLowerCase().includes(searchTerm.toLowerCase())
              ).map((product) => (
                <div key={product.id} className="flex justify-between items-center p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">{product.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {product.brand && product.model ? `${product.brand} ${product.model}` : product.brand || product.model || 'No brand/model'}
                    </p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant={product.active ? 'default' : 'secondary'}>
                        {product.active ? 'Active' : 'Inactive'}
                      </Badge>
                      {product.featured && <Badge variant="outline">Featured</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={async () => {
                        if (confirm('Delete this product?')) {
                          await supabase.from('products_new').delete().eq('id', product.id);
                          fetchData();
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}