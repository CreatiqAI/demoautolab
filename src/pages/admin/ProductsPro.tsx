import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
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
import { Plus, RefreshCw, Search, Trash2, Edit, DollarSign, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ImageUpload from '@/components/ui/image-upload';

interface ComponentSearchResult {
  id: string;
  component_sku: string;
  name: string;
  description: string;
  component_type: string;
  stock_level: number;
  normal_price: number;
  merchant_price: number;
  default_image_url?: string;
  relevance_score?: number;
}

interface SelectedComponent extends ComponentSearchResult {
  selected: boolean;
}

interface ProductFormData {
  name: string;
  description: string;
  brand: string;
  model: string;
  year_from: number;
  year_to: number;
  screen_size: string[];
  slug: string;
  active: boolean;
  featured: boolean;
  images: Array<{ url: string; is_primary: boolean; alt_text?: string }>;
  selectedComponents: SelectedComponent[];
}

const SCREEN_SIZES = [
  { value: '9', label: '9 inch' },
  { value: '10', label: '10 inch' },
  { value: '12.5', label: '12.5 inch' }
];

export default function ProductsPro() {
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewProduct, setPreviewProduct] = useState<any>(null);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [brandFilter, setBrandFilter] = useState('all-brands');
  const [screenSizeFilter, setScreenSizeFilter] = useState('all-sizes');
  const [statusFilter, setStatusFilter] = useState('all-status');
  const [searchResults, setSearchResults] = useState<ComponentSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [allComponents, setAllComponents] = useState<ComponentSearchResult[]>([]);
  const [activeTab, setActiveTab] = useState('basic');
  const { toast } = useToast();

  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    brand: '',
    model: '',
    year_from: new Date().getFullYear(),
    year_to: new Date().getFullYear() + 5,
    screen_size: [],
    slug: '',
    active: true,
    featured: false,
    images: [],
    selectedComponents: []
  });

  useEffect(() => {
    fetchProducts();
    fetchAllComponents();
  }, []);

  // Filter products based on search and filters
  useEffect(() => {
    let filtered = products;

    if (productSearchTerm) {
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
        product.brand.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
        product.model.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(productSearchTerm.toLowerCase())
      );
    }

    if (brandFilter && brandFilter !== 'all-brands') {
      filtered = filtered.filter(product => product.brand === brandFilter);
    }

    if (screenSizeFilter && screenSizeFilter !== 'all-sizes') {
      filtered = filtered.filter(product => 
        product.screen_size && product.screen_size.includes(screenSizeFilter)
      );
    }

    if (statusFilter && statusFilter !== 'all-status') {
      if (statusFilter === 'active') {
        filtered = filtered.filter(product => product.active);
      } else if (statusFilter === 'inactive') {
        filtered = filtered.filter(product => !product.active);
      } else if (statusFilter === 'featured') {
        filtered = filtered.filter(product => product.featured);
      }
    }

    setFilteredProducts(filtered);
  }, [products, productSearchTerm, brandFilter, screenSizeFilter, statusFilter]);

  // Debounced search for components
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchTerm.trim()) {
        searchComponents(searchTerm);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products_new')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
      setFilteredProducts(data || []);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAllComponents = async () => {
    try {
      // Try using the helper function first
      const { data: functionData, error: functionError } = await supabase
        .rpc('get_active_components');

      if (!functionError && functionData) {
        setAllComponents(functionData);
        return;
      }

      console.warn('Helper function failed, trying direct query:', functionError);

      // Fallback to direct table query
      const { data, error } = await supabase
        .from('component_library')
        .select('id, component_sku, name, description, component_type, stock_level, normal_price, merchant_price, default_image_url')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setAllComponents(data || []);
    } catch (error: any) {
      console.error('Error fetching components:', error);
      toast({
        title: "Error",
        description: "Failed to load components. Please check permissions and ensure the database schema is updated.",
        variant: "destructive"
      });
    }
  };

  const searchComponents = async (term: string) => {
    try {
      setSearchLoading(true);
      const { data, error } = await supabase
        .rpc('search_components', { search_term: term });

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error: any) {
      console.error('Component search error:', error);
      // Fallback to direct query if function doesn't exist
      const { data, error: fallbackError } = await supabase
        .from('component_library')
        .select('id, component_sku, name, description, component_type, stock_level, normal_price, merchant_price, default_image_url')
        .ilike('component_sku', `%${term}%`)
        .eq('is_active', true)
        .limit(20);
      
      if (fallbackError) {
        toast({
          title: "Error",
          description: "Failed to search components",
          variant: "destructive"
        });
      } else {
        setSearchResults(data || []);
      }
    } finally {
      setSearchLoading(false);
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

  const addComponentToProduct = (component: ComponentSearchResult) => {
    const isAlreadyAdded = formData.selectedComponents.find(c => c.id === component.id);
    if (isAlreadyAdded) {
      toast({
        title: "Component Already Added",
        description: "This component is already in your product",
        variant: "destructive"
      });
      return;
    }

    const newComponent: SelectedComponent = {
      ...component,
      selected: true
    };

    setFormData(prev => ({
      ...prev,
      selectedComponents: [...prev.selectedComponents, newComponent]
    }));

    // Clear search
    setSearchTerm('');
    setSearchResults([]);

    toast({
      title: "Component Added",
      description: `${component.component_sku} added to product`
    });
  };

  const removeComponent = (componentId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedComponents: prev.selectedComponents.filter(comp => comp.id !== componentId)
    }));
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (formData.selectedComponents.length === 0) {
        toast({
          title: "Error",
          description: "Please add at least one component to the product",
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
        year_from: formData.year_from,
        year_to: formData.year_to,
        screen_size: formData.screen_size,
        slug: formData.slug,
        active: formData.active,
        featured: formData.featured
      };

      let product;
      if (editingProduct) {
        // Update existing product
        const { data: updatedProduct, error: productError } = await supabase
          .from('products_new')
          .update(productData)
          .eq('id', editingProduct.id)
          .select()
          .single();
        
        if (productError) throw productError;
        product = updatedProduct;
      } else {
        // Create new product
        const { data: newProduct, error: productError } = await supabase
          .from('products_new')
          .insert([productData])
          .select()
          .single();
        
        if (productError) throw productError;
        product = newProduct;
      }

      // 2. Handle product images
      if (editingProduct) {
        // Clear existing images for edit mode
        await supabase
          .from('product_images_new')
          .delete()
          .eq('product_id', product.id);
      }

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

      // 3. Handle product components
      if (editingProduct) {
        // Clear existing component relationships for edit mode
        await supabase
          .from('product_components')
          .delete()
          .eq('product_id', product.id);
      }

      // Link components to product (SIMPLIFIED)
      for (let i = 0; i < formData.selectedComponents.length; i++) {
        const comp = formData.selectedComponents[i];
        
        // Direct link between product and component (no variants needed)
        const { error: linkError } = await supabase
          .from('product_components')
          .insert([{
            product_id: product.id,
            component_id: comp.id,
            is_required: false,
            is_default: i === 0,
            display_order: i
          }]);

        if (linkError) {
          console.warn('Component already linked to product or other linking error:', linkError);
        }
      }

      toast({
        title: "Success",
        description: editingProduct ? `Product "${formData.name}" updated successfully!` : `Product "${formData.name}" created successfully!`
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
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      brand: '',
      model: '',
      year_from: new Date().getFullYear(),
      year_to: new Date().getFullYear() + 5,
      screen_size: [],
      slug: '',
      active: true,
      featured: false,
      images: [],
      selectedComponents: []
    });
    setEditingProduct(null);
    setActiveTab('basic');
    setSearchTerm('');
    setSearchResults([]);
  };

  const handleEditProduct = async (product: any) => {
    try {
      // Fetch product components
      const { data: productComponents, error: compError } = await supabase
        .from('product_components')
        .select(`
          component_library!inner(
            id, component_sku, name, description, component_type,
            stock_level, normal_price, merchant_price, default_image_url
          )
        `)
        .eq('product_id', product.id);

      // Fetch product images
      const { data: productImages, error: imgError } = await supabase
        .from('product_images_new')
        .select('*')
        .eq('product_id', product.id)
        .order('sort_order');

      if (compError) console.error('Error loading components:', compError);
      if (imgError) console.error('Error loading images:', imgError);

      const components = productComponents?.map(pc => ({
        ...pc.component_library,
        selected: true
      })) || [];

      // Format images for the form
      const formattedImages = productImages?.map(img => ({
        url: img.url,
        is_primary: img.is_primary || false,
        alt_text: img.alt_text || ''
      })) || [];

      setFormData({
        name: product.name || '',
        description: product.description || '',
        brand: product.brand || '',
        model: product.model || '',
        year_from: product.year_from || new Date().getFullYear(),
        year_to: product.year_to || new Date().getFullYear() + 5,
        screen_size: product.screen_size || [],
        slug: product.slug || '',
        active: product.active ?? true,
        featured: product.featured ?? false,
        images: formattedImages,
        selectedComponents: components
      });
      
      setEditingProduct(product);
      setIsDialogOpen(true);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load product for editing',
        variant: 'destructive'
      });
    }
  };

  const handlePreviewProduct = async (product: any) => {
    try {
      // Fetch product components
      const { data: productComponents, error: compError } = await supabase
        .from('product_components')
        .select(`
          component_library!inner(
            id, component_sku, name, description, component_type,
            normal_price, default_image_url
          )
        `)
        .eq('product_id', product.id);

      // Fetch product images
      const { data: productImages, error: imgError } = await supabase
        .from('product_images_new')
        .select('*')
        .eq('product_id', product.id)
        .order('sort_order');

      if (compError) console.error('Error loading components:', compError);
      if (imgError) console.error('Error loading images:', imgError);

      const enhancedProduct = {
        ...product,
        components: productComponents || [],
        images: productImages || []
      };

      setPreviewProduct(enhancedProduct);
      setIsPreviewOpen(true);
    } catch (error: any) {
      console.error('Error loading product preview:', error);
      // Still show preview but without components/images
      setPreviewProduct(product);
      setIsPreviewOpen(true);
    }
  };

  // Get unique brands for filter
  const uniqueBrands = [...new Set(products.map(p => p.brand).filter(Boolean))];
  const uniqueScreenSizes = [...new Set(products.flatMap(p => p.screen_size || []))];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground">Create products using components from your library</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchProducts}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" />
                Create Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProduct ? 'Edit Product' : 'Create New Product'}</DialogTitle>
                <DialogDescription>
                  {editingProduct ? 'Edit your product and its components' : 'Create a product by adding components from your library'}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit}>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="basic">Product Details</TabsTrigger>
                    <TabsTrigger value="components">
                      Components ({formData.selectedComponents.length})
                    </TabsTrigger>
                    <TabsTrigger value="images">Product Images</TabsTrigger>
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
                          placeholder="e.g., Audi A4 9/10 Inch Casing Kit"
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
                        <Label htmlFor="brand">Brand *</Label>
                        <Input
                          id="brand"
                          value={formData.brand}
                          onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                          placeholder="e.g., Audi"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="model">Model *</Label>
                        <Input
                          id="model"
                          value={formData.model}
                          onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                          placeholder="e.g., A4"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Year Range</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label htmlFor="year_from" className="text-sm text-muted-foreground">From</Label>
                            <Input
                              id="year_from"
                              type="number"
                              min="2000"
                              max="2030"
                              value={formData.year_from}
                              onChange={(e) => setFormData(prev => ({ ...prev, year_from: parseInt(e.target.value) || new Date().getFullYear() }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="year_to" className="text-sm text-muted-foreground">To</Label>
                            <Input
                              id="year_to"
                              type="number"
                              min="2000"
                              max="2030"
                              value={formData.year_to}
                              onChange={(e) => setFormData(prev => ({ ...prev, year_to: parseInt(e.target.value) || new Date().getFullYear() }))}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Screen Size</Label>
                        <Select 
                          value={formData.screen_size[0] || ''} 
                          onValueChange={(value) => setFormData(prev => ({ ...prev, screen_size: value ? [value] : [] }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select screen size" />
                          </SelectTrigger>
                          <SelectContent>
                            {SCREEN_SIZES.map((size) => (
                              <SelectItem key={size.value} value={size.value}>
                                {size.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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

                    <div className="pt-6 pb-8 border-t">
                      <div className="space-y-4">
                        <h4 className="font-medium text-gray-900">Product Settings</h4>
                        <div className="flex gap-8">
                          <div className="flex items-start space-x-3">
                            <Switch
                              checked={formData.active}
                              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
                              className="mt-1"
                            />
                            <div>
                              <Label className="text-base font-medium">Active</Label>
                              <p className="text-sm text-muted-foreground">Product is available for customers to purchase</p>
                            </div>
                          </div>
                          <div className="flex items-start space-x-3">
                            <Switch
                              checked={formData.featured}
                              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, featured: checked }))}
                              className="mt-1"
                            />
                            <div>
                              <Label className="text-base font-medium">Featured</Label>
                              <p className="text-sm text-muted-foreground">Highlight this product on homepage and promotions</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Component Selection */}
                  <TabsContent value="components" className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-4">Component Library</h3>
                      <div className="space-y-4">
                        {/* SKU Search */}
                        <div className="relative">
                          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search by SKU, name, or description..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9"
                          />
                        </div>

                        {/* All Components Display */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base">
                              {searchTerm ? `Search Results (${searchResults.length})` : `All Components (${allComponents.length})`}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            {searchLoading && (
                              <div className="text-center py-4 text-muted-foreground">
                                Searching components...
                              </div>
                            )}
                            
                            {(searchTerm ? searchResults : allComponents).map((component) => (
                              <div key={component.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                                <div className="flex items-center space-x-3">
                                  {component.default_image_url ? (
                                    <img 
                                      src={component.default_image_url} 
                                      alt={component.name}
                                      className="w-10 h-10 rounded object-cover"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center">
                                      <Package className="h-5 w-5 text-gray-500" />
                                    </div>
                                  )}
                                  <div>
                                    <div className="font-mono text-sm text-blue-600">{component.component_sku}</div>
                                    <div className="font-medium">{component.name}</div>
                                    <div className="flex gap-2 mt-1">
                                      <Badge variant="secondary">{component.component_type}</Badge>
                                      <Badge variant="outline">Stock: {component.stock_level}</Badge>
                                      <Badge variant="outline">RM{component.normal_price}</Badge>
                                    </div>
                                  </div>
                                </div>
                                <Button 
                                  size="sm"
                                  onClick={() => addComponentToProduct(component)}
                                  disabled={formData.selectedComponents.find(c => c.id === component.id) ? true : false}
                                >
                                  {formData.selectedComponents.find(c => c.id === component.id) ? 'Added' : 'Add'}
                                </Button>
                              </div>
                            ))}
                            
                            {!searchLoading && (searchTerm ? searchResults : allComponents).length === 0 && (
                              <div className="text-center py-8 text-muted-foreground">
                                {searchTerm ? 'No components found matching your search.' : 'No components available. Create components in the Component Library first.'}
                              </div>
                            )}
                          </CardContent>
                        </Card>

                        {/* Selected Components */}
                        {formData.selectedComponents.length > 0 && (
                          <div>
                            <h4 className="font-medium mb-3">Selected Components ({formData.selectedComponents.length})</h4>
                            <div className="space-y-3">
                              {formData.selectedComponents.map((component) => (
                                <Card key={component.id} className="border-green-200 bg-green-50">
                                  <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-3">
                                        {component.default_image_url ? (
                                          <img 
                                            src={component.default_image_url} 
                                            alt={component.name}
                                            className="w-12 h-12 rounded object-cover"
                                          />
                                        ) : (
                                          <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center">
                                            <Package className="h-6 w-6 text-gray-500" />
                                          </div>
                                        )}
                                        <div>
                                          <div className="font-mono text-sm text-blue-600 font-medium">{component.component_sku}</div>
                                          <div className="font-medium">{component.name}</div>
                                          <div className="text-sm text-muted-foreground">{component.description}</div>
                                          <div className="flex gap-2 mt-1">
                                            <Badge variant="secondary">{component.component_type}</Badge>
                                            <div className="flex items-center text-sm">
                                              <span className="text-xs">RM</span>
                                              <span className="font-medium ml-1">{component.normal_price}</span>
                                              <span className="text-muted-foreground ml-1">(cost: RM{component.merchant_price})</span>
                                            </div>
                                            <Badge variant={component.stock_level > 10 ? 'default' : 'secondary'}>
                                              Stock: {component.stock_level}
                                            </Badge>
                                          </div>
                                        </div>
                                      </div>
                                      <Button 
                                        size="sm" 
                                        variant="destructive"
                                        onClick={() => removeComponent(component.id)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </div>
                        )}

                      </div>
                    </div>
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Products ({filteredProducts.length})</CardTitle>
              <CardDescription>Manage your products and their components</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filter Section */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search products by name, brand, model..."
                    value={productSearchTerm}
                    onChange={(e) => setProductSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={brandFilter} onValueChange={setBrandFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All Brands" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-brands">All Brands</SelectItem>
                    {uniqueBrands.map(brand => (
                      <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={screenSizeFilter} onValueChange={setScreenSizeFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All Sizes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-sizes">All Sizes</SelectItem>
                    {uniqueScreenSizes.map(size => (
                      <SelectItem key={size} value={size}>{size} inch</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-status">All Status</SelectItem>
                    <SelectItem value="active">Active Only</SelectItem>
                    <SelectItem value="inactive">Inactive Only</SelectItem>
                    <SelectItem value="featured">Featured Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          {loading ? (
            <div className="text-center py-8">Loading products...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No products created yet. Create your first product!
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProducts.map((product) => (
                <div key={product.id} className="flex justify-between items-center p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">{product.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {product.brand} {product.model} {product.year_from && product.year_to && `(${product.year_from}-${product.year_to})`}
                    </p>
                    {product.screen_size && product.screen_size.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {product.screen_size.map((size: string) => (
                          <Badge key={size} variant="outline" className="text-xs">
                            {size}"
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2 mt-2">
                      <Badge variant={product.active ? 'default' : 'secondary'}>
                        {product.active ? 'Active' : 'Inactive'}
                      </Badge>
                      {product.featured && <Badge variant="outline">Featured</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => handlePreviewProduct(product)}
                      title="Preview Product"
                    >
                      <Package className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => handleEditProduct(product)}
                      title="Edit Product"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={async () => {
                        if (confirm(`Are you sure you want to PERMANENTLY DELETE product "${product.name}"? This action cannot be undone and will remove all related components and images.`)) {
                          try {
                            // Use the new delete_product function from SQL
                            const { data: functionData, error: functionError } = await supabase
                              .rpc('delete_product', { product_id: product.id });

                            if (functionError) {
                              console.error('Function delete error:', functionError);
                              // Fallback to direct deletion if function fails
                              const { error: directError } = await supabase
                                .from('products_new')
                                .delete()
                                .eq('id', product.id);
                              
                              if (directError) throw directError;
                              
                              toast({
                                title: "Product Deleted",
                                description: `Product "${product.name}" has been deleted (fallback method)`
                              });
                            } else if (functionData?.success) {
                              toast({
                                title: "Product Deleted",
                                description: functionData.message || `Product "${product.name}" has been permanently deleted`
                              });
                            } else {
                              toast({
                                title: "Delete Failed",
                                description: functionData?.message || "Failed to delete product",
                                variant: "destructive"
                              });
                              return;
                            }

                            fetchProducts();
                          } catch (error: any) {
                            console.error('Error deleting product:', error);
                            toast({
                              title: "Error",
                              description: error.message || "Failed to delete product",
                              variant: "destructive"
                            });
                          }
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

      {/* Product Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Product Preview</DialogTitle>
            <DialogDescription>
              Customer view of this product
            </DialogDescription>
          </DialogHeader>
          
          {previewProduct && (
            <div className="space-y-6">
              {/* Product Header */}
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-3xl font-bold">{previewProduct.name}</h1>
                    <p className="text-xl text-muted-foreground">
                      {previewProduct.brand} {previewProduct.model}
                      {previewProduct.year_from && previewProduct.year_to && (
                        <span> ({previewProduct.year_from}-{previewProduct.year_to})</span>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {previewProduct.active && (
                      <Badge variant="default">Available</Badge>
                    )}
                    {previewProduct.featured && (
                      <Badge variant="outline">⭐ Featured</Badge>
                    )}
                  </div>
                </div>
                
                {/* Screen Sizes */}
                {previewProduct.screen_size && previewProduct.screen_size.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-2">Available Screen Sizes</h3>
                    <div className="flex gap-2">
                      {previewProduct.screen_size.map((size: string) => (
                        <Badge key={size} variant="secondary">
                          {size}" Screen
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Description */}
                {previewProduct.description && (
                  <div>
                    <h3 className="font-medium mb-2">Description</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {previewProduct.description}
                    </p>
                  </div>
                )}
              </div>
              
              {/* Product Images */}
              {previewProduct.images && previewProduct.images.length > 0 && (
                <div className="border-t pt-6">
                  <h3 className="font-medium mb-4">Product Images</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {previewProduct.images.map((image: any, index: number) => (
                      <div key={index} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                        <img 
                          src={image.url} 
                          alt={image.alt_text || `Product image ${index + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder-image.png';
                          }}
                        />
                        {image.is_primary && (
                          <Badge className="absolute top-2 left-2" variant="default">
                            Primary
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Available Components/Variants Section */}
              <div className="border-t pt-6">
                <h3 className="font-medium mb-4">Available Components</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Select the components you want and specify quantities
                </p>
                {previewProduct.components && previewProduct.components.length > 0 ? (
                  <div className="grid gap-4">
                    {previewProduct.components.map((compData: any, index: number) => {
                      const comp = compData.component_library;
                      return (
                        <div key={index} className="flex items-center gap-4 p-4 border rounded-lg bg-gray-50">
                          {comp.default_image_url && (
                            <div className="w-16 h-16 bg-white rounded-lg overflow-hidden flex-shrink-0 border">
                              <img 
                                src={comp.default_image_url} 
                                alt={comp.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                          <div className="flex-1">
                            <h4 className="font-medium">{comp.name}</h4>
                            <p className="text-sm text-muted-foreground">{comp.component_sku}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Stock: {comp.stock_level} available
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="font-medium">RM {comp.normal_price?.toFixed(2)}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button size="sm" variant="outline">-</Button>
                              <span className="w-12 text-center border rounded px-2 py-1 bg-white">1</span>
                              <Button size="sm" variant="outline">+</Button>
                            </div>
                            <Button size="sm" variant="default">Add</Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-2" />
                    <p>No components available for this product</p>
                  </div>
                )}
              </div>
              
              {/* Shopping Cart Summary */}
              <div className="border-t pt-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Your Selection</h4>
                  <div className="text-sm text-muted-foreground mb-3">
                    <p>• No components selected yet</p>
                    <p className="font-medium mt-2">Total: RM 0.00</p>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1">Add to Cart</Button>
                    <Button className="flex-1">Buy Now</Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  This is how customers will see your product - they select components and quantities
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}