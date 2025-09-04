import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
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
import { Plus, Edit, Trash2, Search, Image, Package, Layers, Tags } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';
import type { ProductFormData, ComponentVariant, ComponentType } from '@/types/product-types';

type Category = Tables<'categories'>;

const COMPONENT_TYPES: { value: ComponentType; label: string; description: string }[] = [
  { value: 'color', label: 'Color', description: 'Product colors and finishes' },
  { value: 'size', label: 'Size', description: 'Physical sizes (S, M, L, XL)' },
  { value: 'storage', label: 'Storage', description: 'Storage capacity (64GB, 128GB)' },
  { value: 'memory', label: 'Memory', description: 'RAM memory (4GB, 8GB, 16GB)' },
  { value: 'processor', label: 'Processor', description: 'CPU options' },
  { value: 'material', label: 'Material', description: 'Materials (leather, fabric, metal)' },
  { value: 'style', label: 'Style', description: 'Design styles' },
  { value: 'capacity', label: 'Capacity', description: 'Volume or capacity' },
  { value: 'power', label: 'Power', description: 'Power ratings' },
  { value: 'connectivity', label: 'Connectivity', description: 'Connection types' },
  { value: 'custom', label: 'Custom', description: 'Custom variant type' },
];

export default function ProductsAdvanced() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
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
        component_type: 'color',
        component_value: '',
        active: true,
        is_required: true,
        is_default: false,
        display_order: 0,
        images: [{ url: '', alt_text: '', is_primary: true }]
      }
    ],
    variant_combinations: []
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      // Try new products table first, fallback to old one
      let { data, error } = await supabase
        .from('products_new')
        .select(`
          *,
          categories(name),
          product_images_new:product_images_new(*),
          product_component_variants(
            *,
            component_variants(
              *,
              component_variant_images(*)
            )
          ),
          product_variant_combinations(*)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        // Fallback to old products table
        const { data: oldData, error: oldError } = await supabase
          .from('products')
          .select(`
            *,
            categories(name)
          `)
          .order('created_at', { ascending: false });

        if (oldError) throw oldError;
        data = oldData;
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

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const generateCombinationSKU = (componentSkus: string[]) => {
    return componentSkus.join('-');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Auto-generate slug if empty
      const slug = formData.slug || generateSlug(formData.name);
      
      let productId = editingProduct?.id;

      // Step 1: Create or update the main product
      if (editingProduct) {
        const { error } = await supabase
          .from('products_new')
          .update({
            ...formData,
            slug,
            keywords: formData.keywords?.length ? formData.keywords : null,
            tags: formData.tags?.length ? formData.tags : null
          })
          .eq('id', editingProduct.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('products_new')
          .insert([{
            ...formData,
            slug,
            keywords: formData.keywords?.length ? formData.keywords : null,
            tags: formData.tags?.length ? formData.tags : null
          }])
          .select('id')
          .single();

        if (error) throw error;
        productId = data.id;
      }

      // Step 2: Handle product images
      if (formData.images.some(img => img.url)) {
        // Delete existing images
        await supabase
          .from('product_images_new')
          .delete()
          .eq('product_id', productId);

        // Insert new images
        const imageInserts = formData.images
          .filter(img => img.url)
          .map((img, index) => ({
            product_id: productId,
            url: img.url,
            alt_text: img.alt_text || null,
            sort_order: index,
            is_primary: img.is_primary
          }));

        if (imageInserts.length > 0) {
          const { error: imageError } = await supabase
            .from('product_images_new')
            .insert(imageInserts);

          if (imageError) throw imageError;
        }
      }

      // Step 3: Handle component variants
      for (let i = 0; i < formData.component_variants.length; i++) {
        const variant = formData.component_variants[i];
        
        if (!variant.sku || !variant.name) continue;

        let componentVariantId = variant.id;

        // Create or update component variant
        const componentData = {
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
          active: variant.active
        };

        if (componentVariantId) {
          // Update existing
          const { error } = await supabase
            .from('component_variants')
            .update(componentData)
            .eq('id', componentVariantId);

          if (error) throw error;
        } else {
          // Create new
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
          // Delete existing images
          await supabase
            .from('component_variant_images')
            .delete()
            .eq('component_variant_id', componentVariantId);

          // Insert new images
          const variantImageInserts = variant.images
            .filter(img => img.url)
            .map((img, index) => ({
              component_variant_id: componentVariantId,
              url: img.url,
              alt_text: img.alt_text || null,
              sort_order: index,
              is_primary: img.is_primary
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
          .upsert({
            product_id: productId,
            component_variant_id: componentVariantId,
            is_required: variant.is_required,
            is_default: variant.is_default,
            display_order: variant.display_order
          });

        if (linkError) throw linkError;
      }

      // Step 4: Handle variant combinations
      if (formData.variant_combinations.length > 0) {
        // Delete existing combinations
        await supabase
          .from('product_variant_combinations')
          .delete()
          .eq('product_id', productId);

        // Create new combinations
        for (const combination of formData.variant_combinations) {
          if (combination.component_variant_skus.length === 0) continue;

          // Get component variant IDs from SKUs
          const { data: componentVariants, error: componentError } = await supabase
            .from('component_variants')
            .select('id')
            .in('sku', combination.component_variant_skus);

          if (componentError) throw componentError;

          const componentVariantIds = componentVariants.map(cv => cv.id);
          const combinationSKU = generateCombinationSKU(combination.component_variant_skus);

          const { error: combinationError } = await supabase
            .from('product_variant_combinations')
            .insert({
              product_id: productId,
              combination_name: combination.combination_name || null,
              combination_sku: combinationSKU,
              component_variant_ids: componentVariantIds,
              override_price: combination.override_price || null,
              discount_percentage: combination.discount_percentage,
              override_stock: combination.override_stock || null,
              active: combination.active
            });

          if (combinationError) throw combinationError;
        }
      }

      toast({
        title: "Success",
        description: `Product ${editingProduct ? 'updated' : 'created'} successfully`
      });

      setIsDialogOpen(false);
      resetForm();
      fetchProducts();
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
          component_type: 'color',
          component_value: '',
          active: true,
          is_required: true,
          is_default: false,
          display_order: 0,
          images: [{ url: '', alt_text: '', is_primary: true }]
        }
      ],
      variant_combinations: []
    });
    setEditingProduct(null);
    setActiveTab('basic');
  };

  const addImage = () => {
    setFormData({
      ...formData,
      images: [...formData.images, { url: '', alt_text: '', is_primary: false }]
    });
  };

  const removeImage = (index: number) => {
    const newImages = formData.images.filter((_, i) => i !== index);
    setFormData({ ...formData, images: newImages });
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
          component_type: 'color',
          component_value: '',
          active: true,
          is_required: true,
          is_default: false,
          display_order: formData.component_variants.length,
          images: [{ url: '', alt_text: '', is_primary: true }]
        }
      ]
    });
  };

  const removeComponentVariant = (index: number) => {
    const newVariants = formData.component_variants.filter((_, i) => i !== index);
    setFormData({ ...formData, component_variants: newVariants });
  };

  const addVariantImage = (variantIndex: number) => {
    const newVariants = [...formData.component_variants];
    newVariants[variantIndex].images.push({ url: '', alt_text: '', is_primary: false });
    setFormData({ ...formData, component_variants: newVariants });
  };

  const removeVariantImage = (variantIndex: number, imageIndex: number) => {
    const newVariants = [...formData.component_variants];
    newVariants[variantIndex].images = newVariants[variantIndex].images.filter((_, i) => i !== imageIndex);
    setFormData({ ...formData, component_variants: newVariants });
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
          <h2 className="text-3xl font-bold tracking-tight">Advanced Products</h2>
          <p className="text-muted-foreground">Manage products with component-based variants like Shopee</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </DialogTitle>
              <DialogDescription>
                Create a product with multiple variants and component options
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="images">Images</TabsTrigger>
                  <TabsTrigger value="variants">Components</TabsTrigger>
                  <TabsTrigger value="combinations">Combinations</TabsTrigger>
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
                        placeholder="iPhone 15 Pro"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="slug">URL Slug</Label>
                      <Input
                        id="slug"
                        value={formData.slug}
                        onChange={(e) => setFormData({...formData, slug: e.target.value})}
                        placeholder="iphone-15-pro"
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
                      placeholder="Product description..."
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="brand">Brand</Label>
                      <Input
                        id="brand"
                        value={formData.brand}
                        onChange={(e) => setFormData({...formData, brand: e.target.value})}
                        placeholder="Apple"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="model">Model</Label>
                      <Input
                        id="model"
                        value={formData.model}
                        onChange={(e) => setFormData({...formData, model: e.target.value})}
                        placeholder="iPhone 15 Pro"
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
                <TabsContent value="images" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Product Images</h3>
                    <Button type="button" onClick={addImage} variant="outline" size="sm">
                      <Image className="mr-2 h-4 w-4" />
                      Add Image
                    </Button>
                  </div>

                  {formData.images.map((image, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-2">
                      <div className="flex justify-between items-center">
                        <Label>Image {index + 1}</Label>
                        {formData.images.length > 1 && (
                          <Button
                            type="button"
                            onClick={() => removeImage(index)}
                            variant="destructive"
                            size="sm"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2 space-y-1">
                          <Label>Image URL</Label>
                          <Input
                            value={image.url}
                            onChange={(e) => {
                              const newImages = [...formData.images];
                              newImages[index].url = e.target.value;
                              setFormData({...formData, images: newImages});
                            }}
                            placeholder="https://example.com/image.jpg"
                          />
                        </div>
                        
                        <div className="space-y-1">
                          <Label>Alt Text</Label>
                          <Input
                            value={image.alt_text}
                            onChange={(e) => {
                              const newImages = [...formData.images];
                              newImages[index].alt_text = e.target.value;
                              setFormData({...formData, images: newImages});
                            }}
                            placeholder="Image description"
                          />
                        </div>
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
                    </div>
                  ))}
                </TabsContent>

                {/* Component Variants Tab */}
                <TabsContent value="variants" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Component Variants</h3>
                    <Button type="button" onClick={addComponentVariant} variant="outline" size="sm">
                      <Package className="mr-2 h-4 w-4" />
                      Add Component
                    </Button>
                  </div>

                  {formData.component_variants.map((variant, variantIndex) => (
                    <div key={variantIndex} className="border rounded-lg p-4 space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-semibold">Component {variantIndex + 1}</h4>
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

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>SKU *</Label>
                          <Input
                            value={variant.sku}
                            onChange={(e) => {
                              const newVariants = [...formData.component_variants];
                              newVariants[variantIndex].sku = e.target.value;
                              setFormData({...formData, component_variants: newVariants});
                            }}
                            placeholder="COL-RED"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Name *</Label>
                          <Input
                            value={variant.name}
                            onChange={(e) => {
                              const newVariants = [...formData.component_variants];
                              newVariants[variantIndex].name = e.target.value;
                              setFormData({...formData, component_variants: newVariants});
                            }}
                            placeholder="Red Color"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Component Type</Label>
                          <Select
                            value={variant.component_type}
                            onValueChange={(value) => {
                              const newVariants = [...formData.component_variants];
                              newVariants[variantIndex].component_type = value;
                              setFormData({...formData, component_variants: newVariants});
                            }}
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

                        <div className="space-y-2">
                          <Label>Component Value</Label>
                          <Input
                            value={variant.component_value}
                            onChange={(e) => {
                              const newVariants = [...formData.component_variants];
                              newVariants[variantIndex].component_value = e.target.value;
                              setFormData({...formData, component_variants: newVariants});
                            }}
                            placeholder="red"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Cost Price</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={variant.cost_price}
                            onChange={(e) => {
                              const newVariants = [...formData.component_variants];
                              newVariants[variantIndex].cost_price = parseFloat(e.target.value) || 0;
                              setFormData({...formData, component_variants: newVariants});
                            }}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Selling Price *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={variant.selling_price}
                            onChange={(e) => {
                              const newVariants = [...formData.component_variants];
                              newVariants[variantIndex].selling_price = parseFloat(e.target.value) || 0;
                              setFormData({...formData, component_variants: newVariants});
                            }}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Stock Quantity</Label>
                          <Input
                            type="number"
                            value={variant.stock_quantity}
                            onChange={(e) => {
                              const newVariants = [...formData.component_variants];
                              newVariants[variantIndex].stock_quantity = parseInt(e.target.value) || 0;
                              setFormData({...formData, component_variants: newVariants});
                            }}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                          value={variant.description}
                          onChange={(e) => {
                            const newVariants = [...formData.component_variants];
                            newVariants[variantIndex].description = e.target.value;
                            setFormData({...formData, component_variants: newVariants});
                          }}
                          rows={2}
                          placeholder="Component description..."
                        />
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={variant.active}
                            onCheckedChange={(checked) => {
                              const newVariants = [...formData.component_variants];
                              newVariants[variantIndex].active = checked;
                              setFormData({...formData, component_variants: newVariants});
                            }}
                          />
                          <Label>Active</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={variant.is_required}
                            onCheckedChange={(checked) => {
                              const newVariants = [...formData.component_variants];
                              newVariants[variantIndex].is_required = checked;
                              setFormData({...formData, component_variants: newVariants});
                            }}
                          />
                          <Label>Required</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={variant.is_default}
                            onCheckedChange={(checked) => {
                              const newVariants = [...formData.component_variants];
                              newVariants[variantIndex].is_default = checked;
                              setFormData({...formData, component_variants: newVariants});
                            }}
                          />
                          <Label>Default</Label>
                        </div>
                      </div>

                      {/* Component Variant Images */}
                      <Separator />
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label>Component Images</Label>
                          <Button
                            type="button"
                            onClick={() => addVariantImage(variantIndex)}
                            variant="outline"
                            size="sm"
                          >
                            <Image className="mr-2 h-4 w-4" />
                            Add Image
                          </Button>
                        </div>

                        {variant.images.map((image, imageIndex) => (
                          <div key={imageIndex} className="grid grid-cols-3 gap-2 items-end">
                            <div className="space-y-1">
                              <Label>Image URL</Label>
                              <Input
                                value={image.url}
                                onChange={(e) => {
                                  const newVariants = [...formData.component_variants];
                                  newVariants[variantIndex].images[imageIndex].url = e.target.value;
                                  setFormData({...formData, component_variants: newVariants});
                                }}
                                placeholder="https://example.com/variant.jpg"
                              />
                            </div>
                            
                            <div className="space-y-1">
                              <Label>Alt Text</Label>
                              <Input
                                value={image.alt_text}
                                onChange={(e) => {
                                  const newVariants = [...formData.component_variants];
                                  newVariants[variantIndex].images[imageIndex].alt_text = e.target.value;
                                  setFormData({...formData, component_variants: newVariants});
                                }}
                                placeholder="Variant image"
                              />
                            </div>

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
                              <Label>Primary</Label>
                              
                              {variant.images.length > 1 && (
                                <Button
                                  type="button"
                                  onClick={() => removeVariantImage(variantIndex, imageIndex)}
                                  variant="destructive"
                                  size="sm"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </TabsContent>

                {/* Variant Combinations Tab */}
                <TabsContent value="combinations" className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold">Pre-defined Combinations</h3>
                    <p className="text-sm text-muted-foreground">
                      Create specific combinations of components with optional custom pricing
                    </p>
                  </div>
                  
                  <div className="text-center py-8 text-muted-foreground">
                    <Layers className="mx-auto h-12 w-12 mb-4" />
                    <p>Combinations feature will be available after saving the product</p>
                    <p className="text-sm">You can create combinations by selecting component variants</p>
                  </div>
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
          <CardTitle>Products Catalog</CardTitle>
          <CardDescription>
            Advanced product management with component-based variants
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
                  <TableHead>Category</TableHead>
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
                        : 'No products yet. Create your first advanced product!'
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
                            {product.brand && product.model 
                              ? `${product.brand} ${product.model}` 
                              : (product.brand || product.model)
                            }
                          </div>
                          {product.featured && (
                            <Badge variant="secondary" className="text-xs mt-1">Featured</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {product.categories?.name || 'Uncategorized'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {product.product_component_variants?.length > 0 ? (
                            product.product_component_variants.map((pcv: any) => (
                              <Badge key={pcv.id} variant="outline" className="text-xs">
                                {pcv.component_variants?.component_type}
                              </Badge>
                            ))
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
                              setEditingProduct(product);
                              // TODO: Load product data into form
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