import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/index';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Edit, Trash2, Search, Package, Layers, Tags, Gift, RefreshCw, Library } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ImageUpload from '@/components/ui/image-upload';
import type { Tables } from '@/integrations/supabase/types';

type Category = Tables<'categories'>;

interface ComponentLibraryItem {
  id: string;
  name: string;
  description: string;
  component_type: string;
  component_value: string;
  is_active: boolean;
}

interface ComponentVariantForm {
  id?: string;
  sku: string;
  name: string;
  description?: string;
  cost_price: number;
  selling_price: number;
  stock_quantity: number;
  reorder_level: number;
  component_type: string;
  component_value: string;
  active: boolean;
  is_required: boolean;
  is_default: boolean;
  display_order: number;
  weight_kg?: number;
  dimensions_cm?: string;
  is_bundle: boolean;
  bundle_component_ids: string[];
  bundle_discount_percentage: number;
  bundle_description?: string;
  component_library_id?: string;
  images: Array<{ 
    url: string; 
    alt_text?: string; 
    is_primary: boolean; 
    file_name?: string;
    file_size?: number;
    mime_type?: string;
  }>;
}

interface ProductFormData {
  name: string;
  description?: string;
  category_id?: string;
  brand?: string;
  model?: string;
  slug: string;
  active: boolean;
  featured: boolean;
  weight_kg?: number;
  dimensions_cm?: string;
  year_from?: number;
  year_to?: number;
  keywords?: string[];
  tags?: string[];
  images: Array<{ 
    url: string; 
    alt_text?: string; 
    is_primary: boolean;
    file_name?: string;
    file_size?: number;
    mime_type?: string;
  }>;
  component_variants: ComponentVariantForm[];
}

export default function ProductsEnhancedV2() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [componentLibrary, setComponentLibrary] = useState<ComponentLibraryItem[]>([]);
  const [existingComponents, setExistingComponents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState('basic');
  const [selectedLibraryItems, setSelectedLibraryItems] = useState<string[]>([]);
  const { toast } = useToast();

  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    category_id: '',
    brand: '',
    model: '',
    slug: '',
    active: true,
    featured: false,
    weight_kg: 0,
    dimensions_cm: '',
    year_from: new Date().getFullYear(),
    year_to: new Date().getFullYear() + 10,
    keywords: [],
    tags: [],
    images: [],
    component_variants: []
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [productsRes, categoriesRes, componentLibraryRes, existingComponentsRes] = await Promise.all([
        supabase.from('products_new').select('*').order('created_at', { ascending: false }),
        supabase.from('categories').select('*').order('name'),
        supabase.from('component_library').select('*').eq('is_active', true).order('name'),
        supabase.from('component_variants').select('*').eq('active', true).order('name')
      ]);

      if (productsRes.error) throw productsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;
      if (componentLibraryRes.error) throw componentLibraryRes.error;
      if (existingComponentsRes.error) throw existingComponentsRes.error;

      setProducts(productsRes.data || []);
      setCategories(categoriesRes.data || []);
      setComponentLibrary(componentLibraryRes.data || []);
      setExistingComponents(existingComponentsRes.data || []);
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
      // Fallback to simple slug generation
      return name.toLowerCase()
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .trim();
    }
  };

  const handleNameChange = async (name: string) => {
    setFormData(prev => ({ ...prev, name }));
    
    if (name && !editingProduct) {
      const slug = await generateSlug(name);
      setFormData(prev => ({ ...prev, slug }));
    }
  };

  const addComponentFromLibrary = (libraryItem: ComponentLibraryItem) => {
    const newComponent: ComponentVariantForm = {
      sku: `${libraryItem.component_type.toUpperCase()}-${libraryItem.component_value.toUpperCase()}`,
      name: libraryItem.name,
      description: libraryItem.description,
      cost_price: 0,
      selling_price: 0,
      stock_quantity: 0,
      reorder_level: 5,
      component_type: libraryItem.component_type,
      component_value: libraryItem.component_value,
      active: true,
      is_required: false,
      is_default: false,
      display_order: formData.component_variants.length,
      is_bundle: false,
      bundle_component_ids: [],
      bundle_discount_percentage: 0,
      component_library_id: libraryItem.id,
      images: []
    };

    setFormData(prev => ({
      ...prev,
      component_variants: [...prev.component_variants, newComponent]
    }));

    // Remove from selected items
    setSelectedLibraryItems(prev => prev.filter(id => id !== libraryItem.id));
  };

  const addExistingComponent = (existingComponent: any) => {
    const newComponent: ComponentVariantForm = {
      id: existingComponent.id,
      sku: existingComponent.sku,
      name: existingComponent.name,
      description: existingComponent.description,
      cost_price: existingComponent.cost_price,
      selling_price: existingComponent.selling_price,
      stock_quantity: existingComponent.stock_quantity,
      reorder_level: existingComponent.reorder_level,
      component_type: existingComponent.component_type,
      component_value: existingComponent.component_value,
      active: existingComponent.active,
      is_required: false,
      is_default: false,
      display_order: formData.component_variants.length,
      is_bundle: existingComponent.is_bundle || false,
      bundle_component_ids: existingComponent.bundle_component_ids || [],
      bundle_discount_percentage: existingComponent.bundle_discount_percentage || 0,
      component_library_id: existingComponent.component_library_id,
      images: []
    };

    setFormData(prev => ({
      ...prev,
      component_variants: [...prev.component_variants, newComponent]
    }));
  };

  const createBundleComponent = () => {
    if (formData.component_variants.length < 2) {
      toast({
        title: "Error",
        description: "You need at least 2 components to create a bundle",
        variant: "destructive"
      });
      return;
    }

    const selectedIds = formData.component_variants
      .filter(cv => selectedLibraryItems.includes(cv.id || ''))
      .map(cv => cv.id || '');

    if (selectedIds.length < 2) {
      toast({
        title: "Error", 
        description: "Please select at least 2 components for the bundle",
        variant: "destructive"
      });
      return;
    }

    const bundleComponent: ComponentVariantForm = {
      sku: `BUNDLE-${Date.now()}`,
      name: 'Complete Package',
      description: 'Bundle package with multiple components',
      cost_price: 0,
      selling_price: 0,
      stock_quantity: 0,
      reorder_level: 5,
      component_type: 'bundle',
      component_value: 'complete-package',
      active: true,
      is_required: false,
      is_default: true,
      display_order: 0,
      is_bundle: true,
      bundle_component_ids: selectedIds,
      bundle_discount_percentage: 10,
      bundle_description: 'Save money with our complete package deal!',
      images: []
    };

    setFormData(prev => ({
      ...prev,
      component_variants: [bundleComponent, ...prev.component_variants]
    }));

    setSelectedLibraryItems([]);
  };

  const updateComponentVariant = (index: number, updates: Partial<ComponentVariantForm>) => {
    setFormData(prev => ({
      ...prev,
      component_variants: prev.component_variants.map((cv, i) => 
        i === index ? { ...cv, ...updates } : cv
      )
    }));
  };

  const removeComponentVariant = (index: number) => {
    setFormData(prev => ({
      ...prev,
      component_variants: prev.component_variants.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Create the product first
      const productData = {
        name: formData.name,
        description: formData.description,
        category_id: formData.category_id || null,
        brand: formData.brand,
        model: formData.model,
        slug: formData.slug,
        active: formData.active,
        featured: formData.featured,
        weight_kg: formData.weight_kg,
        dimensions_cm: formData.dimensions_cm,
        year_from: formData.year_from,
        year_to: formData.year_to,
        keywords: formData.keywords,
        tags: formData.tags
      };

      let productId: string;

      if (editingProduct) {
        const { error } = await supabase
          .from('products_new')
          .update(productData)
          .eq('id', editingProduct.id);
        
        if (error) throw error;
        productId = editingProduct.id;
      } else {
        const { data, error } = await supabase
          .from('products_new')
          .insert([productData])
          .select()
          .single();
        
        if (error) throw error;
        productId = data.id;
      }

      // Handle product images
      if (formData.images.length > 0) {
        // Delete existing images if editing
        if (editingProduct) {
          await supabase
            .from('product_images_new')
            .delete()
            .eq('product_id', productId);
        }

        // Insert new images
        const imageInserts = formData.images.map((image, index) => ({
          product_id: productId,
          url: image.url,
          alt_text: image.alt_text,
          is_primary: image.is_primary,
          sort_order: index,
          file_name: image.file_name,
          file_size: image.file_size,
          mime_type: image.mime_type
        }));

        const { error: imageError } = await supabase
          .from('product_images_new')
          .insert(imageInserts);
        
        if (imageError) throw imageError;
      }

      // Handle component variants
      for (const cv of formData.component_variants) {
        let componentId: string;

        if (cv.id && existingComponents.find(ec => ec.id === cv.id)) {
          // Update existing component
          const { error } = await supabase
            .from('component_variants')
            .update({
              name: cv.name,
              description: cv.description,
              cost_price: cv.cost_price,
              selling_price: cv.selling_price,
              stock_quantity: cv.stock_quantity,
              reorder_level: cv.reorder_level,
              component_type: cv.component_type,
              component_value: cv.component_value,
              active: cv.active,
              weight_kg: cv.weight_kg,
              dimensions_cm: cv.dimensions_cm,
              is_bundle: cv.is_bundle,
              bundle_component_ids: cv.bundle_component_ids,
              bundle_discount_percentage: cv.bundle_discount_percentage,
              bundle_description: cv.bundle_description,
              component_library_id: cv.component_library_id
            })
            .eq('id', cv.id);
          
          if (error) throw error;
          componentId = cv.id;
        } else {
          // Create new component
          const { data, error } = await supabase
            .from('component_variants')
            .insert([{
              sku: cv.sku,
              name: cv.name,
              description: cv.description,
              cost_price: cv.cost_price,
              selling_price: cv.selling_price,
              stock_quantity: cv.stock_quantity,
              reorder_level: cv.reorder_level,
              component_type: cv.component_type,
              component_value: cv.component_value,
              active: cv.active,
              weight_kg: cv.weight_kg,
              dimensions_cm: cv.dimensions_cm,
              is_bundle: cv.is_bundle,
              bundle_component_ids: cv.bundle_component_ids,
              bundle_discount_percentage: cv.bundle_discount_percentage,
              bundle_description: cv.bundle_description,
              component_library_id: cv.component_library_id
            }])
            .select()
            .single();
          
          if (error) throw error;
          componentId = data.id;
        }

        // Link component to product
        await supabase
          .from('product_component_variants')
          .upsert({
            product_id: productId,
            component_variant_id: componentId,
            is_required: cv.is_required,
            is_default: cv.is_default,
            display_order: cv.display_order
          });

        // Handle component images
        if (cv.images.length > 0) {
          // Delete existing images
          await supabase
            .from('component_variant_images')
            .delete()
            .eq('component_variant_id', componentId);

          // Insert new images
          const componentImageInserts = cv.images.map(image => ({
            component_variant_id: componentId,
            url: image.url,
            alt_text: image.alt_text,
            is_primary: image.is_primary,
            file_name: image.file_name,
            file_size: image.file_size,
            mime_type: image.mime_type
          }));

          await supabase
            .from('component_variant_images')
            .insert(componentImageInserts);
        }
      }

      toast({
        title: "Success",
        description: `Product ${editingProduct ? 'updated' : 'created'} successfully!`
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
      category_id: '',
      brand: '',
      model: '',
      slug: '',
      active: true,
      featured: false,
      weight_kg: 0,
      dimensions_cm: '',
      year_from: new Date().getFullYear(),
      year_to: new Date().getFullYear() + 10,
      keywords: [],
      tags: [],
      images: [],
      component_variants: []
    });
    setEditingProduct(null);
    setActiveTab('basic');
    setSelectedLibraryItems([]);
  };

  const filteredProducts = products.filter(product =>
    product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.model?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Enhanced Products</h1>
          <p className="text-muted-foreground">Manage products with component variants and bundles</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProduct ? 'Edit Product' : 'Create New Product'}</DialogTitle>
                <DialogDescription>
                  {editingProduct ? 'Update the product details below.' : 'Create a new product with component variants and bundle options.'}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit}>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="basic">Product Info</TabsTrigger>
                    <TabsTrigger value="images">Product Images</TabsTrigger>
                    <TabsTrigger value="components">Components</TabsTrigger>
                    <TabsTrigger value="library">Component Library</TabsTrigger>
                  </TabsList>

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
                        <div className="flex gap-2">
                          <Input
                            id="slug"
                            value={formData.slug}
                            onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                            placeholder="auto-generated-slug"
                          />
                          <Button 
                            type="button"
                            variant="outline"
                            onClick={() => handleNameChange(formData.name)}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </div>
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

                      <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Select 
                          value={formData.category_id} 
                          onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Year Range</Label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            value={formData.year_from}
                            onChange={(e) => setFormData(prev => ({ ...prev, year_from: parseInt(e.target.value) || 0 }))}
                            placeholder="From year"
                          />
                          <Input
                            type="number"
                            value={formData.year_to}
                            onChange={(e) => setFormData(prev => ({ ...prev, year_to: parseInt(e.target.value) || 0 }))}
                            placeholder="To year"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Detailed product description..."
                        rows={4}
                      />
                    </div>

                    <div className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="active"
                          checked={formData.active}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
                        />
                        <Label htmlFor="active">Active</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="featured"
                          checked={formData.featured}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, featured: checked }))}
                        />
                        <Label htmlFor="featured">Featured</Label>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="images" className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium mb-4">Product Images</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[...Array(4)].map((_, index) => (
                          <div key={index} className="space-y-2">
                            <Label>Image {index + 1} {index === 0 && '(Primary)'}</Label>
                            <ImageUpload
                              value={formData.images[index]?.url || ''}
                              onChange={(url, metadata) => {
                                const newImages = [...formData.images];
                                newImages[index] = {
                                  url,
                                  alt_text: `${formData.name} - Image ${index + 1}`,
                                  is_primary: index === 0,
                                  file_name: metadata?.fileName,
                                  file_size: metadata?.fileSize,
                                  mime_type: metadata?.mimeType
                                };
                                setFormData(prev => ({ ...prev, images: newImages }));
                              }}
                              placeholder={`Upload product image ${index + 1}`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="components" className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium">Component Variants</h3>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={createBundleComponent}
                          disabled={selectedLibraryItems.length < 2}
                        >
                          <Gift className="mr-2 h-4 w-4" />
                          Create Bundle
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {formData.component_variants.map((cv, index) => (
                        <Card key={index} className={cv.is_bundle ? 'border-orange-200 bg-orange-50' : ''}>
                          <CardHeader>
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={selectedLibraryItems.includes(cv.id || '')}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedLibraryItems(prev => [...prev, cv.id || '']);
                                    } else {
                                      setSelectedLibraryItems(prev => prev.filter(id => id !== cv.id));
                                    }
                                  }}
                                />
                                {cv.is_bundle && <Gift className="h-4 w-4 text-orange-600" />}
                                <div>
                                  <CardTitle className="text-base">{cv.name}</CardTitle>
                                  <CardDescription>SKU: {cv.sku}</CardDescription>
                                </div>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => removeComponentVariant(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="space-y-2">
                                <Label>Name</Label>
                                <Input
                                  value={cv.name}
                                  onChange={(e) => updateComponentVariant(index, { name: e.target.value })}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>SKU</Label>
                                <Input
                                  value={cv.sku}
                                  onChange={(e) => updateComponentVariant(index, { sku: e.target.value })}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Selling Price ($)</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={cv.selling_price}
                                  onChange={(e) => updateComponentVariant(index, { selling_price: parseFloat(e.target.value) || 0 })}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Stock Quantity</Label>
                                <Input
                                  type="number"
                                  value={cv.stock_quantity}
                                  onChange={(e) => updateComponentVariant(index, { stock_quantity: parseInt(e.target.value) || 0 })}
                                />
                              </div>
                            </div>

                            {cv.is_bundle && (
                              <div className="mt-4 p-3 border border-orange-200 rounded-lg bg-orange-25">
                                <h4 className="font-medium text-orange-800 mb-2">Bundle Settings</h4>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label>Discount Percentage (%)</Label>
                                    <Input
                                      type="number"
                                      step="0.1"
                                      max="100"
                                      value={cv.bundle_discount_percentage}
                                      onChange={(e) => updateComponentVariant(index, { bundle_discount_percentage: parseFloat(e.target.value) || 0 })}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Bundle Description</Label>
                                    <Input
                                      value={cv.bundle_description}
                                      onChange={(e) => updateComponentVariant(index, { bundle_description: e.target.value })}
                                      placeholder="Bundle description..."
                                    />
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="mt-4">
                              <Label>Component Images</Label>
                              <div className="grid grid-cols-2 gap-4 mt-2">
                                {[...Array(2)].map((_, imgIndex) => (
                                  <ImageUpload
                                    key={imgIndex}
                                    value={cv.images[imgIndex]?.url || ''}
                                    onChange={(url, metadata) => {
                                      const newImages = [...cv.images];
                                      newImages[imgIndex] = {
                                        url,
                                        alt_text: `${cv.name} - Image ${imgIndex + 1}`,
                                        is_primary: imgIndex === 0,
                                        file_name: metadata?.fileName,
                                        file_size: metadata?.fileSize,
                                        mime_type: metadata?.mimeType
                                      };
                                      updateComponentVariant(index, { images: newImages });
                                    }}
                                    placeholder={`Component image ${imgIndex + 1}`}
                                  />
                                ))}
                              </div>
                            </div>

                            <div className="mt-4 flex gap-4">
                              <div className="flex items-center space-x-2">
                                <Switch
                                  checked={cv.is_required}
                                  onCheckedChange={(checked) => updateComponentVariant(index, { is_required: checked })}
                                />
                                <Label>Required</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Switch
                                  checked={cv.is_default}
                                  onCheckedChange={(checked) => updateComponentVariant(index, { is_default: checked })}
                                />
                                <Label>Default</Label>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {formData.component_variants.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No components added yet. Use the Component Library tab to add components.
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="library" className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium mb-4">Component Library</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Add components from your library or existing components
                      </p>

                      <Tabs defaultValue="library">
                        <TabsList>
                          <TabsTrigger value="library">
                            <Library className="mr-2 h-4 w-4" />
                            From Library
                          </TabsTrigger>
                          <TabsTrigger value="existing">
                            <Package className="mr-2 h-4 w-4" />
                            Existing Components
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="library" className="mt-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {componentLibrary.map((item) => (
                              <Card key={item.id} className="cursor-pointer hover:bg-gray-50" onClick={() => addComponentFromLibrary(item)}>
                                <CardContent className="p-4">
                                  <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-medium">{item.name}</h4>
                                    <Badge variant="secondary">{item.component_type}</Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                                  <Badge variant="outline">{item.component_value}</Badge>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                          {componentLibrary.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                              No components in library. Create some in the Component Library section.
                            </div>
                          )}
                        </TabsContent>

                        <TabsContent value="existing" className="mt-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {existingComponents.map((component) => (
                              <Card key={component.id} className="cursor-pointer hover:bg-gray-50" onClick={() => addExistingComponent(component)}>
                                <CardContent className="p-4">
                                  <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-medium">{component.name}</h4>
                                    <Badge variant="secondary">{component.component_type}</Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground mb-2">{component.description}</p>
                                  <div className="flex gap-2">
                                    <Badge variant="outline">SKU: {component.sku}</Badge>
                                    <Badge variant="outline">${component.selling_price}</Badge>
                                    <Badge variant="outline">Stock: {component.stock_quantity}</Badge>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                          {existingComponents.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                              No existing components found.
                            </div>
                          )}
                        </TabsContent>
                      </Tabs>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="flex gap-4 pt-6 border-t">
                  <Button type="submit" className="flex-1">
                    {editingProduct ? 'Update Product' : 'Create Product'}
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

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Products</CardTitle>
            <div className="flex gap-2">
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
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading products...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Brand/Model</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-muted-foreground">/{product.slug}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {product.brand && product.model ? `${product.brand} ${product.model}` : product.brand || product.model || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Badge variant={product.active ? 'default' : 'secondary'}>
                          {product.active ? 'Active' : 'Inactive'}
                        </Badge>
                        {product.featured && <Badge variant="outline">Featured</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(product.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingProduct(product);
                            // Load product data for editing
                            setFormData({
                              name: product.name,
                              description: product.description || '',
                              category_id: product.category_id || '',
                              brand: product.brand || '',
                              model: product.model || '',
                              slug: product.slug,
                              active: product.active,
                              featured: product.featured,
                              weight_kg: product.weight_kg || 0,
                              dimensions_cm: product.dimensions_cm || '',
                              year_from: product.year_from || new Date().getFullYear(),
                              year_to: product.year_to || new Date().getFullYear() + 10,
                              keywords: product.keywords || [],
                              tags: product.tags || [],
                              images: [],
                              component_variants: []
                            });
                            setIsDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            if (confirm('Are you sure you want to delete this product?')) {
                              try {
                                const { error } = await supabase
                                  .from('products_new')
                                  .delete()
                                  .eq('id', product.id);
                                
                                if (error) throw error;
                                
                                toast({
                                  title: "Success",
                                  description: "Product deleted successfully"
                                });
                                
                                fetchData();
                              } catch (error: any) {
                                toast({
                                  title: "Error",
                                  description: "Failed to delete product",
                                  variant: "destructive"
                                });
                              }
                            }
                          }}
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
          
          {!loading && filteredProducts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No products found matching your search.' : 'No products created yet.'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}