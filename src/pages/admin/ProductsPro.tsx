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
import { Plus, RefreshCw, Search, Trash2, Edit, DollarSign, Package, Clock, Users, Video, Wrench } from 'lucide-react';
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

interface InstallationVideoForm {
  url: string;
  title: string;
  duration: string;
}

interface InstallationFormData {
  has_installation_guide: boolean;
  recommended_time: string;
  workman_power: number;
  installation_price: number;
  installation_videos: InstallationVideoForm[];
  difficulty_level: 'easy' | 'medium' | 'hard' | 'expert';
  notes: string;
}

interface ProductFormData {
  name: string;
  description: string;
  brand: string;
  model: string;
  category_id: string;
  year_from: number | null;
  year_to: number | null;
  screen_size: string[];
  slug: string;
  active: boolean;
  featured: boolean;
  keywords: string[];
  images: Array<{ url: string; is_primary: boolean; alt_text?: string }>;
  selectedComponents: SelectedComponent[];
  installation: InstallationFormData;
}

interface Category {
  id: string;
  name: string;
  description?: string;
  active: boolean;
}

const SCREEN_SIZES = [
  { value: '9', label: '9 inch' },
  { value: '10', label: '10 inch' },
  { value: '12.5', label: '12.5 inch' }
];

export default function ProductsPro() {
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewProduct, setPreviewProduct] = useState<any>(null);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [viewingImageInfo, setViewingImageInfo] = useState<{url: string, title: string} | null>(null);
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
    category_id: 'no-category',
    year_from: null,
    year_to: null,
    screen_size: [],
    slug: '',
    active: true,
    featured: false,
    keywords: [],
    images: [],
    selectedComponents: [],
    installation: {
      has_installation_guide: false,
      recommended_time: '',
      workman_power: 1,
      installation_price: 0,
      installation_videos: [],
      difficulty_level: 'medium',
      notes: ''
    }
  });

  useEffect(() => {
    fetchProducts();
    fetchAllComponents();
    fetchCategories();
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

      // Try with category join first
      let { data, error } = await supabase
        .from('products_new' as any)
        .select(`
          *,
          categories!products_new_category_id_fkey(
            id,
            name,
            description
          )
        `)
        .order('created_at', { ascending: false });

      // If the join fails, try without category join
      if (error) {
        const fallbackResult = await supabase
          .from('products_new' as any)
          .select('*')
          .order('created_at', { ascending: false });

        data = fallbackResult.data;
        error = fallbackResult.error;
      }

      if (error) throw error;
      setProducts((data as any) || []);
      setFilteredProducts((data as any) || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories' as any)
        .select('id, name, description, active')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setCategories((data as any) || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load categories",
        variant: "destructive"
      });
    }
  };

  const createCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const slug = newCategoryName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const { data, error } = await supabase
        .from('categories' as any)
        .insert({ name: newCategoryName.trim(), slug, active: true })
        .select()
        .single();

      if (error) throw error;
      setCategories(prev => [...prev, data as any].sort((a, b) => a.name.localeCompare(b.name)));
      setFormData(prev => ({ ...prev, category_id: (data as any).id }));
      setNewCategoryName('');
      setIsCreatingCategory(false);
      toast({ title: "Category created", description: `"${newCategoryName.trim()}" has been added` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to create category", variant: "destructive" });
    }
  };

  const fetchAllComponents = async () => {
    try {
      // Try using the helper function first
      const { data: functionData, error: functionError } = await (supabase
        .rpc as any)('get_active_components');

      if (!functionError && functionData) {
        setAllComponents((functionData as any));
        return;
      }


      // Fallback to direct table query
      const { data, error } = await supabase
        .from('component_library' as any)
        .select('id, component_sku, name, description, component_type, stock_level, normal_price, merchant_price, default_image_url')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setAllComponents((data as any) || []);
    } catch (error: any) {
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
      const { data, error } = await (supabase
        .rpc as any)('search_components', { search_term: term });

      if (error) throw error;
      setSearchResults((data as any) || []);
    } catch (error: any) {
      // Fallback to direct query if function doesn't exist
      const { data, error: fallbackError } = await supabase
        .from('component_library' as any)
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
        setSearchResults((data as any) || []);
      }
    } finally {
      setSearchLoading(false);
    }
  };

  // Auto-generate slug when name changes
  const generateSlug = async (name: string) => {
    if (!name.trim()) return '';
    
    try {
      const { data, error } = await (supabase
        .rpc as any)('generate_unique_slug', { 
          base_name: name,
          table_name: 'products_new'
        });
        
      if (error) throw error;
      return data || '';
    } catch (error) {
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
        category_id: formData.category_id === 'no-category' ? null : formData.category_id,
        year_from: formData.year_from,
        year_to: formData.year_to,
        screen_size: formData.screen_size,
        slug: formData.slug,
        active: formData.active,
        featured: formData.featured,
        keywords: formData.keywords
      };

      let product;
      if (editingProduct) {
        // Update existing product
        const { data: updatedProduct, error: productError } = await supabase
          .from('products_new' as any)
          .update(productData)
          .eq('id', editingProduct.id)
          .select()
          .single();
        
        if (productError) throw productError;
        product = updatedProduct;
      } else {
        // Create new product
        const { data: newProduct, error: productError } = await supabase
          .from('products_new' as any)
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
          .from('product_images_new' as any)
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
          .from('product_images_new' as any)
          .insert(imageInserts);
        
        if (imageError) throw imageError;
      }

      // 3. Handle product components
      if (editingProduct) {
        // Clear existing component relationships for edit mode
        await supabase
          .from('product_components' as any)
          .delete()
          .eq('product_id', product.id);
      }

      // Link components to product (SIMPLIFIED)
      for (let i = 0; i < formData.selectedComponents.length; i++) {
        const comp = formData.selectedComponents[i];

        // Direct link between product and component (no variants needed)
        const { error: linkError } = await supabase
          .from('product_components' as any)
          .insert([{
            product_id: product.id,
            component_id: comp.id,
            is_required: false,
            is_default: i === 0,
            display_order: i
          }]);

        if (linkError) {
        }
      }

      // 4. Handle product installation guide
      if (formData.installation.has_installation_guide) {
        const installationData = {
          product_id: product.id,
          recommended_time: formData.installation.recommended_time || null,
          workman_power: formData.installation.workman_power || 1,
          installation_price: formData.installation.installation_price || null,
          installation_videos: formData.installation.installation_videos.filter(v => v.url),
          difficulty_level: formData.installation.difficulty_level || 'medium',
          notes: formData.installation.notes || null
        };

        const { error: installError } = await supabase
          .from('product_installation_guides' as any)
          .upsert(installationData, { onConflict: 'product_id' });

        if (installError) {
        }
      } else {
        // Remove installation guide if unchecked
        await supabase
          .from('product_installation_guides' as any)
          .delete()
          .eq('product_id', product.id);
      }

      toast({
        title: "Success",
        description: editingProduct ? `Product "${formData.name}" updated successfully!` : `Product "${formData.name}" created successfully!`
      });

      setIsDialogOpen(false);
      resetForm();
      fetchProducts();
    } catch (error: any) {
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
      category_id: 'no-category',
      year_from: null,
      year_to: null,
      screen_size: [],
      slug: '',
      active: true,
      featured: false,
      keywords: [],
      images: [],
      selectedComponents: [],
      installation: {
        has_installation_guide: false,
        recommended_time: '',
        workman_power: 1,
        installation_price: 0,
        installation_videos: [],
        difficulty_level: 'medium',
        notes: ''
      }
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
        .from('product_components' as any)
        .select(`
          component_library!inner(
            id, component_sku, name, description, component_type,
            stock_level, normal_price, merchant_price, default_image_url
          )
        `)
        .eq('product_id', product.id);

      // Fetch product images
      const { data: productImages, error: imgError } = await supabase
        .from('product_images_new' as any)
        .select('*')
        .eq('product_id', product.id)
        .order('sort_order');

      // Fetch installation guide
      const { data: installationData, error: installError } = await supabase
        .from('product_installation_guides' as any)
        .select('*')
        .eq('product_id', product.id)
        .single();


      const components = (productComponents as any)?.map((pc: any) => ({
        ...pc.component_library,
        selected: true
      })) || [];

      // Format images for the form
      const formattedImages = (productImages as any)?.map((img: any) => ({
        url: img.url,
        is_primary: img.is_primary || false,
        alt_text: img.alt_text || ''
      })) || [];

      // Format installation data
      const installationFormData: InstallationFormData = installationData ? {
        has_installation_guide: true,
        recommended_time: installationData.recommended_time || '',
        workman_power: installationData.workman_power || 1,
        installation_price: installationData.installation_price || 0,
        installation_videos: installationData.installation_videos || [],
        difficulty_level: installationData.difficulty_level || 'medium',
        notes: installationData.notes || ''
      } : {
        has_installation_guide: false,
        recommended_time: '',
        workman_power: 1,
        installation_price: 0,
        installation_videos: [],
        difficulty_level: 'medium',
        notes: ''
      };

      setFormData({
        name: product.name || '',
        description: product.description || '',
        brand: product.brand || '',
        model: product.model || '',
        category_id: product.category_id || 'no-category',
        year_from: product.year_from || null,
        year_to: product.year_to || null,
        screen_size: product.screen_size || [],
        slug: product.slug || '',
        active: product.active ?? true,
        featured: product.featured ?? false,
        keywords: product.keywords || [],
        images: formattedImages,
        selectedComponents: components,
        installation: installationFormData
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
      // Fetch product components - same query as ProductDetails.tsx
      const { data: productComponentData, error: compError } = await supabase
        .from('product_components' as any)
        .select(`
          component_library!inner(
            id, component_sku, name, description, component_type,
            stock_level, normal_price, merchant_price, default_image_url
          )
        `)
        .eq('product_id', product.id)
        .order('display_order', { ascending: true });

      // Fetch product images
      const { data: productImages, error: imgError } = await supabase
        .from('product_images_new' as any)
        .select('*')
        .eq('product_id', product.id)
        .order('sort_order');


      // Transform components data same as ProductDetails.tsx
      const transformedComponents = (productComponentData || []).map((item: any, index: number) => {
        const component = item.component_library;
        return {
          id: component.id,
          component_sku: component.component_sku,
          name: component.name,
          description: component.description || 'Product component',
          component_type: component.component_type || 'component',
          stock_level: component.stock_level || 0,
          normal_price: component.normal_price || 0,
          merchant_price: component.merchant_price || component.normal_price || 0,
          default_image_url: component.default_image_url || null
        };
      });

      const enhancedProduct = {
        ...product,
        components: transformedComponents,
        images: productImages || []
      };

      setPreviewProduct(enhancedProduct);
      setIsPreviewOpen(true);
    } catch (error: any) {
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
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground">Create products using components from your library</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={fetchProducts}>
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
            <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] flex flex-col p-4 sm:p-6">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle>{editingProduct ? 'Edit Product' : 'Create New Product'}</DialogTitle>
                <DialogDescription>
                  {editingProduct ? 'Edit your product and its components' : 'Create a product by adding components from your library'}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col min-h-0 flex-1">
                  <TabsList className="grid w-full grid-cols-4 flex-shrink-0">
                    <TabsTrigger value="basic" className="text-xs sm:text-sm px-1 sm:px-3">
                      <span className="hidden sm:inline">Product Details</span>
                      <span className="sm:hidden">Details</span>
                    </TabsTrigger>
                    <TabsTrigger value="components" className="text-xs sm:text-sm px-1 sm:px-3">
                      <span className="hidden sm:inline">Components</span>
                      <span className="sm:hidden">Parts</span>
                      <span className="ml-1">({formData.selectedComponents.length})</span>
                    </TabsTrigger>
                    <TabsTrigger value="images" className="text-xs sm:text-sm px-1 sm:px-3">
                      <span className="hidden sm:inline">Product Images</span>
                      <span className="sm:hidden">Images</span>
                    </TabsTrigger>
                    <TabsTrigger value="installation" className="text-xs sm:text-sm px-1 sm:px-3">
                      <Wrench className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-0.5 sm:mr-1" />
                      <span className="hidden sm:inline">Installation</span>
                      <span className="sm:hidden">Install</span>
                    </TabsTrigger>
                  </TabsList>

                  {/* Basic Product Info */}
                  <TabsContent value="basic" className="space-y-4 overflow-y-auto flex-1 min-h-0 pr-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        <Label htmlFor="category_id">Category</Label>
                        {isCreatingCategory ? (
                          <div className="flex gap-2">
                            <Input
                              value={newCategoryName}
                              onChange={(e) => setNewCategoryName(e.target.value)}
                              placeholder="New category name"
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); createCategory(); } }}
                              autoFocus
                            />
                            <Button type="button" size="sm" onClick={createCategory} disabled={!newCategoryName.trim()}>
                              Add
                            </Button>
                            <Button type="button" size="sm" variant="ghost" onClick={() => setIsCreatingCategory(false)}>
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <Select
                              value={formData.category_id}
                              onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select a category" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="no-category">No Category</SelectItem>
                                {categories.map((category) => (
                                  <SelectItem key={category.id} value={category.id}>
                                    {category.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button type="button" size="sm" variant="outline" onClick={() => setIsCreatingCategory(true)}>
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
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
                      <div className="space-y-2">
                        <Label>Year Range</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label htmlFor="year_from" className="text-sm text-muted-foreground">From</Label>
                            <Input
                              id="year_from"
                              type="number"
                              value={formData.year_from ?? ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, year_from: e.target.value ? parseInt(e.target.value) : null }))}
                              placeholder="e.g., 2020"
                            />
                          </div>
                          <div>
                            <Label htmlFor="year_to" className="text-sm text-muted-foreground">To</Label>
                            <Input
                              id="year_to"
                              type="number"
                              value={formData.year_to ?? ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, year_to: e.target.value ? parseInt(e.target.value) : null }))}
                              placeholder="e.g., 2025"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Detailed product description..."
                          rows={3}
                          className="resize-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="keywords">SEO Keywords ({formData.keywords.length}/5)</Label>
                        <Input
                          id="keywords"
                          placeholder="Type keyword and press Enter"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const keyword = e.currentTarget.value.trim();
                              if (keyword && formData.keywords.length < 5 && !formData.keywords.includes(keyword)) {
                                setFormData(prev => ({ ...prev, keywords: [...prev.keywords, keyword] }));
                                e.currentTarget.value = '';
                              }
                            }
                          }}
                        />
                        {formData.keywords.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {formData.keywords.map((keyword, index) => (
                              <Badge key={index} variant="secondary" className="flex items-center gap-1 text-xs">
                                {keyword}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormData(prev => ({
                                      ...prev,
                                      keywords: prev.keywords.filter((_, i) => i !== index)
                                    }));
                                  }}
                                  className="ml-0.5 hover:text-red-500"
                                  title="Remove keyword"
                                >
                                  ×
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Press Enter after typing each keyword.
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 pt-5 pb-2 border-t">
                      <h4 className="font-medium text-gray-900 mb-4">Product Settings</h4>
                      <div className="flex flex-wrap gap-8">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={formData.active}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
                          />
                          <div>
                            <Label className="font-medium">Active</Label>
                            <p className="text-xs text-muted-foreground">Available for purchase</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={formData.featured}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, featured: checked }))}
                          />
                          <div>
                            <Label className="font-medium">Featured</Label>
                            <p className="text-xs text-muted-foreground">Show on homepage</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Component Selection */}
                  <TabsContent value="components" className="flex-1 min-h-0">
                    {/* Selected Components Summary Bar */}
                    {formData.selectedComponents.length > 0 && (
                      <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-green-800">
                            {formData.selectedComponents.length} component{formData.selectedComponents.length !== 1 ? 's' : ''} selected
                          </span>
                          <span className="text-xs text-green-600">
                            Total: RM{formData.selectedComponents.reduce((sum, c) => sum + c.normal_price, 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex gap-1 flex-wrap justify-end max-w-[60%]">
                          {formData.selectedComponents.map((c) => (
                            <Badge
                              key={c.id}
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0 h-5 bg-white border border-green-200 cursor-pointer hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors group"
                              onClick={() => removeComponent(c.id)}
                              title={`Remove ${c.name}`}
                            >
                              {c.component_sku}
                              <span className="ml-0.5 group-hover:text-red-500">×</span>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 h-[calc(55vh-3rem)] lg:h-[55vh]">
                      {/* Left: Component Library */}
                      <div className="flex flex-col min-h-0 h-[35vh] sm:h-[40vh] lg:h-full">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-sm">
                            {searchTerm ? `Results (${searchResults.length})` : `Library (${allComponents.length})`}
                          </h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => window.open('/admin/component-library', '_blank')}
                          >
                            <Plus className="mr-1 h-3 w-3" />
                            New Component
                          </Button>
                        </div>
                        <div className="relative mb-2">
                          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search SKU, name, or type..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 h-9"
                          />
                        </div>
                        <div className="flex-1 overflow-y-auto border rounded-lg min-h-0">
                          {searchLoading && (
                            <div className="text-center py-4 text-sm text-muted-foreground">
                              Searching...
                            </div>
                          )}
                          {(searchTerm ? searchResults : allComponents).map((component) => {
                            const isAdded = formData.selectedComponents.some(c => c.id === component.id);
                            return (
                              <div
                                key={component.id}
                                className={`flex items-center justify-between gap-2 px-3 py-2 border-b last:border-b-0 hover:bg-gray-50 transition-colors ${isAdded ? 'bg-green-50/50' : ''}`}
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  {component.default_image_url ? (
                                    <img src={component.default_image_url} alt={component.name} className="w-8 h-8 rounded object-cover flex-shrink-0" />
                                  ) : (
                                    <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                                      <Package className="h-4 w-4 text-gray-400" />
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <div className="font-mono text-xs text-blue-600">{component.component_sku}</div>
                                    <div className="text-sm font-medium truncate">{component.name}</div>
                                    <div className="flex gap-1 mt-0.5 flex-wrap">
                                      <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">{component.component_type}</Badge>
                                      <span className="text-[10px] text-muted-foreground">Stock: {component.stock_level}</span>
                                      <span className="text-[10px] text-muted-foreground">RM{component.normal_price}</span>
                                    </div>
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={isAdded ? 'secondary' : 'default'}
                                  className="h-7 text-xs flex-shrink-0"
                                  onClick={() => addComponentToProduct(component)}
                                  disabled={isAdded}
                                >
                                  {isAdded ? 'Added' : 'Add'}
                                </Button>
                              </div>
                            );
                          })}
                          {!searchLoading && (searchTerm ? searchResults : allComponents).length === 0 && (
                            <div className="text-center py-8">
                              <Package className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
                              <p className="text-sm text-muted-foreground">
                                {searchTerm ? 'No components found.' : 'No components yet.'}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Selected Components */}
                      <div className="flex flex-col min-h-0 h-[25vh] sm:h-[30vh] lg:h-full">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-sm">
                            Selected ({formData.selectedComponents.length})
                          </h4>
                          {formData.selectedComponents.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              Total: RM{formData.selectedComponents.reduce((sum, c) => sum + c.normal_price, 0).toFixed(2)}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 overflow-y-auto border rounded-lg min-h-0 bg-gray-50/50">
                          {formData.selectedComponents.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center p-4">
                              <Package className="h-10 w-10 text-muted-foreground/30 mb-2" />
                              <p className="text-sm text-muted-foreground">No components selected</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                <span className="hidden lg:inline">Add components from the library on the left</span>
                                <span className="lg:hidden">Add components from the library above</span>
                              </p>
                            </div>
                          ) : (
                            formData.selectedComponents.map((component) => (
                              <div key={component.id} className="flex items-center justify-between gap-2 px-3 py-2 border-b last:border-b-0 bg-white hover:bg-green-50/50">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  {component.default_image_url ? (
                                    <img src={component.default_image_url} alt={component.name} className="w-8 h-8 rounded object-cover flex-shrink-0" />
                                  ) : (
                                    <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                                      <Package className="h-4 w-4 text-gray-400" />
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <div className="font-mono text-xs text-blue-600">{component.component_sku}</div>
                                    <div className="text-sm font-medium truncate">{component.name}</div>
                                    <div className="flex gap-1 mt-0.5 flex-wrap">
                                      <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">{component.component_type}</Badge>
                                      <span className="text-[10px]">RM{component.normal_price}</span>
                                      <span className="text-[10px] text-muted-foreground">(cost: RM{component.merchant_price})</span>
                                    </div>
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                                  onClick={() => removeComponent(component.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Product Images */}
                  <TabsContent value="images" className="space-y-4 overflow-y-auto flex-1 min-h-0 pr-1">
                    <div>
                      <h3 className="text-lg font-medium mb-4">Product Images</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                  {/* Installation Guide */}
                  <TabsContent value="installation" className="space-y-6 overflow-y-auto flex-1 min-h-0 pr-1">
                    <div className="space-y-4">
                      {/* Enable/Disable Toggle */}
                      <div className="flex items-center space-x-3 pb-4 border-b">
                        <Switch
                          checked={formData.installation.has_installation_guide}
                          onCheckedChange={(checked) => setFormData(prev => ({
                            ...prev,
                            installation: { ...prev.installation, has_installation_guide: checked }
                          }))}
                        />
                        <div>
                          <Label className="text-base font-medium">Include Installation Guide</Label>
                          <p className="text-sm text-muted-foreground">
                            Add installation information and videos for this product
                          </p>
                        </div>
                      </div>

                      {formData.installation.has_installation_guide && (
                        <>
                          {/* Installation Details Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                Recommended Time
                              </Label>
                              <Input
                                value={formData.installation.recommended_time}
                                onChange={(e) => setFormData(prev => ({
                                  ...prev,
                                  installation: { ...prev.installation, recommended_time: e.target.value }
                                }))}
                                placeholder="e.g., 30-45 minutes"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                Workman Power
                              </Label>
                              <Input
                                type="number"
                                min="1"
                                value={formData.installation.workman_power}
                                onChange={(e) => setFormData(prev => ({
                                  ...prev,
                                  installation: { ...prev.installation, workman_power: parseInt(e.target.value) || 1 }
                                }))}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="flex items-center gap-1">
                                <DollarSign className="h-4 w-4" />
                                Installation Price (RM)
                              </Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={formData.installation.installation_price}
                                onChange={(e) => setFormData(prev => ({
                                  ...prev,
                                  installation: { ...prev.installation, installation_price: parseFloat(e.target.value) || 0 }
                                }))}
                              />
                            </div>
                          </div>

                          {/* Difficulty Level */}
                          <div className="space-y-2">
                            <Label>Difficulty Level</Label>
                            <Select
                              value={formData.installation.difficulty_level}
                              onValueChange={(value: 'easy' | 'medium' | 'hard' | 'expert') => setFormData(prev => ({
                                ...prev,
                                installation: { ...prev.installation, difficulty_level: value }
                              }))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="easy">Easy</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="hard">Hard</SelectItem>
                                <SelectItem value="expert">Expert</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Installation Videos */}
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <Label className="flex items-center gap-1">
                                <Video className="h-4 w-4" />
                                Installation Videos
                              </Label>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setFormData(prev => ({
                                  ...prev,
                                  installation: {
                                    ...prev.installation,
                                    installation_videos: [
                                      ...prev.installation.installation_videos,
                                      { url: '', title: '', duration: '' }
                                    ]
                                  }
                                }))}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Add Video
                              </Button>
                            </div>

                            {formData.installation.installation_videos.length === 0 && (
                              <p className="text-sm text-muted-foreground">No videos added yet. Click "Add Video" to include installation videos.</p>
                            )}

                            {formData.installation.installation_videos.map((video, index) => (
                              <Card key={index} className="p-4">
                                <div className="grid grid-cols-12 gap-3">
                                  <div className="col-span-6">
                                    <Label className="text-xs text-muted-foreground">Video URL</Label>
                                    <Input
                                      value={video.url}
                                      onChange={(e) => {
                                        const videos = [...formData.installation.installation_videos];
                                        videos[index] = { ...videos[index], url: e.target.value };
                                        setFormData(prev => ({
                                          ...prev,
                                          installation: { ...prev.installation, installation_videos: videos }
                                        }));
                                      }}
                                      placeholder="https://youtube.com/watch?v=..."
                                    />
                                  </div>
                                  <div className="col-span-3">
                                    <Label className="text-xs text-muted-foreground">Title</Label>
                                    <Input
                                      value={video.title}
                                      onChange={(e) => {
                                        const videos = [...formData.installation.installation_videos];
                                        videos[index] = { ...videos[index], title: e.target.value };
                                        setFormData(prev => ({
                                          ...prev,
                                          installation: { ...prev.installation, installation_videos: videos }
                                        }));
                                      }}
                                      placeholder="Video title"
                                    />
                                  </div>
                                  <div className="col-span-2">
                                    <Label className="text-xs text-muted-foreground">Duration</Label>
                                    <Input
                                      value={video.duration}
                                      onChange={(e) => {
                                        const videos = [...formData.installation.installation_videos];
                                        videos[index] = { ...videos[index], duration: e.target.value };
                                        setFormData(prev => ({
                                          ...prev,
                                          installation: { ...prev.installation, installation_videos: videos }
                                        }));
                                      }}
                                      placeholder="15:30"
                                    />
                                  </div>
                                  <div className="col-span-1 flex items-end justify-center">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        const videos = formData.installation.installation_videos.filter((_, i) => i !== index);
                                        setFormData(prev => ({
                                          ...prev,
                                          installation: { ...prev.installation, installation_videos: videos }
                                        }));
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                  </div>
                                </div>
                              </Card>
                            ))}
                          </div>

                          {/* Notes */}
                          <div className="space-y-2">
                            <Label>Additional Notes</Label>
                            <Textarea
                              value={formData.installation.notes}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                installation: { ...prev.installation, notes: e.target.value }
                              }))}
                              placeholder="Any additional notes for customers about installation..."
                              rows={3}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="flex gap-3 pt-4 mt-4 border-t flex-shrink-0 bg-background sticky bottom-0">
                  <Button type="submit" className="flex-1">
                    {editingProduct ? 'Save Changes' : 'Create Product'}
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
              <div className="flex gap-2 flex-wrap">
                <Select value={brandFilter} onValueChange={setBrandFilter}>
                  <SelectTrigger className="w-full sm:w-[150px]">
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
                  <SelectTrigger className="w-full sm:w-[150px]">
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
                  <SelectTrigger className="w-full sm:w-[150px]">
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
                <div key={product.id} className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">{product.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {product.brand} {product.model} {product.year_from && product.year_to && `(${product.year_from}-${product.year_to})`}
                    </p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {(product.categories || product.category) && (
                        <Badge variant="secondary" className="text-xs">
                          📂 {(product.categories?.name || product.category?.name || 'Category')}
                        </Badge>
                      )}
                      {product.screen_size && product.screen_size.length > 0 &&
                        product.screen_size.map((size: string) => (
                          <Badge key={size} variant="outline" className="text-xs">
                            {size}"
                          </Badge>
                        ))
                      }
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Badge variant={product.active ? 'default' : 'secondary'}>
                        {product.active ? 'Active' : 'Inactive'}
                      </Badge>
                      {product.featured && <Badge variant="outline">Featured</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-2 self-end sm:self-auto">
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
                            const { data: functionData, error: functionError } = await (supabase
                              .rpc as any)('delete_product', { product_id: product.id });

                            if (functionError) {
                              // Fallback to direct deletion if function fails
                              const { error: directError } = await supabase
                                .from('products_new' as any)
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
                  <h3 className="font-medium mb-2">Product Images</h3>
                  <p className="text-sm text-muted-foreground mb-4">Click any image to view in full size</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {previewProduct.images.map((image: any, index: number) => (
                      <div
                        key={index}
                        className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer group hover:shadow-lg transition-all duration-200"
                        onClick={() => {
                          const imageInfo = {url: image.url, title: `Product Image ${index + 1}`};
                          setViewingImage(image.url);
                          setViewingImageInfo(imageInfo);
                        }}
                        title="Click to enlarge"
                      >
                        <img
                          src={image.url}
                          alt={image.alt_text || `Product image ${index + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
                <h3 className="font-medium mb-2">Available Components</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Select components and specify quantities. Click component images to enlarge.
                </p>
                {previewProduct.components && previewProduct.components.length > 0 ? (
                  <div className="grid gap-4">
                    {previewProduct.components.map((component: any, index: number) => {
                      return (
                        <div key={index} className="flex items-center gap-4 p-4 border rounded-lg bg-gray-50">
                          {component.default_image_url && (
                            <div
                              className="w-16 h-16 bg-white rounded-lg overflow-hidden flex-shrink-0 border cursor-pointer group hover:shadow-md transition-all duration-200"
                              onClick={() => {
                                const imageInfo = {url: component.default_image_url, title: `${component.name} - Component Image`};
                                setViewingImage(component.default_image_url);
                                setViewingImageInfo(imageInfo);
                              }}
                              title="Click to enlarge component image"
                            >
                              <img
                                src={component.default_image_url}
                                alt={component.name}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const imageInfo = {url: component.default_image_url, title: `${component.name} - Component Image`};
                                  setViewingImage(component.default_image_url);
                                  setViewingImageInfo(imageInfo);
                                }}
                              />
                            </div>
                          )}
                          <div className="flex-1">
                            <h4 className="font-medium">{component.name}</h4>
                            <p className="text-sm text-muted-foreground">{component.component_sku}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Stock: {component.stock_level} available
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="font-medium">RM {component.normal_price?.toFixed(2)}</p>
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

      {/* Image Viewer Modal */}
      {viewingImage && (
        <Dialog open={!!viewingImage} onOpenChange={() => {
          setViewingImage(null);
          setViewingImageInfo(null);
        }}>
          <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-hidden p-3 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">
                {viewingImageInfo?.title || 'Image Viewer'}
              </DialogTitle>
              <DialogDescription className="text-sm">
                View image in full size
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center overflow-hidden">
              <img
                src={viewingImage}
                alt={viewingImageInfo?.title || "Full size view"}
                className="max-w-full max-h-[75vh] object-contain rounded-lg"
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  e.currentTarget.src = '/placeholder-image.png';
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}