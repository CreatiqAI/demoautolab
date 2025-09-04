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
import { Plus, Edit, Trash2, Search, Package, Layers, Tags, Gift } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ImageUpload from '@/components/ui/image-upload';
import type { Tables } from '@/integrations/supabase/types';

type Category = Tables<'categories'>;

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

const COMPONENT_TYPES = [
  { value: 'component', label: 'Individual Component', description: 'Single component or part' },
  { value: 'bundle', label: 'Bundle Package', description: 'Combination of multiple components' },
  { value: 'accessory', label: 'Accessory', description: 'Additional accessory item' },
  { value: 'upgrade', label: 'Upgrade Option', description: 'Enhanced version or upgrade' },
  { value: 'service', label: 'Service', description: 'Installation or service option' },
];

export default function ProductsEnhanced() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [availableComponents, setAvailableComponents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState('basic');
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
    year_from: undefined,
    year_to: undefined,
    keywords: [],
    tags: [],
    images: [{ url: '', alt_text: '', is_primary: true }],
    component_variants: [
      {
        sku: '',
        name: '',
        description: '',
        cost_price: 0,
        selling_price: 0,
        stock_quantity: 0,
        reorder_level: 0,
        component_type: 'component',
        component_value: '',
        active: true,
        is_required: true,
        is_default: false,
        display_order: 0,
        is_bundle: false,
        bundle_component_ids: [],
        bundle_discount_percentage: 0,
        bundle_description: '',
        images: [{ url: '', alt_text: '', is_primary: true }]
      }
    ]
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchAvailableComponents();
  }, []);

  const fetchProducts = async () => {
    try {
      // Use the enhanced view if available, fallback to basic query
      let { data, error } = await supabase
        .from('product_catalog_view')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // Fallback to basic query
        const { data: basicData, error: basicError } = await supabase
          .from('products_new')
          .select(`
            *,
            categories(name),
            product_images_new(*),
            product_component_variants(
              *,
              component_variants(*)
            )
          `)
          .order('created_at', { ascending: false });

        if (basicError) throw basicError;
        data = basicData;
      }

      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error",
        description: "Failed to fetch products",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchAvailableComponents = async () => {
    try {
      const { data, error } = await supabase
        .from('component_variants')
        .select('*')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setAvailableComponents(data || []);
    } catch (error) {
      console.error('Error fetching components:', error);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const slug = formData.slug || generateSlug(formData.name);
      let productId = editingProduct?.id;

      // Step 1: Create or update the main product
      const productData = {
        name: formData.name,
        description: formData.description || null,
        category_id: formData.category_id || null,
        brand: formData.brand || null,
        model: formData.model || null,
        slug,
        active: formData.active,
        featured: formData.featured,
        weight_kg: formData.weight_kg || null,
        dimensions_cm: formData.dimensions_cm || null,
        year_from: formData.year_from || null,
        year_to: formData.year_to || null,
        keywords: formData.keywords?.length ? formData.keywords : null,
        tags: formData.tags?.length ? formData.tags : null
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('products_new')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('products_new')
          .insert([productData])
          .select('id')
          .single();

        if (error) throw error;
        productId = data.id;
      }

      // Step 2: Handle product images
      if (formData.images.some(img => img.url)) {
        await supabase
          .from('product_images_new')
          .delete()
          .eq('product_id', productId);

        const imageInserts = formData.images
          .filter(img => img.url)
          .map((img, index) => ({
            product_id: productId,
            url: img.url,
            alt_text: img.alt_text || null,
            sort_order: index,
            is_primary: img.is_primary,
            file_name: img.file_name || null,
            file_size: img.file_size || null,
            mime_type: img.mime_type || null
          }));

        if (imageInserts.length > 0) {
          const { error: imageError } = await supabase
            .from('product_images_new')
            .insert(imageInserts);

          if (imageError) throw imageError;
        }
      }

      // Step 3: Handle component variants
      // First, remove old product-component relationships
      await supabase
        .from('product_component_variants')
        .delete()
        .eq('product_id', productId);

      for (const variant of formData.component_variants) {
        if (!variant.sku || !variant.name) continue;

        let componentVariantId = variant.id;

        // Prepare component data
        const componentData: any = {
          sku: variant.sku,
          name: variant.name,
          description: variant.description || null,
          cost_price: variant.cost_price,
          selling_price: variant.selling_price,
          stock_quantity: variant.stock_quantity,
          reorder_level: variant.reorder_level,
          component_type: variant.component_type,
          component_value: variant.component_value,
          weight_kg: variant.weight_kg || null,
          dimensions_cm: variant.dimensions_cm || null,
          active: variant.active,
          is_bundle: variant.is_bundle,
          bundle_component_ids: variant.is_bundle && variant.bundle_component_ids.length > 0 
            ? variant.bundle_component_ids 
            : null,
          bundle_discount_percentage: variant.is_bundle ? variant.bundle_discount_percentage : 0,
          bundle_description: variant.is_bundle ? variant.bundle_description || null : null
        };

        // Create or update component variant
        if (componentVariantId) {
          const { error } = await supabase
            .from('component_variants')
            .update(componentData)
            .eq('id', componentVariantId);

          if (error) throw error;
        } else {
          const { data, error } = await supabase
            .from('component_variants')
            .insert([componentData])
            .select('id')
            .single();

          if (error) throw error;
          componentVariantId = data.id;
        }

        // Handle component variant images
        if (variant.images.some(img => img.url)) {
          await supabase
            .from('component_variant_images')
            .delete()
            .eq('component_variant_id', componentVariantId);

          const variantImageInserts = variant.images
            .filter(img => img.url)
            .map((img, index) => ({
              component_variant_id: componentVariantId,
              url: img.url,
              alt_text: img.alt_text || null,
              sort_order: index,
              is_primary: img.is_primary,
              file_name: img.file_name || null,
              file_size: img.file_size || null,
              mime_type: img.mime_type || null
            }));

          if (variantImageInserts.length > 0) {
            const { error: variantImageError } = await supabase
              .from('component_variant_images')
              .insert(variantImageInserts);

            if (variantImageError) throw variantImageError;
          }
        }

        // Link component variant to product
        const { error: linkError } = await supabase
          .from('product_component_variants')
          .insert({
            product_id: productId,
            component_variant_id: componentVariantId,
            is_required: variant.is_required,
            is_default: variant.is_default,
            display_order: variant.display_order
          });

        if (linkError) throw linkError;
      }

      toast({
        title: "Success",
        description: `Product ${editingProduct ? 'updated' : 'created'} successfully`
      });

      setIsDialogOpen(false);
      resetForm();
      fetchProducts();
      fetchAvailableComponents();
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save product",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
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
      year_from: undefined,
      year_to: undefined,
      keywords: [],
      tags: [],
      images: [{ url: '', alt_text: '', is_primary: true }],
      component_variants: [
        {
          sku: '',
          name: '',
          description: '',
          cost_price: 0,
          selling_price: 0,
          stock_quantity: 0,
          reorder_level: 0,
          component_type: 'component',
          component_value: '',
          active: true,
          is_required: true,
          is_default: false,
          display_order: 0,
          is_bundle: false,
          bundle_component_ids: [],
          bundle_discount_percentage: 0,
          bundle_description: '',
          images: [{ url: '', alt_text: '', is_primary: true }]
        }
      ]
    });
    setEditingProduct(null);
    setActiveTab('basic');
  };

  const addImage = (isProductImage = true, variantIndex?: number) => {
    if (isProductImage) {
      setFormData({
        ...formData,
        images: [...formData.images, { url: '', alt_text: '', is_primary: false }]
      });
    } else if (variantIndex !== undefined) {
      const newVariants = [...formData.component_variants];
      newVariants[variantIndex].images.push({ url: '', alt_text: '', is_primary: false });
      setFormData({ ...formData, component_variants: newVariants });
    }
  };

  const removeImage = (index: number, isProductImage = true, variantIndex?: number) => {
    if (isProductImage) {
      const newImages = formData.images.filter((_, i) => i !== index);
      setFormData({ ...formData, images: newImages });
    } else if (variantIndex !== undefined) {
      const newVariants = [...formData.component_variants];
      newVariants[variantIndex].images = newVariants[variantIndex].images.filter((_, i) => i !== index);
      setFormData({ ...formData, component_variants: newVariants });
    }
  };

  const addComponentVariant = () => {
    setFormData({
      ...formData,
      component_variants: [
        ...formData.component_variants,
        {
          sku: '',
          name: '',
          description: '',
          cost_price: 0,
          selling_price: 0,
          stock_quantity: 0,
          reorder_level: 0,
          component_type: 'component',
          component_value: '',
          active: true,
          is_required: false,
          is_default: false,
          display_order: formData.component_variants.length,
          is_bundle: false,
          bundle_component_ids: [],
          bundle_discount_percentage: 0,
          bundle_description: '',
          images: [{ url: '', alt_text: '', is_primary: true }]
        }
      ]
    });
  };

  const removeComponentVariant = (index: number) => {
    const newVariants = formData.component_variants.filter((_, i) => i !== index);
    setFormData({ ...formData, component_variants: newVariants });
  };

  const updateComponentVariant = (index: number, field: string, value: any) => {
    const newVariants = [...formData.component_variants];
    (newVariants[index] as any)[field] = value;
    setFormData({ ...formData, component_variants: newVariants });
  };

  const updateComponentImage = (variantIndex: number, imageIndex: number, field: string, value: any, metadata?: any) => {
    const newVariants = [...formData.component_variants];
    (newVariants[variantIndex].images[imageIndex] as any)[field] = value;
    
    if (metadata) {
      newVariants[variantIndex].images[imageIndex] = {
        ...newVariants[variantIndex].images[imageIndex],
        ...metadata
      };
    }
    
    setFormData({ ...formData, component_variants: newVariants });
  };

  const updateProductImage = (index: number, field: string, value: any, metadata?: any) => {
    const newImages = [...formData.images];
    (newImages[index] as any)[field] = value;
    
    if (metadata) {
      newImages[index] = { ...newImages[index], ...metadata };
    }
    
    setFormData({ ...formData, images: newImages });
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
          <h2 className="text-3xl font-bold tracking-tight">Enhanced Products</h2>
          <p className="text-muted-foreground">Create products like "Audi A4 Casing" with component options and bundles</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Create Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? 'Edit Product' : 'Create New Product'}
              </DialogTitle>
              <DialogDescription>
                Build products with individual components and bundle packages
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">Product Info</TabsTrigger>
                  <TabsTrigger value="images">Images</TabsTrigger>
                  <TabsTrigger value="variants">Components & Bundles</TabsTrigger>
                </TabsList>

                {/* Basic Information Tab */}
                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Product Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="Audi A4 9/10 Inch Casing"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="slug">URL Slug</Label>
                      <Input
                        id="slug"
                        value={formData.slug}
                        onChange={(e) => setFormData({...formData, slug: e.target.value})}
                        placeholder="audi-a4-9-10-inch-casing"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      rows={3}
                      placeholder="High-quality casing and socket system for Audi A4 vehicles..."
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="brand">Brand</Label>
                      <Input
                        id="brand"
                        value={formData.brand}
                        onChange={(e) => setFormData({...formData, brand: e.target.value})}
                        placeholder="Audi"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="model">Model</Label>
                      <Input
                        id="model"
                        value={formData.model}
                        onChange={(e) => setFormData({...formData, model: e.target.value})}
                        placeholder="A4"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category_id">Category</Label>
                      <Select
                        value={formData.category_id}
                        onValueChange={(value) => setFormData({...formData, category_id: value})}
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
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="active"
                        checked={formData.active}
                        onCheckedChange={(checked) => setFormData({...formData, active: checked})}
                      />
                      <Label htmlFor="active">Active</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="featured"
                        checked={formData.featured}
                        onCheckedChange={(checked) => setFormData({...formData, featured: checked})}
                      />
                      <Label htmlFor="featured">Featured</Label>
                    </div>
                  </div>
                </TabsContent>

                {/* Images Tab */}
                <TabsContent value="images" className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Product Images</h3>
                    <Button type="button" onClick={() => addImage(true)} variant="outline" size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Image
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {formData.images.map((image, index) => (
                      <Card key={index}>
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-base">Image {index + 1}</CardTitle>
                            {formData.images.length > 1 && (
                              <Button
                                type="button"
                                onClick={() => removeImage(index, true)}
                                variant="destructive"
                                size="sm"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <ImageUpload
                            value={image.url}
                            onChange={(url, metadata) => updateProductImage(index, 'url', url, metadata)}
                            placeholder="Upload product image"
                            path="products"
                          />
                          
                          <div className="space-y-2">
                            <Label>Alt Text</Label>
                            <Input
                              value={image.alt_text || ''}
                              onChange={(e) => updateProductImage(index, 'alt_text', e.target.value)}
                              placeholder="Describe the image"
                            />
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={image.is_primary}
                              onCheckedChange={(checked) => {
                                const newImages = formData.images.map((img, i) => ({
                                  ...img,
                                  is_primary: i === index ? checked : false
                                }));
                                setFormData({...formData, images: newImages});
                              }}
                            />
                            <Label>Primary Image</Label>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                {/* Component Variants Tab */}
                <TabsContent value="variants" className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-semibold">Components & Bundles</h3>
                      <p className="text-sm text-muted-foreground">
                        Create individual components (Casing Only, Socket Only) and bundle packages (Complete Package)
                      </p>
                    </div>
                    <Button type="button" onClick={addComponentVariant} variant="outline" size="sm">
                      <Package className="mr-2 h-4 w-4" />
                      Add Component
                    </Button>
                  </div>

                  {formData.component_variants.map((variant, variantIndex) => (
                    <Card key={variantIndex}>
                      <CardHeader>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base">
                              Component {variantIndex + 1}
                              {variant.is_bundle && <Gift className="h-4 w-4 text-purple-500" />}
                            </CardTitle>
                            {variant.is_bundle && <Badge variant="secondary">Bundle</Badge>}
                          </div>
                          {formData.component_variants.length > 1 && (
                            <Button
                              type="button"
                              onClick={() => removeComponentVariant(variantIndex)}
                              variant="destructive"
                              size="sm"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>SKU *</Label>
                            <Input
                              value={variant.sku}
                              onChange={(e) => updateComponentVariant(variantIndex, 'sku', e.target.value)}
                              placeholder="AUDI-A4-CASING-ONLY"
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Name *</Label>
                            <Input
                              value={variant.name}
                              onChange={(e) => updateComponentVariant(variantIndex, 'name', e.target.value)}
                              placeholder="Casing Only"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Textarea
                            value={variant.description}
                            onChange={(e) => updateComponentVariant(variantIndex, 'description', e.target.value)}
                            rows={2}
                            placeholder="Premium casing for Audi A4..."
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Component Type</Label>
                          <Select
                            value={variant.component_type}
                            onValueChange={(value) => updateComponentVariant(variantIndex, 'component_type', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {COMPONENT_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label} - {type.description}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Cost Price</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={variant.cost_price}
                              onChange={(e) => updateComponentVariant(variantIndex, 'cost_price', parseFloat(e.target.value) || 0)}
                              placeholder="150.00"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Selling Price *</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={variant.selling_price}
                              onChange={(e) => updateComponentVariant(variantIndex, 'selling_price', parseFloat(e.target.value) || 0)}
                              placeholder="299.99"
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Stock Quantity</Label>
                            <Input
                              type="number"
                              value={variant.stock_quantity}
                              onChange={(e) => updateComponentVariant(variantIndex, 'stock_quantity', parseInt(e.target.value) || 0)}
                              placeholder="50"
                            />
                          </div>
                        </div>

                        {/* Bundle Options */}
                        <Separator />
                        <div className="space-y-4">
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={variant.is_bundle}
                              onCheckedChange={(checked) => updateComponentVariant(variantIndex, 'is_bundle', checked)}
                            />
                            <Label>This is a bundle package</Label>
                          </div>

                          {variant.is_bundle && (
                            <div className="space-y-4 p-4 border rounded-lg bg-purple-50">
                              <h4 className="font-semibold text-purple-800">Bundle Configuration</h4>
                              
                              <div className="space-y-2">
                                <Label>Bundle Description</Label>
                                <Textarea
                                  value={variant.bundle_description}
                                  onChange={(e) => updateComponentVariant(variantIndex, 'bundle_description', e.target.value)}
                                  placeholder="Save money with our complete package deal! Includes everything you need..."
                                  rows={2}
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>Bundle Discount %</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    value={variant.bundle_discount_percentage}
                                    onChange={(e) => updateComponentVariant(variantIndex, 'bundle_discount_percentage', parseFloat(e.target.value) || 0)}
                                    placeholder="10"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label>Components in Bundle</Label>
                                  <div className="text-sm text-muted-foreground">
                                    Select individual components to include in this bundle from other products
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label>Available Components</Label>
                                <div className="max-h-32 overflow-y-auto space-y-2 border rounded p-2">
                                  {availableComponents
                                    .filter(comp => !comp.is_bundle && comp.id !== variant.id)
                                    .map((comp) => (
                                      <div key={comp.id} className="flex items-center space-x-2">
                                        <Checkbox
                                          checked={variant.bundle_component_ids.includes(comp.id)}
                                          onCheckedChange={(checked) => {
                                            const currentIds = variant.bundle_component_ids;
                                            const newIds = checked 
                                              ? [...currentIds, comp.id]
                                              : currentIds.filter(id => id !== comp.id);
                                            updateComponentVariant(variantIndex, 'bundle_component_ids', newIds);
                                          }}
                                        />
                                        <Label className="text-sm">
                                          {comp.name} ({comp.sku}) - ${comp.selling_price}
                                        </Label>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Component Images */}
                        <Separator />
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <Label>Component Images</Label>
                            <Button
                              type="button"
                              onClick={() => addImage(false, variantIndex)}
                              variant="outline"
                              size="sm"
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Add Image
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {variant.images.map((image, imageIndex) => (
                              <div key={imageIndex} className="border rounded-lg p-3 space-y-3">
                                <div className="flex justify-between items-center">
                                  <Label className="text-sm">Image {imageIndex + 1}</Label>
                                  {variant.images.length > 1 && (
                                    <Button
                                      type="button"
                                      onClick={() => removeImage(imageIndex, false, variantIndex)}
                                      variant="destructive"
                                      size="sm"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>

                                <ImageUpload
                                  value={image.url}
                                  onChange={(url, metadata) => updateComponentImage(variantIndex, imageIndex, 'url', url, metadata)}
                                  placeholder="Upload component image"
                                  path={`components/${variant.sku || 'component'}`}
                                  className="w-full"
                                />

                                <Input
                                  value={image.alt_text || ''}
                                  onChange={(e) => updateComponentImage(variantIndex, imageIndex, 'alt_text', e.target.value)}
                                  placeholder="Image description"
                                  className="text-sm"
                                />

                                <div className="flex items-center space-x-2">
                                  <Switch
                                    checked={image.is_primary}
                                    onCheckedChange={(checked) => {
                                      const newVariants = [...formData.component_variants];
                                      newVariants[variantIndex].images = newVariants[variantIndex].images.map((img, i) => ({
                                        ...img,
                                        is_primary: i === imageIndex ? checked : false
                                      }));
                                      setFormData({...formData, component_variants: newVariants});
                                    }}
                                  />
                                  <Label className="text-sm">Primary</Label>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center space-x-4 pt-2">
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={variant.active}
                              onCheckedChange={(checked) => updateComponentVariant(variantIndex, 'active', checked)}
                            />
                            <Label>Active</Label>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={variant.is_default}
                              onCheckedChange={(checked) => updateComponentVariant(variantIndex, 'is_default', checked)}
                            />
                            <Label>Default Option</Label>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>
              </Tabs>

              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : (editingProduct ? 'Update Product' : 'Create Product')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Enhanced Products Catalog</CardTitle>
          <CardDescription>
            Products with component-based variants and bundle packages
          </CardDescription>
          
          <div className="flex items-center space-x-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {loading && products.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Brand/Model</TableHead>
                  <TableHead>Components</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      {searchTerm 
                        ? 'No products found matching your search.' 
                        : 'No products yet. Create your first enhanced product!'
                      }
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{product.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {product.category_name || product.categories?.name || 'Uncategorized'}
                          </div>
                          {product.featured && (
                            <Badge variant="secondary" className="text-xs mt-1">Featured</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{product.brand || '-'}</div>
                          <div className="text-muted-foreground">{product.model || '-'}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {product.component_variants ? (
                            Array.isArray(product.component_variants) ? (
                              product.component_variants.map((cv: any, idx: number) => (
                                <Badge key={idx} variant={cv.is_bundle ? "default" : "outline"} className="text-xs">
                                  {cv.name}
                                  {cv.is_bundle && <Gift className="h-3 w-3 ml-1" />}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-sm text-muted-foreground">Processing...</span>
                            )
                          ) : (
                            <span className="text-sm text-muted-foreground">No components</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={product.active ? 'default' : 'secondary'}>
                          {product.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              // TODO: Load product data for editing
                              setEditingProduct(product);
                              setIsDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this product?')) {
                                // TODO: Delete product
                              }
                            }}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}