import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, ShoppingCart, Package, Store, User, RefreshCw } from 'lucide-react';
import Header from '@/components/Header';
import { usePricing, useComponentPricing } from '@/hooks/usePricing';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCartDB';
// Removed debug components to stop refresh loops

interface Component {
  id: string;
  component_sku: string;
  name: string;
  description: string;
  component_type: string;
  component_value: string;
  stock_level: number;
  price: number; // This will be either normal_price or merchant_price based on customer type
  normal_price: number;
  merchant_price: number;
  customer_type: string;
  default_image_url?: string;
  is_active: boolean;
}

const ComponentCatalog = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  
  const { user } = useAuth();
  const { customerType, pricingMode, getDisplayPrice, getPriceLabel, isLoading: pricingLoading, refreshPricingContext } = usePricing();
  const { components, isLoading: componentsLoading, error, refetch } = useComponentPricing();
  const { addItem } = useCart();

  // Simple one-time refresh on user change only
  useEffect(() => {
    if (user && !isLoading && !componentsLoading) {
      refetch();
    }
  }, [user]);

  // Filter components based on search term and type
  const filteredComponents = components.filter(component => {
    const matchesSearch = !searchTerm || 
      component.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      component.component_sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      component.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = selectedType === 'all' || component.component_type === selectedType;
    
    return matchesSearch && matchesType && component.is_active;
  });

  // Get unique component types for filter
  const componentTypes = [...new Set(components.map(c => c.component_type))];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR'
    }).format(amount);
  };

  const handleAddToCart = async (component: Component) => {
    try {
      await addItem({
        component_sku: component.component_sku,
        name: component.name,
        normal_price: component.price, // Use the appropriate price
        quantity: 1,
        product_name: `${component.component_type} Component`,
        component_image: component.default_image_url
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  const handleRefreshPricing = async () => {
    await refreshPricingContext();
    await refetch();
  };

  if (pricingLoading || componentsLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <p className="text-red-600">Error loading components: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header with Pricing Info */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold">Component Catalog</h1>
              <p className="text-muted-foreground">Browse and purchase automotive components</p>
            </div>
            
            {/* Pricing Mode Indicator */}
            {user && (
              <div className="flex items-center gap-2">
                <Badge 
                  variant={customerType === 'merchant' ? 'default' : 'secondary'}
                  className="flex items-center gap-2"
                >
                  {customerType === 'merchant' ? (
                    <Store className="h-3 w-3" />
                  ) : (
                    <User className="h-3 w-3" />
                  )}
                  {pricingMode} Pricing
                </Badge>
                <p className="text-sm text-muted-foreground">
                  {customerType === 'merchant' ? 'Wholesale prices' : 'Retail prices'}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshPricing}
                  className="flex items-center gap-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  Refresh
                </Button>
              </div>
            )}
          </div>

          {/* Search and Filters */}
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search components..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {componentTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Clean B2B/B2C Implementation */}

        {/* Components Grid */}
        {filteredComponents.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No components found</h3>
            <p className="text-gray-500">Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" key={`${customerType}-${pricingMode}`}>
            {filteredComponents.map((component) => (
              <Card key={`${component.id}-${customerType}`} className="group hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="text-xs">
                      {component.component_type}
                    </Badge>
                    <Badge variant={component.stock_level > 0 ? 'default' : 'destructive'} className="text-xs">
                      {component.stock_level > 0 ? 'In Stock' : 'Out of Stock'}
                    </Badge>
                  </div>
                  
                  <CardTitle className="text-sm font-medium line-clamp-2">
                    {component.name}
                  </CardTitle>
                  
                  <p className="text-xs text-muted-foreground font-mono">
                    SKU: {component.component_sku}
                  </p>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {/* Description */}
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {component.description}
                    </p>

                    {/* Stock Level */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Package className="h-3 w-3" />
                      Stock: {component.stock_level} units
                    </div>

                    {/* Price Display */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{getPriceLabel()}:</span>
                        <span className="text-lg font-bold text-primary">
                          {formatCurrency(component.price)}
                        </span>
                      </div>
                      

                      {/* Show price comparison for demonstration */}
                      {customerType === 'merchant' && component.normal_price !== component.merchant_price && (
                        <div className="text-xs text-muted-foreground">
                          Retail: <span className="line-through">{formatCurrency(component.normal_price)}</span>
                          <span className="ml-2 text-green-600 font-medium">
                            Save {formatCurrency(component.normal_price - component.merchant_price)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Add to Cart Button */}
                    <Button
                      className="w-full"
                      onClick={() => handleAddToCart(component)}
                      disabled={component.stock_level === 0}
                      size="sm"
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      {component.stock_level === 0 ? 'Out of Stock' : 'Add to Cart'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Statistics */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          Showing {filteredComponents.length} of {components.length} components
          {customerType === 'merchant' && (
            <span className="ml-2 font-medium text-blue-600">
              • Viewing wholesale prices
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComponentCatalog;