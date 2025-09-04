import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
      // Collect all possible components from different matching strategies
      let allMatchedComponents: any[] = [];
      
      // Strategy 1: Try to find components related to this product by name matching
      try {
          const { data: nameMatchData, error: nameMatchError } = await supabase
            .from('component_library')
            .select('*')
            .eq('is_active', true)
            .or(`name.ilike.%${product.name}%,description.ilike.%${product.name}%,component_value.ilike.%${product.name}%`);

          if (!nameMatchError && nameMatchData && nameMatchData.length > 0) {
            allMatchedComponents.push(...nameMatchData);
            console.log(`Found ${nameMatchData.length} components by product name matching`);
          }
        } catch (e) {
          console.warn('Product name matching failed:', e);
        }

      // Strategy 2: Try to find components that match product brand/model
      try {
          const searchTerm = `${product.brand} ${product.model}`.trim();
          if (searchTerm.length > 3) {
            const { data: brandModelData, error: brandModelError } = await supabase
              .from('component_library')
              .select('*')
              .eq('is_active', true)
              .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,component_value.ilike.%${searchTerm}%`);

            if (!brandModelError && brandModelData && brandModelData.length > 0) {
              allMatchedComponents.push(...brandModelData);
              console.log(`Found ${brandModelData.length} components by brand/model matching`);
            }
          }
        } catch (e) {
          console.warn('Brand/model matching failed:', e);
        }

      // Strategy 3: Try broader brand matching
      try {
          if (product.brand && product.brand.length > 2) {
            const { data: brandData, error: brandError } = await supabase
              .from('component_library')
              .select('*')
              .eq('is_active', true)
              .or(`name.ilike.%${product.brand}%,description.ilike.%${product.brand}%,component_value.ilike.%${product.brand}%`);

            if (!brandError && brandData && brandData.length > 0) {
              allMatchedComponents.push(...brandData);
              console.log(`Found ${brandData.length} components by brand matching`);
            }
          }
        } catch (e) {
          console.warn('Brand matching failed:', e);
        }

      // Strategy 4: If we have less than 2 components, get more general components
      if (allMatchedComponents.length < 2) {
        try {
            const { data: moreData, error: moreError } = await supabase
              .from('component_library')
              .select('*')
              .eq('is_active', true)
              .order('created_at', { ascending: false })
              .limit(10);

            if (!moreError && moreData) {
              allMatchedComponents.push(...moreData);
              console.log(`Found ${moreData.length} additional components to reach target count`);
            }
        } catch (e) {
          console.warn('Additional components query failed:', e);
        }
      }

      // Remove duplicates based on component ID
      const uniqueComponents = allMatchedComponents.filter((comp, index, self) => 
        index === self.findIndex(c => c.id === comp.id)
      );
      
      const componentsData = uniqueComponents;
      console.log(`Total unique components found: ${componentsData.length}`);

      // Transform the data to match expected structure
      const transformedComponents = componentsData.map(comp => ({
        id: comp.id,
        component_sku: comp.component_sku || comp.sku || `COMP-${comp.id?.slice(0, 8)}`,
        name: comp.name || 'Component',
        description: comp.description || 'Product component',
        component_type: comp.component_type || 'part',
        stock_level: comp.stock_level || 0,
        normal_price: comp.normal_price || 0,
        merchant_price: comp.merchant_price || 0,
        default_image_url: comp.default_image_url || null
      }));

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
      description: `${localCart.length} item${localCart.length > 1 ? 's' : ''} added to your cart`,
    });

    // Clear local cart and close modal
    setLocalCart([]);
    onClose();
  };

  const primaryImage = product.product_images.find(img => img.is_primary) || product.product_images[0];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{product.name}</DialogTitle>
          <DialogDescription>
            {product.brand} {product.model} - View product details and available components
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid md:grid-cols-2 gap-8">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
              <img
                src={product.product_images[selectedImage]?.url || primaryImage?.url || '/placeholder.svg'}
                alt={product.product_images[selectedImage]?.alt_text || product.name}
                className="max-w-full max-h-full object-contain"
              />
            </div>
            {product.product_images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {product.product_images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-colors flex items-center justify-center ${
                      index === selectedImage ? 'border-primary' : 'border-gray-200'
                    }`}
                  >
                    <img
                      src={image.url}
                      alt={image.alt_text || `Image ${index + 1}`}
                      className="max-w-full max-h-full object-contain"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="default">Available</Badge>
                {product.featured && (
                  <Badge variant="secondary">⭐ Featured</Badge>
                )}
              </div>
              <p className="text-lg text-muted-foreground">
                {product.brand} {product.model}
                {product.year_from && product.year_to && ` (${product.year_from}-${product.year_to})`}
              </p>
              {product.screen_size && product.screen_size.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {product.screen_size.map((size) => (
                    <Badge key={size} variant="outline">
                      {size}" Screen
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {product.description && (
              <div>
                <h3 className="font-medium mb-2">Description</h3>
                <p className="text-muted-foreground">{product.description}</p>
              </div>
            )}

            {/* Available Components */}
            <div>
              <h3 className="font-medium mb-4">Available Components</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Select the components you want and specify quantities
              </p>
              {loading ? (
                <div className="text-center py-8">Loading components...</div>
              ) : components.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-2" />
                  <p>No components available for this product</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-80 overflow-y-auto">
                  {components.map((component) => {
                    const quantity = getLocalCartQuantity(component.id);
                    return (
                      <Card key={component.id} className="p-4">
                        <div className="flex items-center gap-4">
                          {component.default_image_url && (
                            <button
                              onClick={() => setViewingComponentImage(component.default_image_url!)}
                              className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 hover:ring-2 hover:ring-primary transition-all"
                              title="Click to view larger image"
                            >
                              <img
                                src={component.default_image_url}
                                alt={component.name}
                                className="w-full h-full object-cover"
                              />
                            </button>
                          )}
                          <div className="flex-1">
                            <h4 className="font-medium">{component.name}</h4>
                            <p className="text-sm text-muted-foreground">{component.component_sku}</p>
                            {component.description && (
                              <p className="text-sm text-muted-foreground mt-1">{component.description}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              Stock: {component.stock_level} available
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="font-medium">{formatPrice(getDisplayPrice(component.normal_price, component.merchant_price))}</p>
                              {customerType === 'merchant' && component.normal_price !== component.merchant_price && (
                                <p className="text-xs text-muted-foreground line-through">
                                  {formatPrice(component.normal_price)}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateLocalQuantity(component, quantity - 1)}
                                disabled={!user || quantity === 0}
                                title={!user ? "Please sign in to add items to cart" : ""}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-12 text-center border rounded px-2 py-1">
                                {quantity}
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateLocalQuantity(component, quantity + 1)}
                                disabled={!user || quantity >= component.stock_level}
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

            {/* Cart Summary */}
            <div className="bg-blue-50 p-4 rounded-lg space-y-4">
              <h4 className="font-medium">Items Selected</h4>
              {localCart.length === 0 ? (
                <p className="text-sm text-muted-foreground">No items selected</p>
              ) : (
                <div className="space-y-2">
                  {localCart.map((item, index) => {
                    const displayPrice = getDisplayPrice(item.component.normal_price, item.component.merchant_price);
                    return (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{item.component.name} × {item.quantity}</span>
                        <span>{formatPrice(displayPrice * item.quantity)}</span>
                      </div>
                    );
                  })}
                  <div className="border-t pt-2 flex justify-between font-medium">
                    <span>Total:</span>
                    <span>{formatPrice(getLocalCartTotal())}</span>
                  </div>
                </div>
              )}
              {!user ? (
                <div className="space-y-3">
                  <div className="text-center p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-700 mb-2">Please sign in to add items to cart</p>
                    <Button variant="default" asChild className="w-full">
                      <a href="/auth">Sign In / Register</a>
                    </Button>
                  </div>
                </div>
              ) : (
                <Button 
                  className="w-full" 
                  onClick={handleAddToCart}
                  disabled={localCart.length === 0 || cartLoading}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  {cartLoading ? 'Adding...' : 'Add to Cart'}
                </Button>
              )}
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