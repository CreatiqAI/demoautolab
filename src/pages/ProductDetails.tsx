import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ShoppingCart, Package, Minus, Plus, ArrowLeft, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/hooks/useCartDB';
import { useAuth } from '@/hooks/useAuth';
import { usePricing } from '@/hooks/usePricing';
import Header from '@/components/Header';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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

const ProductDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [components, setComponents] = useState<ComponentData[]>([]);
  const [localCart, setLocalCart] = useState<CartItem[]>([]);
  const [selectedImage, setSelectedImage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [viewingComponentImage, setViewingComponentImage] = useState<string | null>(null);
  const [expandedComponent, setExpandedComponent] = useState<string | null>(null);
  const { toast } = useToast();
  const { addToCart, loading: cartLoading } = useCart();
  const { user } = useAuth();
  const { customerType, getDisplayPrice } = usePricing();

  useEffect(() => {
    if (id) {
      fetchProduct();
      fetchProductComponents();
    }
  }, [id]);

  const fetchProduct = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
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
        .eq('id', id)
        .eq('active', true)
        .single();

      if (error) {
        console.error('Error fetching product:', error);
        navigate('/catalog');
        return;
      }

      const productData: Product = {
        ...data,
        product_images: data.product_images_new || [],
      };

      setProduct(productData);
    } catch (error) {
      console.error('Error fetching product:', error);
      navigate('/catalog');
    }
  };

  const fetchProductComponents = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const { data: productComponentData, error: productComponentError } = await supabase
        .from('product_components')
        .select(`
          component_library!inner(
            id, component_sku, name, description, component_type,
            stock_level, normal_price, merchant_price, default_image_url
          )
        `)
        .eq('product_id', id)
        .order('display_order', { ascending: true });

      if (productComponentError) {
        console.error('Error fetching product components:', productComponentError);
        setComponents([]);
        return;
      }

      if (!productComponentData || productComponentData.length === 0) {
        console.log('No components found for product');
        setComponents([]);
        return;
      }

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
    } catch (error: any) {
      console.error('Error fetching components:', error);
      setComponents([]);
    } finally {
      setLoading(false);
    }
  };

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

    setLocalCart([]);
  };

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-3 sm:px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-lg">Loading product...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const primaryImage = product.product_images.find(img => img.is_primary) || product.product_images[0];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Back Button */}
        <div className="mb-4 sm:mb-6">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/catalog')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Catalog
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Product Images - Left Column (2/5 width) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Main Product Image */}
            <div className="aspect-[4/3] bg-gray-50 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
              <img
                src={product.product_images[selectedImage]?.url || primaryImage?.url || '/placeholder.svg'}
                alt={product.product_images[selectedImage]?.alt_text || product.name}
                className="w-full h-full object-contain hover:scale-105 transition-transform duration-300"
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/placeholder.svg';
                }}
              />
            </div>
            
            {/* Thumbnail Images */}
            {product.product_images.length > 1 && (
              <div className="flex gap-3 justify-center lg:justify-start overflow-x-auto pb-2">
                {product.product_images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`w-20 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all duration-200 ${
                      index === selectedImage 
                        ? 'border-primary ring-2 ring-primary/20 scale-105' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <img
                      src={image.url}
                      alt={image.alt_text || `Thumbnail ${index + 1}`}
                      className="w-full h-full object-contain"
                      loading="lazy"
                      decoding="async"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info and Selection - Right Column (3/5 width) */}
          <div className="lg:col-span-3 space-y-8">
            {/* Product Header */}
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 leading-tight mb-4">
                  {product.name}
                </h1>
                
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <Badge variant="default" className="px-3 py-1">
                    ✓ In Stock
                  </Badge>
                  {product.featured && (
                    <Badge variant="secondary" className="px-3 py-1">
                      ⭐ Featured
                    </Badge>
                  )}
                  {product.screen_size && product.screen_size.length > 0 && (
                    product.screen_size.map((size) => (
                      <Badge key={size} variant="outline" className="px-3 py-1">
                        {size}" Display
                      </Badge>
                    ))
                  )}
                </div>
                
                <div className="text-xl text-gray-600 font-medium mb-4">
                  {product.brand} {product.model}
                  {product.year_from && product.year_to && (
                    <span className="text-lg text-gray-500 ml-2">
                      ({product.year_from}-{product.year_to})
                    </span>
                  )}
                </div>
                
                {product.description && (
                  <div className="prose prose-gray max-w-none">
                    <p className="text-gray-700 leading-relaxed">
                      {product.description}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Component Selection */}
            <div className="border-t border-gray-200 pt-8">
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Select Components
                  </h2>
                  <p className="text-gray-600">
                    Choose the components you need and specify quantities
                  </p>
                </div>
                
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="ml-3 text-gray-600">Loading components...</span>
                  </div>
                ) : components.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Components Available</h3>
                    <p className="text-gray-600">This product currently has no available components.</p>
                  </div>
                ) : (
                  /* Expandable Components List */
                  <div className="space-y-2">
                    <div className="text-sm text-gray-600 mb-3">
                      Available Components ({components.length} options)
                    </div>
                    <div className="border rounded-lg divide-y max-h-80 overflow-y-auto">
                      {components.map((component) => {
                        const quantity = getLocalCartQuantity(component.id);
                        const isExpanded = expandedComponent === component.id;
                        
                        return (
                          <div 
                            key={component.id} 
                            className={`bg-white transition-all duration-300 ease-in-out overflow-hidden ${
                              isExpanded ? 'shadow-sm' : ''
                            }`}
                          >
                            <div 
                              className={`p-3 hover:bg-gray-50 cursor-pointer transition-all duration-300 ease-in-out ${
                                isExpanded 
                                  ? 'bg-gray-50 border-l-4 border-l-primary' 
                                  : ''
                              }`}
                              onClick={() => setExpandedComponent(isExpanded ? null : component.id)}
                            >
                              <div className="flex items-start gap-3">
                                {/* Image that grows when expanded */}
                                <div className={`flex-shrink-0 transition-all duration-300 ease-in-out ${
                                  isExpanded ? 'w-20 h-20' : 'w-10 h-10'
                                }`}>
                                  {component.default_image_url && (
                                    <img
                                      src={component.default_image_url}
                                      alt={component.name}
                                      className={`w-full h-full object-cover rounded border transition-all duration-300 ease-in-out ${
                                        isExpanded 
                                          ? 'rounded-lg shadow-sm cursor-pointer hover:opacity-80' 
                                          : 'rounded border'
                                      }`}
                                      loading="lazy"
                                      onClick={(e) => {
                                        if (isExpanded) {
                                          e.stopPropagation();
                                          setViewingComponentImage(component.default_image_url);
                                        }
                                      }}
                                    />
                                  )}
                                </div>
                                
                                {/* Content area */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                      <div className={`font-medium text-gray-900 transition-all duration-300 ease-in-out ${
                                        isExpanded ? 'text-base mb-2' : 'text-sm truncate'
                                      }`}>
                                        {component.name}
                                      </div>
                                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                                        <span className="font-semibold text-gray-700">
                                          {formatPrice(getDisplayPrice(component.normal_price, component.merchant_price))}
                                        </span>
                                        <span>•</span>
                                        <span>{component.stock_level} stock</span>
                                      </div>
                                      
                                      {/* Expanded details */}
                                      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
                                        isExpanded 
                                          ? 'max-h-32 opacity-100 mb-3' 
                                          : 'max-h-0 opacity-0'
                                      }`}>
                                        <div className="text-sm text-gray-700 mb-2">
                                          {component.description || 'No additional description available'}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          Type: {component.component_type}
                                        </div>
                                        {isExpanded && component.default_image_url && (
                                          <div className="text-xs text-blue-600 mt-1">
                                            Click image to enlarge
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    
                                    {/* Controls */}
                                    <div className="flex items-center gap-2 ml-3">
                                      {user && quantity > 0 && (
                                        <div className="flex items-center border rounded text-xs">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              updateLocalQuantity(component, quantity - 1);
                                            }}
                                            disabled={quantity === 0}
                                            className="w-6 h-6 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50"
                                          >
                                            <Minus className="h-3 w-3" />
                                          </button>
                                          <span className="w-6 text-center font-medium">{quantity}</span>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              updateLocalQuantity(component, quantity + 1);
                                            }}
                                            disabled={quantity >= component.stock_level}
                                            className="w-6 h-6 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50"
                                          >
                                            <Plus className="h-3 w-3" />
                                          </button>
                                        </div>
                                      )}
                                      
                                      {user && quantity === 0 && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            updateLocalQuantity(component, 1);
                                          }}
                                          disabled={component.stock_level === 0}
                                          className="text-xs bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1 rounded"
                                        >
                                          Add
                                        </button>
                                      )}
                                      
                                      <div className={`transition-transform duration-300 ease-in-out ${
                                        isExpanded ? 'rotate-180' : 'rotate-0'
                                      }`}>
                                        <ChevronDown className="h-4 w-4 text-gray-400" />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Simple Cart Summary - Shopee Style */}
            {components.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="space-y-4">
                  {localCart.length > 0 ? (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">
                          {getLocalCartTotalQuantity()} item{getLocalCartTotalQuantity() !== 1 ? 's' : ''} selected
                        </span>
                        <span className="text-2xl font-bold text-primary">
                          {formatPrice(getLocalCartTotal())}
                        </span>
                      </div>
                      
                      {!user ? (
                        <Button variant="default" size="lg" asChild className="w-full">
                          <a href="/auth">Sign In to Add Items</a>
                        </Button>
                      ) : (
                        <Button 
                          size="lg"
                          onClick={handleAddToCart}
                          disabled={cartLoading}
                          className="w-full h-12 text-base font-medium"
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          {cartLoading ? 'Adding...' : 'Add to Cart'}
                        </Button>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-2">
                      <p className="text-gray-500 text-sm mb-3">Select components to add to cart</p>
                      <Button 
                        disabled
                        size="lg"
                        className="w-full h-12 text-base font-medium"
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Add to Cart
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Component Image Viewer */}
      {viewingComponentImage && (
        <Dialog open={!!viewingComponentImage} onOpenChange={() => setViewingComponentImage(null)}>
          <DialogContent className="max-w-3xl w-[95vw] max-h-[85vh] overflow-hidden p-3 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">Component Image</DialogTitle>
              <DialogDescription className="text-sm">
                View component image in full size
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center overflow-hidden">
              <img
                src={viewingComponentImage}
                alt="Component"
                className="max-w-full max-h-[60vh] sm:max-h-[70vh] object-contain rounded-lg"
                loading="lazy"
                decoding="async"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ProductDetails;