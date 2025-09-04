import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client.js';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Filter, ShoppingCart, Eye, Package, Store, User } from 'lucide-react';
import ProductDetailsModal from '@/components/ProductDetailsModal';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>(searchParams.get('brand') || 'all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { user } = useAuth();
  const { customerType, pricingMode, getPriceLabel } = usePricing();

  // Update selected brand when URL changes
  useEffect(() => {
    const brandFromUrl = searchParams.get('brand');
    if (brandFromUrl && brandFromUrl !== selectedBrand) {
      setSelectedBrand(brandFromUrl);
    }
  }, [searchParams, selectedBrand]);

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

  // Fetch products with pricing based on customer type
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['products', searchTerm, selectedBrand, user?.id],
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

  const handleQuickView = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="bg-gradient-to-br from-background to-muted/20 pt-8">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-between mb-6">
              <div className="flex-1">
                <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                  Product Catalog
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  Discover our extensive range of high-quality automotive parts and accessories
                </p>
              </div>
              
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-8 p-6 bg-card rounded-lg shadow-sm border">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search products, brands, or parts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedBrand} onValueChange={handleBrandChange}>
              <SelectTrigger className="w-full md:w-[200px]">
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

          {/* Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {productsLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardHeader className="p-0">
                    <Skeleton className="h-48 w-full" />
                  </CardHeader>
                  <CardContent className="p-4">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-full mb-2" />
                    <Skeleton className="h-3 w-1/2 mb-4" />
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : products.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold mb-2">No products found</h3>
                <p className="text-muted-foreground">Try adjusting your search criteria</p>
              </div>
            ) : (
              products.map((product) => {
                const productStatus = getProductStatus(product);
                const primaryImage = getPrimaryImage(product.product_images);
                
                return (
                  <Card 
                    key={product.id} 
                    className="overflow-hidden hover:shadow-lg transition-all duration-300 group cursor-pointer"
                    onClick={() => handleQuickView(product)}
                  >
                    <CardHeader className="p-0 relative">
                      <div className="aspect-square overflow-hidden bg-muted flex items-center justify-center">
                        <img
                          src={primaryImage}
                          alt={product.name}
                          className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="absolute top-2 right-2">
                        <Badge variant={productStatus.variant}>
                          {productStatus.label}
                        </Badge>
                        {product.featured && (
                          <Badge className="ml-1" variant="secondary">⭐ Featured</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="mb-2">
                        <h3 className="font-semibold text-sm line-clamp-2 mb-1">{product.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {product.brand} {product.model} 
                          {product.year_from && product.year_to && ` (${product.year_from}-${product.year_to})`}
                        </p>
                        {product.screen_size && product.screen_size.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {product.screen_size.map((size) => (
                              <Badge key={size} variant="outline" className="text-xs">
                                {size}"
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                        {product.description}
                      </p>


                      <div className="flex items-center justify-center">
                        <div className="text-xs text-muted-foreground">
                          Click to view details
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Statistics */}
          {products.length > 0 && (
            <div className="text-center mt-12">
              <p className="text-muted-foreground">
                Showing {products.length} product{products.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-muted text-muted-foreground py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-hero rounded-lg">
                  <Package className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="font-bold text-lg">Autolab</span>
              </div>
              <p className="text-sm opacity-80 mb-4">
                Malaysia's trusted destination for premium automotive parts and accessories.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <div className="space-y-2 text-sm">
                <Link to="/catalog" className="block hover:text-primary transition-fast">Shop Parts</Link>
                <Link to="/brands" className="block hover:text-primary transition-fast">Brands</Link>
                <Link to="/about" className="block hover:text-primary transition-fast">About Us</Link>
                <Link to="/contact" className="block hover:text-primary transition-fast">Contact</Link>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Customer Service</h4>
              <div className="space-y-2 text-sm">
                <p>Phone: +60 3-1234 5678</p>
                <p>Email: support@autolab.my</p>
                <p>Hours: Mon-Sat 9AM-6PM</p>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Follow Us</h4>
              <div className="flex gap-4">
                <Button variant="ghost" size="sm">Facebook</Button>
                <Button variant="ghost" size="sm">Instagram</Button>
                <Button variant="ghost" size="sm">WhatsApp</Button>
              </div>
            </div>
          </div>
          
          <div className="border-t border-border/20 mt-8 pt-8 text-center text-sm opacity-80">
            <p>&copy; 2024 Autolab. All rights reserved. | Privacy Policy | Terms of Service</p>
          </div>
        </div>
      </footer>

      {/* Product Details Modal */}
      <ProductDetailsModal
        product={selectedProduct}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedProduct(null);
        }}
      />
    </div>
  );
};

export default Catalog;