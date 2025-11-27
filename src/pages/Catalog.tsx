import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Package, ChevronLeft, ChevronRight, X } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PageTransition from '@/components/PageTransition';

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  brand: string;
  model: string;
  year_from: number;
  year_to: number;
  screen_size: string[];
  active: boolean;
  featured: boolean;
  price: number; // This will be either normal_price or merchant_price based on customer type
  normal_price: number;
  merchant_price: number;
  customer_type: string;
  category_id?: string;
  category?: ProductCategory;
  product_images: Array<{
    url: string;
    alt_text: string;
    is_primary: boolean;
  }>;
  product_variants?: Array<{
    id: string;
    components: string | null;
    price_regular: number;
  }>;
}


interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

const Catalog = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [selectedBrand, setSelectedBrand] = useState<string>(searchParams.get('brand') || 'all');
  const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get('category') || 'all');
  const navigate = useNavigate();

  // Mobile pagination settings
  const [isMobile, setIsMobile] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12; // Show 12 items per page on mobile


  // Handle window resize for mobile detection
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 640;
      setIsMobile(mobile);
      if (mobile !== isMobile) {
        setCurrentPage(1); // Reset to first page when switching between mobile/desktop
      }
    };

    handleResize(); // Set initial value
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile]);

  // Fetch products with pricing based on customer type
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['products', searchTerm, selectedBrand, selectedCategory],
    queryFn: async () => {
      // Direct query to get products with categories
      const { data: directData, error: directError } = await supabase
        .from('products_new' as any)
        .select(`
          *,
          product_images_new (
            url,
            alt_text,
            is_primary,
            sort_order
          ),
          categories (
            id,
            name,
            slug,
            description
          )
        `)
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (directError) {
        console.error('Error fetching products:', directError);
        return [];
      }

      // Map the data to match interface with fallback pricing
      const productsData = (directData as any).map((item: any) => ({
        ...item,
        product_images: item.product_images_new || [],
        category: item.categories,
        price: item.normal_price || 299, // Fallback price
        normal_price: item.normal_price || 299,
        merchant_price: item.merchant_price || 249,
        customer_type: 'normal'
      }));

      // Filter products based on search and brand
      let filteredData = productsData;

      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        filteredData = filteredData.filter((item: any) =>
          item.name?.toLowerCase().includes(searchLower) ||
          item.description?.toLowerCase().includes(searchLower) ||
          item.brand?.toLowerCase().includes(searchLower) ||
          item.model?.toLowerCase().includes(searchLower)
        );
      }

      if (selectedBrand !== 'all') {
        filteredData = filteredData.filter((item: any) => item.brand === selectedBrand);
      }

      if (selectedCategory !== 'all') {
        filteredData = filteredData.filter((item: any) => item.category?.id === selectedCategory);
      }

      // Ensure product_images is always an array
      return filteredData.map((item: any) => ({
        ...item,
        product_images: Array.isArray(item.product_images) ? item.product_images : []
      })) as unknown as Product[];
    },
  });

  // Reset to first page when search, brand, or category changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedBrand, selectedCategory]);

  // Update search term, selected brand, and category when URL changes
  useEffect(() => {
    const searchFromUrl = searchParams.get('search');
    const brandFromUrl = searchParams.get('brand') || 'all';
    const categoryFromUrl = searchParams.get('category') || 'all';

    if (searchFromUrl !== searchTerm) {
      setSearchTerm(searchFromUrl || '');
    }

    if (brandFromUrl !== selectedBrand) {
      setSelectedBrand(brandFromUrl);
    }

    if (categoryFromUrl !== selectedCategory) {
      setSelectedCategory(categoryFromUrl);
    }
  }, [searchParams, searchTerm, selectedBrand, selectedCategory]);

  // Update URL when brand changes
  const handleBrandChange = (brand: string) => {
    setSelectedBrand(brand);
    if (brand === 'all') {
      searchParams.delete('brand');
    } else {
      searchParams.set('brand', brand);
    }
    setSearchParams(searchParams);
  };

  // Update URL when category changes
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    if (category === 'all') {
      searchParams.delete('category');
    } else {
      searchParams.set('category', category);
    }
    setSearchParams(searchParams);
  };

  // Handle search term changes with debounced URL updates
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);

    // Update URL parameters
    if (value.trim()) {
      searchParams.set('search', value.trim());
    } else {
      searchParams.delete('search');
    }
    setSearchParams(searchParams);
  };

  // Fetch unique brands
  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('products_new' as any)
          .select('brand')
          .eq('active', true);

        if (!error && data) {
          const uniqueBrands = [...new Set((data as any).map((item: any) => item.brand).filter(Boolean))] as string[];
          return uniqueBrands.map(brand => ({ id: brand, name: brand }));
        } else {
          console.warn('Brands query failed:', error);
          return [];
        }
      } catch (error) {
        console.warn('Brands query failed:', error);
        return [];
      }
    },
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('id, name, slug, description')
          .eq('active', true)
          .order('name', { ascending: true });

        if (!error && data) {
          return data;
        } else {
          console.warn('Categories query failed:', error);
          return [];
        }
      } catch (error) {
        console.warn('Categories query failed:', error);
        return [];
      }
    },
  });


  const getPrimaryImage = (images: Product['product_images']) => {
    const primaryImage = images.find(img => img.is_primary) || images[0];
    return primaryImage?.url || '/placeholder.svg';
  };

  const getComponentCount = (product: Product) => {
    if (!product.product_variants || product.product_variants.length === 0) {
      return 0;
    }

    // Count unique components across all variants
    const allComponents = new Set<string>();
    product.product_variants.forEach(variant => {
      if (variant.components) {
        try {
          // Try to parse as JSON first
          const components = JSON.parse(variant.components);
          if (Array.isArray(components)) {
            components.forEach(comp => allComponents.add(comp));
          }
        } catch {
          // If not JSON, treat as comma-separated string
          const components = variant.components.split(',').map(c => c.trim()).filter(Boolean);
          components.forEach(comp => allComponents.add(comp));
        }
      }
    });

    return allComponents.size;
  };

  const getLowestPrice = (product: Product) => {
    // If no variants, return the normal price
    if (!product.product_variants || product.product_variants.length === 0) {
      return product.normal_price;
    }

    // Find the lowest price from variants
    const prices = product.product_variants
      .map(v => (v as any).price_regular)
      .filter(p => p != null && p > 0);

    if (prices.length === 0) {
      return product.normal_price;
    }

    return Math.min(...prices);
  };

  const handleProductView = (product: Product) => {
    navigate(`/product/${product.id}`);
  };

  // Pagination calculations
  const totalProducts = products.length;
  const totalPages = Math.ceil(totalProducts / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const displayProducts = isMobile ? products.slice(startIndex, endIndex) : products;

  // Page navigation handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Small delay to ensure content loads before scrolling
    setTimeout(() => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }, 50);
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />

        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 flex-1">
          {/* Page Header */}
          <div className="mb-6 border-b border-gray-200 pb-4">
            <h1 className="text-3xl font-heading font-bold text-gray-900 uppercase italic mb-2">Product Catalog</h1>
            <p className="text-sm text-gray-500 uppercase tracking-wider font-medium">Discover our extensive range of high-quality automotive parts and accessories</p>
          </div>

          {/* Mobile Filters - Shows only on small screens */}
          <div className="lg:hidden mb-6">
            <div className="bg-white/80 backdrop-blur-xl border border-gray-100 rounded-xl p-4 shadow-md">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Search Input */}
                <div className="sm:col-span-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search products..."
                      value={searchTerm}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="pl-10 h-10 bg-gray-50 border-gray-200 rounded-lg text-sm"
                    />
                  </div>
                </div>

                {/* Category Filter */}
                <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                  <SelectTrigger className="h-10 bg-gray-50 border-gray-200 rounded-lg text-sm">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 rounded-xl shadow-lg max-h-[280px]">
                    <SelectItem value="all" className="cursor-pointer hover:bg-lime-50 focus:bg-lime-50 focus:text-lime-700 rounded-lg mx-1 my-0.5">
                      All Categories
                    </SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id} className="cursor-pointer hover:bg-lime-50 focus:bg-lime-50 focus:text-lime-700 rounded-lg mx-1 my-0.5">
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Brand Filter */}
                <Select value={selectedBrand} onValueChange={handleBrandChange}>
                  <SelectTrigger className="h-10 bg-gray-50 border-gray-200 rounded-lg text-sm">
                    <SelectValue placeholder="Brand" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 rounded-xl shadow-lg max-h-[280px]">
                    <SelectItem value="all" className="cursor-pointer hover:bg-lime-50 focus:bg-lime-50 focus:text-lime-700 rounded-lg mx-1 my-0.5">
                      All Brands
                    </SelectItem>
                    {brands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id} className="cursor-pointer hover:bg-lime-50 focus:bg-lime-50 focus:text-lime-700 rounded-lg mx-1 my-0.5">
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Results Count */}
                <div className="flex items-center justify-center">
                  <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                    {totalProducts} Found
                  </span>
                </div>
              </div>

              {/* Active Filters Mobile */}
              {(selectedCategory !== 'all' || selectedBrand !== 'all' || searchTerm) && (
                <div className="mt-3 pt-3 border-t border-gray-200 flex items-center gap-2 flex-wrap">
                  {selectedCategory !== 'all' && (
                    <button onClick={() => handleCategoryChange('all')} className="flex items-center gap-1 px-2 py-1 bg-lime-50 text-lime-700 text-[10px] font-bold rounded-lg hover:bg-lime-100">
                      {categories.find(c => c.id === selectedCategory)?.name}
                      <X className="h-3 w-3" />
                    </button>
                  )}
                  {selectedBrand !== 'all' && (
                    <button onClick={() => handleBrandChange('all')} className="flex items-center gap-1 px-2 py-1 bg-lime-50 text-lime-700 text-[10px] font-bold rounded-lg hover:bg-lime-100">
                      {brands.find(b => b.id === selectedBrand)?.name}
                      <X className="h-3 w-3" />
                    </button>
                  )}
                  {searchTerm && (
                    <button onClick={() => handleSearchChange('')} className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-[10px] font-bold rounded-lg hover:bg-gray-200">
                      "{searchTerm}"
                      <X className="h-3 w-3" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedBrand('all');
                      setSelectedCategory('all');
                      setSearchParams(new URLSearchParams());
                    }}
                    className="ml-auto text-[10px] font-bold uppercase tracking-wide text-lime-600 hover:text-lime-700"
                  >
                    Clear All
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Main Content - Sidebar Layout */}
          <div className="flex gap-5">
            {/* Left Sidebar - Filters - Desktop Only */}
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <div className="bg-white/80 backdrop-blur-xl border border-gray-100 rounded-xl p-5 shadow-md sticky top-6">
                <h2 className="text-lg font-bold text-gray-900 uppercase mb-4">Filters</h2>

                {/* Search Input */}
                <div className="mb-5">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search products..."
                      value={searchTerm}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="pl-10 h-10 bg-gray-50 border-gray-200 rounded-lg text-sm"
                    />
                  </div>
                </div>

                {/* Category Filter */}
                <div className="mb-5">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Category</label>
                  <div className="flex flex-col gap-1.5 max-h-[240px] overflow-y-auto pr-1">
                    <button
                      onClick={() => handleCategoryChange('all')}
                      className={`px-3 py-2 text-xs font-semibold text-left rounded-lg transition-all ${selectedCategory === 'all'
                        ? 'bg-lime-500 text-white shadow-sm'
                        : 'bg-gray-50 text-gray-700 hover:bg-lime-50 hover:text-lime-700'
                        }`}
                    >
                      All Categories
                    </button>
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => handleCategoryChange(category.id)}
                        className={`px-3 py-2 text-xs font-semibold text-left rounded-lg transition-all ${selectedCategory === category.id
                          ? 'bg-lime-500 text-white shadow-sm'
                          : 'bg-gray-50 text-gray-700 hover:bg-lime-50 hover:text-lime-700'
                          }`}
                      >
                        {category.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Brand Filter */}
                <div className="mb-5">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Brand</label>
                  <div className="flex flex-col gap-1.5 max-h-[240px] overflow-y-auto pr-1">
                    <button
                      onClick={() => handleBrandChange('all')}
                      className={`px-3 py-2 text-xs font-semibold text-left rounded-lg transition-all ${selectedBrand === 'all'
                        ? 'bg-lime-500 text-white shadow-sm'
                        : 'bg-gray-50 text-gray-700 hover:bg-lime-50 hover:text-lime-700'
                        }`}
                    >
                      All Brands
                    </button>
                    {brands.map((brand) => (
                      <button
                        key={brand.id}
                        onClick={() => handleBrandChange(brand.id)}
                        className={`px-3 py-2 text-xs font-semibold text-left rounded-lg transition-all ${selectedBrand === brand.id
                          ? 'bg-lime-500 text-white shadow-sm'
                          : 'bg-gray-50 text-gray-700 hover:bg-lime-50 hover:text-lime-700'
                          }`}
                      >
                        {brand.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Clear All Filters */}
                {(selectedCategory !== 'all' || selectedBrand !== 'all' || searchTerm) && (
                  <div className="pt-3 border-t border-gray-200">
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setSelectedBrand('all');
                        setSelectedCategory('all');
                        setSearchParams(new URLSearchParams());
                      }}
                      className="w-full px-3 py-2 bg-gray-900 text-white text-xs font-bold uppercase tracking-wide rounded-lg hover:bg-lime-600 transition-colors"
                    >
                      Clear All Filters
                    </button>
                  </div>
                )}
              </div>
            </aside>

            {/* Right Content - Products */}
            <div className="flex-1 min-w-0">
              {/* Results Header - Desktop */}
              <div className="hidden lg:flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
                <h2 className="text-base font-bold text-gray-900 uppercase">
                  {totalProducts} Products
                </h2>
                {(selectedCategory !== 'all' || selectedBrand !== 'all' || searchTerm) && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedBrand('all');
                      setSelectedCategory('all');
                      setSearchParams(new URLSearchParams());
                    }}
                    className="text-xs font-bold uppercase tracking-wide text-lime-600 hover:text-lime-700 transition-colors"
                  >
                    Reset Filters
                  </button>
                )}
              </div>

              {/* Products Grid */}
              {productsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {Array.from({ length: isMobile ? itemsPerPage : 8 }).map((_, i) => (
                    <div key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                      <Skeleton className="aspect-square w-full" />
                      <div className="p-3">
                        <Skeleton className="h-4 w-16 mb-2 rounded" />
                        <Skeleton className="h-4 w-full mb-1.5" />
                        <Skeleton className="h-5 w-24 mb-2" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : totalProducts === 0 ? (
                <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Package className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-serif font-semibold text-gray-900 mb-2">No Products Found</h3>
                  <p className="text-[15px] text-gray-500 mb-6">
                    Try adjusting your filters to see more results
                  </p>
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedBrand('all');
                      setSelectedCategory('all');
                      setSearchParams(new URLSearchParams());
                    }}
                    className="px-6 py-3 bg-gray-900 text-white font-bold uppercase tracking-wide text-sm hover:bg-lime-600 transition-all rounded-lg"
                  >
                    Clear Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {displayProducts.map((product) => {
                    const primaryImage = getPrimaryImage(product.product_images);
                    const componentCount = getComponentCount(product);

                    return (
                      <div
                        key={product.id}
                        onClick={() => handleProductView(product)}
                        className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer group relative flex flex-col"
                      >
                        {/* Product Image */}
                        <div className="relative aspect-square overflow-hidden bg-gray-50">
                          <img
                            src={primaryImage}
                            alt={product.name}
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                            decoding="async"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/placeholder.svg';
                            }}
                          />

                          {/* Status Badge - Top Left */}
                          {product.featured && (
                            <div className="absolute top-1.5 left-1.5">
                              <span className="px-1.5 py-0.5 bg-amber-600 text-white text-[9px] font-bold rounded shadow-lg">
                                Premium
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Glassmorphism Specs Overlay - Shows on Hover - Covers bottom 50% of entire card */}
                        <div className="absolute top-[50%] left-0 right-0 bottom-0 flex items-center justify-center px-3 py-2 pointer-events-none">
                          <div className="backdrop-blur-lg bg-black/5 rounded-lg p-3 border-2 border-white/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out w-full h-full flex flex-col justify-center overflow-y-auto shadow-lg">
                            {/* Header with accent line */}
                            <div className="mb-2">
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <div className="w-1 h-4 bg-lime-500 rounded-full shadow-sm"></div>
                                <h4 className="text-black font-bold text-xs uppercase tracking-wide">Specifications</h4>
                              </div>
                              <div className="h-0.5 bg-gradient-to-r from-lime-500 via-lime-400/70 to-transparent rounded-full"></div>
                            </div>

                            {/* Specs Grid */}
                            <div className="space-y-2">
                              {product.brand && (
                                <div className="flex items-center justify-between bg-white/40 backdrop-blur-sm rounded px-2 py-1.5 border border-gray-300/60 shadow-sm">
                                  <span className="text-[10px] font-medium text-gray-700 uppercase tracking-wide">Brand</span>
                                  <span className="text-xs font-bold text-black truncate ml-2">{product.brand}</span>
                                </div>
                              )}
                              {product.model && (
                                <div className="flex items-center justify-between bg-white/40 backdrop-blur-sm rounded px-2 py-1.5 border border-gray-300/60 shadow-sm">
                                  <span className="text-[10px] font-medium text-gray-700 uppercase tracking-wide">Model</span>
                                  <span className="text-xs font-bold text-black truncate ml-2">{product.model}</span>
                                </div>
                              )}
                              {product.category && (
                                <div className="flex items-center justify-between bg-white/40 backdrop-blur-sm rounded px-2 py-1.5 border border-gray-300/60 shadow-sm">
                                  <span className="text-[10px] font-medium text-gray-700 uppercase tracking-wide">Category</span>
                                  <span className="text-xs font-bold text-black truncate ml-2">{product.category.name}</span>
                                </div>
                              )}
                              {product.year_from && product.year_to && (
                                <div className="flex items-center justify-between bg-white/40 backdrop-blur-sm rounded px-2 py-1.5 border border-gray-300/60 shadow-sm">
                                  <span className="text-[10px] font-medium text-gray-700 uppercase tracking-wide">Year</span>
                                  <span className="text-xs font-bold text-black truncate ml-2">{product.year_from}-{product.year_to}</span>
                                </div>
                              )}
                              {componentCount > 0 && (
                                <div className="flex items-center justify-between bg-lime-400/30 backdrop-blur-sm rounded px-2 py-1.5 border-2 border-lime-500/60 shadow-sm">
                                  <span className="text-[10px] font-bold text-lime-800 uppercase tracking-wide">Components</span>
                                  <span className="text-xs font-bold text-lime-900 truncate ml-2">{componentCount} Included</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Product Info */}
                        <div className="p-3 flex-1 flex flex-col">
                          {/* Brand Badge */}
                          <div className="mb-1.5">
                            <span className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[9px] font-semibold rounded uppercase tracking-wide truncate max-w-full">
                              {product.brand}
                            </span>
                          </div>

                          {/* Product Title */}
                          <h3 className="font-sans text-gray-900 text-xs font-semibold mb-2 line-clamp-2 leading-snug flex-1">
                            {product.name}
                          </h3>

                          {/* Footer Info */}
                          <div className="flex items-center justify-between text-[9px] text-gray-400 pt-1.5 border-t border-gray-100">
                            <span className="uppercase tracking-wider font-medium truncate max-w-[60%]">
                              {product.category?.name || 'Details'}
                            </span>
                            {componentCount > 0 ? (
                              <span className="font-semibold text-gray-600 truncate">
                                {componentCount} {componentCount === 1 ? 'Component' : 'Components'}
                              </span>
                            ) : (
                              <span className="font-semibold text-gray-600">
                                View Details
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Mobile Pagination */}
              {isMobile && totalPages > 1 && (
                <div className="mt-8">
                  <div className="flex items-center justify-between bg-white/80 backdrop-blur-xl border border-gray-100 rounded-xl p-4 shadow-md">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 font-bold uppercase tracking-widest text-[10px] hover:bg-gray-100 transition-all rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Prev
                    </button>

                    <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
                      {currentPage} / {totalPages}
                    </span>

                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 font-bold uppercase tracking-widest text-[10px] hover:bg-gray-100 transition-all rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Results Summary */}
              {totalProducts > 0 && (
                <div className="text-center mt-8 mb-4">
                  <p className="text-xs font-medium uppercase tracking-widest text-gray-400">
                    {isMobile ? (
                      `Showing ${startIndex + 1}-${Math.min(endIndex, totalProducts)} of ${totalProducts} products`
                    ) : (
                      `Showing all ${totalProducts} product${totalProducts !== 1 ? 's' : ''}`
                    )}
                  </p>
                </div>
              )}
            </div>
            {/* End Right Content */}
          </div>
          {/* End Main Content Flex Container */}
        </main>

        <Footer />
      </div>
    </PageTransition>
  );
};

export default Catalog;