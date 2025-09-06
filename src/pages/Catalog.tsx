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
}

const Catalog = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [selectedBrand, setSelectedBrand] = useState<string>(searchParams.get('brand') || 'all');
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
    queryKey: ['products', searchTerm, selectedBrand],
    queryFn: async () => {
      // Direct query to get products
      const { data: directData, error: directError } = await supabase
        .from('products_new')
        .select(`
          *,
          product_images_new (
            url,
            alt_text,
            is_primary,
            sort_order
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
      
      // Ensure product_images is always an array
      return filteredData.map(item => ({
        ...item,
        product_images: Array.isArray(item.product_images) ? item.product_images : []
      })) as Product[];
    },
  });

  // Reset to first page when search or brand changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedBrand]);

  // Update search term and selected brand when URL changes
  useEffect(() => {
    const searchFromUrl = searchParams.get('search');
    const brandFromUrl = searchParams.get('brand');
    
    if (searchFromUrl !== searchTerm) {
      setSearchTerm(searchFromUrl || '');
    }
    
    if (brandFromUrl && brandFromUrl !== selectedBrand) {
      setSelectedBrand(brandFromUrl);
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
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="bg-gradient-to-br from-background to-muted/20">
        <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
          {/* Header - Responsive */}
          <div className="text-center mb-6 sm:mb-8 lg:mb-12">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 sm:mb-4 bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              Product Catalog
            </h1>
            <p className="text-sm sm:text-base lg:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
              Discover our extensive range of high-quality automotive parts and accessories
            </p>
          </div>

          {/* Filters - Mobile First Design */}
          <div className="mb-6 sm:mb-8">
            <div className="bg-card rounded-lg shadow-sm border p-3 sm:p-4 lg:p-6">
              <div className="space-y-3 sm:space-y-0 sm:flex sm:gap-4">
                {/* Search Input */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search products, brands, or parts..."
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-10 h-10 sm:h-9"
                  />
                </div>
                {/* Brand Filter */}
                <div className="w-full sm:w-48">
                  <Select value={selectedBrand} onValueChange={handleBrandChange}>
                    <SelectTrigger className="w-full h-10 sm:h-9">
                      <Filter className="h-4 w-4 mr-2" />
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
            </div>
          </div>

          {/* Products Grid - Mobile 2x2, Desktop Responsive */}
          <div className="products-grid grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 sm:gap-3 lg:gap-4 xl:gap-6">
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
              <div className="col-span-full text-center py-8 sm:py-12">
                <div className="text-4xl sm:text-6xl mb-4">🔍</div>
                <h3 className="text-lg sm:text-xl font-semibold mb-2">No products found</h3>
                <p className="text-muted-foreground text-sm sm:text-base">Try adjusting your search criteria</p>
              </div>
            ) : (
              displayProducts.map((product) => {
                const productStatus = getProductStatus(product);
                const primaryImage = getPrimaryImage(product.product_images);
                
                return (
                  <Card 
                    key={product.id} 
                    className="overflow-hidden hover:shadow-lg transition-all duration-300 group cursor-pointer bg-white"
                    onClick={() => handleProductView(product)}
                  >
                    {/* Product Image */}
                    <CardHeader className="p-0 relative">
                      <div className="aspect-square overflow-hidden bg-gray-50 flex items-center justify-center">
                        <img
                          src={primaryImage}
                          alt={product.name}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
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
                          <Badge variant="secondary" className="text-xs">⭐</Badge>
                        )}
                      </div>
                    </CardHeader>

                    {/* Product Info - Compact for Mobile 2x2 Grid */}
                    <CardContent className="p-2 sm:p-3 lg:p-4">
                      {/* Product Name & Details */}
                      <div className="space-y-1 sm:space-y-2">
                        <h3 className="font-semibold text-xs sm:text-sm lg:text-base line-clamp-2 leading-tight">
                          {product.name}
                        </h3>
                        
                        {/* Brand & Model - More compact on mobile */}
                        <div className="text-xs text-muted-foreground">
                          <span className="font-medium">{product.brand}</span>
                          {product.model && <span className="hidden sm:inline"> {product.model}</span>}
                          {product.year_from && product.year_to && (
                            <span className="hidden sm:block lg:inline lg:ml-1 text-xs">
                              ({product.year_from}-{product.year_to})
                            </span>
                          )}
                        </div>

                        {/* Screen Sizes - Hide on very small mobile, show on tablet+ */}
                        {product.screen_size && product.screen_size.length > 0 && (
                          <div className="hidden sm:flex flex-wrap gap-1">
                            {product.screen_size.slice(0, 1).map((size) => (
                              <Badge key={size} variant="outline" className="text-xs px-1 py-0.5">
                                {size}"
                              </Badge>
                            ))}
                            {product.screen_size.length > 1 && (
                              <Badge variant="outline" className="text-xs px-1 py-0.5">
                                +{product.screen_size.length - 1}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Action Area - Simplified for mobile */}
                      <div className="mt-2 sm:mt-3 lg:mt-4 pt-2 sm:pt-3 border-t border-border/50">
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                            <Eye className="h-3 w-3" />
                            <span className="hidden sm:inline">View Details &</span> Components
                          </div>
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
            <div className="mt-6">
              <div className="flex items-center justify-between bg-white rounded-lg border p-4 shadow-sm">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(totalPages, 3) }).map((_, index) => {
                      let pageNum;
                      if (totalPages <= 3) {
                        pageNum = index + 1;
                      } else {
                        if (currentPage <= 2) {
                          pageNum = index + 1;
                        } else if (currentPage >= totalPages - 1) {
                          pageNum = totalPages - 2 + index;
                        } else {
                          pageNum = currentPage - 1 + index;
                        }
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`w-8 h-8 rounded text-xs font-medium transition-colors ${
                            currentPage === pageNum
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-2"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Statistics */}
          {totalProducts > 0 && (
            <div className="text-center mt-6 sm:mt-8">
              <p className="text-sm sm:text-base text-muted-foreground">
                {isMobile ? (
                  `Showing ${startIndex + 1}-${Math.min(endIndex, totalProducts)} of ${totalProducts} products`
                ) : (
                  `Showing ${totalProducts} product${totalProducts !== 1 ? 's' : ''}`
                )}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer - Responsive */}
      <footer className="bg-muted text-muted-foreground py-8 sm:py-12">
        <div className="container mx-auto px-3 sm:px-4 lg:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {/* Company Info */}
            <div className="sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-hero rounded-lg">
                  <Package className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="font-bold text-lg">Autolab</span>
              </div>
              <p className="text-sm opacity-80 mb-4 max-w-sm">
                Malaysia's trusted destination for premium automotive parts and accessories.
              </p>
            </div>
            
            {/* Quick Links */}
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <div className="space-y-2 text-sm">
                <Link to="/catalog" className="block hover:text-primary transition-colors">Shop Parts</Link>
                <Link to="/brands" className="block hover:text-primary transition-colors">Brands</Link>
                <Link to="/about" className="block hover:text-primary transition-colors">About Us</Link>
                <Link to="/contact" className="block hover:text-primary transition-colors">Contact</Link>
              </div>
            </div>

            {/* Customer Service */}
            <div>
              <h4 className="font-semibold mb-4">Customer Service</h4>
              <div className="space-y-2 text-sm">
                <p>Phone: +60 3-1234 5678</p>
                <p>Email: support@autolab.my</p>
                <p>Hours: Mon-Sat 9AM-6PM</p>
              </div>
            </div>

            {/* Social Media */}
            <div>
              <h4 className="font-semibold mb-4">Follow Us</h4>
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" size="sm" className="text-xs">Facebook</Button>
                <Button variant="ghost" size="sm" className="text-xs">Instagram</Button>
                <Button variant="ghost" size="sm" className="text-xs">WhatsApp</Button>
              </div>
            </div>
          </div>
          
          {/* Copyright */}
          <div className="border-t border-border/20 mt-6 sm:mt-8 pt-6 sm:pt-8 text-center">
            <div className="text-xs sm:text-sm opacity-80 space-y-2 sm:space-y-0">
              <p>&copy; 2024 Autolab. All rights reserved.</p>
              <div className="flex flex-wrap justify-center gap-4 sm:gap-6 mt-2">
                <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
                <Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
              </div>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default Catalog;