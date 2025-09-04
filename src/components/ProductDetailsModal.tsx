import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ShoppingCart, Package, Minus, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/hooks/useCartDB';
import { useAuth } from '@/hooks/useAuth';
import { usePricing } from '@/hooks/usePricing';

interface ComponentData {
  id: string;
  component_sku: string;
  name: string;
  description: string;
  component_type: string;
  stock_level: number;
  normal_price: number;
  merchant_price: number;
  default_image_url?: string;
}

interface CartItem {
  component: ComponentData;
  quantity: number;
}

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
  product_images: Array<{
    url: string;
    alt_text: string;
    is_primary: boolean;
  }>;
}

interface ProductDetailsModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

const ProductDetailsModal = ({ product, isOpen, onClose }: ProductDetailsModalProps) => {
  const [components, setComponents] = useState<ComponentData[]>([]);
  const [localCart, setLocalCart] = useState<CartItem[]>([]);
  const [selectedImage, setSelectedImage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [viewingComponentImage, setViewingComponentImage] = useState<string | null>(null);
  const { toast } = useToast();
  const { addToCart, loading: cartLoading } = useCart();
  const { user } = useAuth();
  const { customerType, getDisplayPrice } = usePricing();

  useEffect(() => {
    if (product && isOpen) {
      fetchProductComponents();
      setLocalCart([]);
      setSelectedImage(0);
    }
  }, [product, isOpen]);

  const fetchProductComponents = async () => {
    if (!product) return;
    
    setLoading(true);
    try {
      // Fetch components that are specifically linked to this product
      const { data: productComponentData, error: productComponentError } = await supabase
        .from('product_components')
        .select(`
          component_library!inner(
            id, component_sku, name, description, component_type,
            stock_level, normal_price, merchant_price, default_image_url
          )
        `)
        .eq('product_id', product.id)
        .order('display_order', { ascending: true });

      if (productComponentError) {
        console.error('Error fetching product components:', productComponentError);
        setComponents([]);
        return;
      }

      if (!productComponentData || productComponentData.length === 0) {
        console.log(`No components found for product: ${product.name}`);
        setComponents([]);
        return;
      }

      // Transform the data to match expected structure
      const transformedComponents = productComponentData.map(pc => {
        const component = pc.component_library;
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

      setComponents(transformedComponents);
      console.log(`✅ Found ${transformedComponents.length} components for product: ${product.name}`);
    } catch (error: any) {
      console.error('Error fetching components:', error);
      setComponents([]);
    } finally {
      setLoading(false);
    }
  };

  if (!product) return null;

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
    }).format(amount);
  };

  const updateLocalQuantity = (component: ComponentData, newQuantity: number) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please sign in to add items to your cart",
        variant: "destructive"
      });
      return;
    }
    
    if (newQuantity < 0) return;
    
    setLocalCart(prevCart => {
      const existingIndex = prevCart.findIndex(item => item.component.id === component.id);
      
      if (newQuantity === 0) {
        return prevCart.filter(item => item.component.id !== component.id);
      }
      
      if (existingIndex >= 0) {
        const newCart = [...prevCart];
        newCart[existingIndex] = { ...newCart[existingIndex], quantity: newQuantity };
        return newCart;
      } else {
        return [...prevCart, { component, quantity: newQuantity }];
      }
    });
  };

  const getLocalCartQuantity = (componentId: string) => {
    const cartItem = localCart.find(item => item.component.id === componentId);
    return cartItem?.quantity || 0;
  };

  const getLocalCartTotal = () => {
    return localCart.reduce((total, item) => {
      const displayPrice = getDisplayPrice(item.component.normal_price, item.component.merchant_price);
      return total + (displayPrice * item.quantity);
    }, 0);
  };

  const getLocalCartTotalQuantity = () => {
    return localCart.reduce((total, item) => total + item.quantity, 0);
  };

  const handleAddToCart = () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please sign in to add items to your cart",
        variant: "destructive"
      });
      return;
    }

    if (localCart.length === 0) {
      toast({
        title: 'Cart Empty',
        description: 'Please select at least one item',
        variant: 'destructive'
      });
      return;
    }

    // Add each item to the global cart
    localCart.forEach(cartItem => {
      const displayPrice = getDisplayPrice(cartItem.component.normal_price, cartItem.component.merchant_price);
      addToCart({
        component_sku: cartItem.component.component_sku,
        name: cartItem.component.name,
        normal_price: displayPrice,
        quantity: cartItem.quantity,
        product_name: product?.name || 'Unknown Product',
        component_image: cartItem.component.default_image_url
      });
    });

    toast({
      title: 'Added to Cart!',
      description: `${getLocalCartTotalQuantity()} item${getLocalCartTotalQuantity() > 1 ? 's' : ''} added to your cart`,
    });

    // Clear local cart and close modal
    setLocalCart([]);
    onClose();
  };

  const primaryImage = product.product_images.find(img => img.is_primary) || product.product_images[0];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-7xl h-[95vh] max-h-[900px] flex flex-col p-3 sm:p-6">
        <DialogHeader className="flex-shrink-0 pb-2">
          <DialogTitle className="text-xl sm:text-2xl line-clamp-1">{product.name}</DialogTitle>
          <DialogDescription className="text-sm">
            {product.brand} {product.model} - View product details and available components
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col lg:grid lg:grid-cols-5 gap-4 flex-1 overflow-hidden">
          {/* Product Images - Responsive sizing */}
          <div className="lg:col-span-2 flex flex-col space-y-3">
            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
              <img
                src={product.product_images[selectedImage]?.url || primaryImage?.url || '/placeholder.svg'}
                alt={product.product_images[selectedImage]?.alt_text || product.name}
                className="max-w-full max-h-full object-contain"
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/placeholder.svg';
                }}
              />
            </div>
            {product.product_images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {product.product_images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-colors flex items-center justify-center ${
                      index === selectedImage ? 'border-primary' : 'border-gray-200'
                    }`}
                  >
                    <img
                      src={image.url}
                      alt={image.alt_text || `Image ${index + 1}`}
                      className="max-w-full max-h-full object-contain"
                      loading="lazy"
                      decoding="async"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info and Components - Better space allocation */}
          <div className="lg:col-span-3 flex flex-col min-h-0">
            {/* Compact Product Header */}
            <div className="flex-shrink-0 space-y-3 pb-3 border-b">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="default">Available</Badge>
                {product.featured && (
                  <Badge variant="secondary">⭐ Featured</Badge>
                )}
                {product.screen_size && product.screen_size.length > 0 && (
                  <>
                    {product.screen_size.map((size) => (
                      <Badge key={size} variant="outline" className="text-xs">
                        {size}" Screen
                      </Badge>
                    ))}
                  </>
                )}
              </div>
              <div>
                <p className="text-sm sm:text-base text-muted-foreground">
                  {product.brand} {product.model}
                  {product.year_from && product.year_to && ` (${product.year_from}-${product.year_to})`}
                </p>
                {product.description && (
                  <p className="text-xs sm:text-sm text-muted-foreground mt-2 line-clamp-2">
                    {product.description}
                  </p>
                )}
              </div>
            </div>

            {/* Cart Summary - More responsive */}
            <div className="flex-shrink-0 bg-blue-50 p-2 sm:p-3 rounded-lg border border-blue-200 my-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                  <span className="text-xs sm:text-sm font-medium">Selected:</span>
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    {getLocalCartTotalQuantity()} item{getLocalCartTotalQuantity() !== 1 ? 's' : ''}
                  </span>
                  {localCart.length > 0 && (
                    <span className="font-medium text-xs sm:text-sm">
                      {formatPrice(getLocalCartTotal())}
                    </span>
                  )}
                </div>
                {!user ? (
                  <Button variant="default" size="sm" asChild className="w-full sm:w-auto">
                    <a href="/auth">Sign In</a>
                  </Button>
                ) : (
                  <Button 
                    size="sm"
                    onClick={handleAddToCart}
                    disabled={localCart.length === 0 || cartLoading}
                    className="w-full sm:w-auto"
                  >
                    <ShoppingCart className="h-3 w-3 mr-1 sm:mr-2" />
                    {cartLoading ? 'Adding...' : 'Add to Cart'}
                  </Button>
                )}
              </div>
            </div>

            {/* Components Section - Optimized */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-shrink-0 mb-3">
                <h3 className="font-medium text-sm sm:text-base mb-1">Available Components</h3>
                <p className="text-xs text-muted-foreground">
                  Select components and quantities
                </p>
              </div>
              
              <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="text-center text-sm">Loading components...</div>
                  </div>
                ) : components.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground">
                    <div className="text-center">
                      <Package className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm">No components available</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {components.map((component) => {
                      const quantity = getLocalCartQuantity(component.id);
                      return (
                        <Card key={component.id} className="p-3">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              {component.default_image_url && (
                                <button
                                  onClick={() => setViewingComponentImage(component.default_image_url!)}
                                  className="w-12 h-12 sm:w-14 sm:h-14 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 hover:ring-2 hover:ring-primary transition-all"
                                  title="Click to view larger image"
                                >
                                  <img
                                    src={component.default_image_url}
                                    alt={component.name}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                    decoding="async"
                                  />
                                </button>
                              )}
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm line-clamp-1">{component.name}</h4>
                                <p className="text-xs text-muted-foreground">{component.component_sku}</p>
                                <p className="text-xs text-muted-foreground">
                                  Stock: {component.stock_level}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0">
                              <div className="text-right">
                                <p className="font-medium text-sm">{formatPrice(getDisplayPrice(component.normal_price, component.merchant_price))}</p>
                                {customerType === 'merchant' && component.normal_price !== component.merchant_price && (
                                  <p className="text-xs text-muted-foreground line-through">
                                    {formatPrice(component.normal_price)}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateLocalQuantity(component, quantity - 1)}
                                  disabled={!user || quantity === 0}
                                  className="h-8 w-8 p-0"
                                  title={!user ? "Please sign in to add items to cart" : ""}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-10 text-center text-sm border rounded px-1 py-1">
                                  {quantity}
                                </span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateLocalQuantity(component, quantity + 1)}
                                  disabled={!user || quantity >= component.stock_level}
                                  className="h-8 w-8 p-0"
                                  title={!user ? "Please sign in to add items to cart" : ""}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Component Image Viewer */}
      {viewingComponentImage && (
        <Dialog open={!!viewingComponentImage} onOpenChange={() => setViewingComponentImage(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Component Image</DialogTitle>
              <DialogDescription>
                View component image in full size
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center">
              <img
                src={viewingComponentImage}
                alt="Component"
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
};

export default ProductDetailsModal;