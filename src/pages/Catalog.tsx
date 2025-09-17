import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Filter, ShoppingCart, Eye, Package, Store, User, ChevronLeft, ChevronRight } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PageTransition from '@/components/PageTransition';
import { Link } from 'react-router-dom';
import { usePricing } from '@/hooks/usePricing';
import { useAuth } from '@/hooks/useAuth';

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
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  is_active: boolean;
  sort_order: number;
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

  const { user } = useAuth();
  const { customerType, pricingMode, getPriceLabel } = usePricing();

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
        .from('products_new')
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
      const productsData = directData.map(item => ({
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
        filteredData = filteredData.filter(item =>
          item.name?.toLowerCase().includes(searchLower) ||
          item.description?.toLowerCase().includes(searchLower) ||
          item.brand?.toLowerCase().includes(searchLower) ||
          item.model?.toLowerCase().includes(searchLower)
        );
      }

      if (selectedBrand !== 'all') {
        filteredData = filteredData.filter(item => item.brand === selectedBrand);
      }

      if (selectedCategory !== 'all') {
        filteredData = filteredData.filter(item => item.category?.id === selectedCategory);
      }
      
      // Ensure product_images is always an array
      return filteredData.map(item => ({
        ...item,
        product_images: Array.isArray(item.product_images) ? item.product_images : []
      })) as Product[];
    },
  });

  // Reset to first page when search, brand, or category changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedBrand, selectedCategory]);

  // Update search term, selected brand, and category when URL changes
  useEffect(() => {
    const searchFromUrl = searchParams.get('search');
    const brandFromUrl = searchParams.get('brand');
    const categoryFromUrl = searchParams.get('category');

    if (searchFromUrl !== searchTerm) {
      setSearchTerm(searchFromUrl || '');
    }

    if (brandFromUrl && brandFromUrl !== selectedBrand) {
      setSelectedBrand(brandFromUrl);
    }

    if (categoryFromUrl && categoryFromUrl !== selectedCategory) {
      setSelectedCategory(categoryFromUrl);
    }
  }, [searchParams]);

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
          .from('products_new')
          .select('brand')
          .eq('active', true);
        
        if (!error && data) {
          const uniqueBrands = [...new Set(data.map(item => item.brand).filter(Boolean))];
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

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
    }).format(amount);
  };

  const getProductStatus = (product: Product) => {
    if (!product.active) return { label: 'Unavailable', variant: 'destructive' as const, available: false };
    return { label: 'Available', variant: 'default' as const, available: true };
  };

  const getPrimaryImage = (images: Product['product_images']) => {
    const primaryImage = images.find(img => img.is_primary) || images[0];
    return primaryImage?.url || '/placeholder.svg';
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
      <div className="min-h-screen bg-gray-50">
        <Header />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Clean Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Product Catalog
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Discover our extensive range of high-quality automotive parts and accessories
            </p>
          </div>

          {/* Clean Filters */}
          <div className="mb-10">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="space-y-4 sm:space-y-0 sm:flex sm:gap-4">
                {/* Search Input */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    placeholder="Search products, brands, or parts..."
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-10 h-11 border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Brand Filter */}
                <div className="w-full sm:w-48">
                  <Select value={selectedBrand} onValueChange={handleBrandChange}>
                    <SelectTrigger className="h-11 border-gray-300">
                      <Filter className="h-4 w-4 mr-2 text-gray-500" />
                      <SelectValue placeholder="All Brands" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Brands</SelectItem>
                      {brands.map((brand) => (
                        <SelectItem key={brand.id} value={brand.id}>
                          {brand.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Stats */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  Found {totalProducts} products
                  {isMobile && totalProducts > itemsPerPage && (
                    <span className="ml-4">Page {currentPage} of {totalPages}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {productsLoading ? (
              Array.from({ length: isMobile ? itemsPerPage : 8 }).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardHeader className="p-0">
                    <Skeleton className="aspect-square w-full" />
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-full mb-2" />
                    <Skeleton className="h-3 w-1/2 mb-3" />
                    <Skeleton className="h-6 w-24 mx-auto" />
                  </CardContent>
                </Card>
              ))
            ) : totalProducts === 0 ? (
              <div className="col-span-full text-center py-16">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900">No products found</h3>
                <p className="text-gray-600 mb-6">
                  Try adjusting your search criteria or browse all categories
                </p>
                <Button
                  variant="outline"
                  onClick={() => {setSearchTerm(''); setSelectedBrand('all'); setSelectedCategory('all')}}
                >
                  Clear Filters
                </Button>
              </div>
            ) : (
              displayProducts.map((product) => {
                const productStatus = getProductStatus(product);
                const primaryImage = getPrimaryImage(product.product_images);
                
                return (
                  <Card
                    key={product.id}
                    className="overflow-hidden cursor-pointer bg-white border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md transition-all duration-200 group"
                    onClick={() => handleProductView(product)}
                  >
                    {/* Product Image */}
                    <CardHeader className="p-0 relative">
                      <div className="aspect-square overflow-hidden bg-gray-50 flex items-center justify-center">
                        <img
                          src={primaryImage}
                          alt={product.name}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/placeholder.svg';
                          }}
                        />
                      </div>
                      {/* Status Badges */}
                      <div className="absolute top-2 right-2 flex flex-col gap-1">
                        <Badge variant={productStatus.variant} className="text-xs">
                          {productStatus.label}
                        </Badge>
                        {product.featured && (
                          <Badge className="text-xs bg-blue-600 text-white">
                            Featured
                          </Badge>
                        )}
                      </div>
                    </CardHeader>

                    {/* Product Info */}
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <h3 className="font-semibold text-sm line-clamp-2 leading-tight text-gray-900">
                          {product.name}
                        </h3>
                        
                        {/* Category */}
                        {product.category && (
                          <div className="mb-2">
                            <Badge variant="secondary" className="text-xs">
                              {product.category.name}
                            </Badge>
                          </div>
                        )}

                        {/* Brand & Model */}
                        <div className="space-y-1">
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">{product.brand}</span>
                            {product.model && <span className="ml-1">{product.model}</span>}
                          </div>
                          {product.year_from && product.year_to && (
                            <div className="text-xs text-gray-500">
                              {product.year_from}-{product.year_to}
                            </div>
                          )}
                        </div>

                        {/* Screen Sizes */}
                        {product.screen_size && product.screen_size.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {product.screen_size.slice(0, 2).map((size) => (
                              <Badge key={size} variant="outline" className="text-xs">
                                {size}"
                              </Badge>
                            ))}
                            {product.screen_size.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{product.screen_size.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Action Area */}
                      <div className="mt-4 pt-3 border-t border-gray-100">
                        <div className="flex items-center justify-center text-sm text-blue-600 group-hover:text-blue-700 transition-colors">
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Mobile Pagination */}
          {isMobile && totalPages > 1 && (
            <div className="mt-8">
              <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 p-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>

                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Results Summary */}
          {totalProducts > 0 && (
            <div className="text-center mt-8">
              <p className="text-sm text-gray-600">
                {isMobile ? (
                  `Showing ${startIndex + 1}-${Math.min(endIndex, totalProducts)} of ${totalProducts} products`
                ) : (
                  `Showing ${totalProducts} product${totalProducts !== 1 ? 's' : ''}`
                )}
              </p>
            </div>
          )}
        </div>

        <Footer />
      </div>
    </PageTransition>
  );
};

export default Catalog;