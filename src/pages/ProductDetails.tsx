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
import LoginPromptButton from '@/components/LoginPromptButton';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ReviewsSection } from '@/components/reviews/ReviewsSection';
import { ReviewForm } from '@/components/reviews/ReviewForm';

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
  const [expandedComponent, setExpandedComponent] = useState<string | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [currentLightboxIndex, setCurrentLightboxIndex] = useState(0);
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
        .from('products_new' as any)
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
        ...(data as any),
        product_images: (data as any).product_images_new || [],
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
        .from('product_components' as any)
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

      const transformedComponents = (productComponentData as any).map((pc: any) => {
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

  const openLightbox = (images: string[], startIndex: number) => {
    setLightboxImages(images);
    setCurrentLightboxIndex(startIndex);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    setLightboxImages([]);
    setCurrentLightboxIndex(0);
  };

  const navigateLightbox = (direction: "prev" | "next") => {
    const newIndex = direction === "prev"
      ? (currentLightboxIndex - 1 + lightboxImages.length) % lightboxImages.length
      : (currentLightboxIndex + 1) % lightboxImages.length;
    setCurrentLightboxIndex(newIndex);
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

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6 lg:gap-8 xl:gap-12">
          {/* Product Images - Left Column (2/5 width) */}
          <div className="lg:col-span-2 space-y-3 sm:space-y-4">
            {/* Main Product Image */}
            <div className="relative rounded-xl overflow-hidden shadow-sm cursor-pointer group"
                 onClick={() => openLightbox(product.product_images.map(img => img.url), selectedImage)}>
              <img
                src={product.product_images[selectedImage]?.url || primaryImage?.url || '/placeholder.svg'}
                alt={product.product_images[selectedImage]?.alt_text || product.name}
                className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/placeholder.svg';
                }}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 rounded-full p-2">
                  <Eye className="h-5 w-5 text-gray-800" />
                </div>
              </div>
            </div>
            
            {/* Thumbnail Images */}
            {product.product_images.length > 1 && (
              <div className="flex gap-2 sm:gap-3 justify-center lg:justify-start overflow-x-auto pb-2">
                {product.product_images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`relative rounded-lg overflow-hidden flex-shrink-0 transition-all duration-200 ${
                      index === selectedImage 
                        ? 'ring-2 ring-primary scale-105' 
                        : 'hover:scale-102'
                    }`}
                  >
                    <img
                      src={image.url}
                      alt={image.alt_text || `Thumbnail ${index + 1}`}
                      className="w-12 sm:w-16 h-auto object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info and Selection - Right Column (3/5 width) */}
          <div className="lg:col-span-3 space-y-4 sm:space-y-6 lg:space-y-8">
            {/* Product Header */}
            <div className="space-y-4 sm:space-y-6">
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-gray-900 leading-tight mb-3 sm:mb-4">
                  {product.name}
                </h1>
                
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <Badge variant="default" className="px-2 sm:px-3 py-1 text-xs">
                    ✓ In Stock
                  </Badge>
                  {product.featured && (
                    <Badge variant="secondary" className="px-2 sm:px-3 py-1 text-xs">
                      ⭐ Featured
                    </Badge>
                  )}
                  {product.screen_size && product.screen_size.length > 0 && (
                    product.screen_size.slice(0, 2).map((size) => (
                      <Badge key={size} variant="outline" className="px-2 sm:px-3 py-1 text-xs">
                        {size}" Display
                      </Badge>
                    ))
                  )}
                  {product.screen_size && product.screen_size.length > 2 && (
                    <Badge variant="outline" className="px-2 sm:px-3 py-1 text-xs">
                      +{product.screen_size.length - 2}
                    </Badge>
                  )}
                </div>
                
                <div className="text-lg sm:text-xl text-gray-600 font-medium mb-3 sm:mb-4">
                  {product.brand} {product.model}
                  {product.year_from && product.year_to && (
                    <span className="text-base sm:text-lg text-gray-500 ml-1 sm:ml-2 block sm:inline">
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
            <div className="border-t border-gray-200 pt-4 sm:pt-6 lg:pt-8">
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-2">
                    Select Components
                  </h2>
                  <p className="text-sm sm:text-base text-gray-600">
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
                    <div className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3">
                      Available Components ({components.length} options)
                    </div>
                    <div className="border rounded-lg divide-y max-h-64 sm:max-h-80 overflow-y-auto">
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
                              className={`p-2 sm:p-3 hover:bg-gray-50 cursor-pointer transition-all duration-300 ease-in-out ${
                                isExpanded 
                                  ? 'bg-gray-50 border-l-4 border-l-primary' 
                                  : ''
                              }`}
                              onClick={() => setExpandedComponent(isExpanded ? null : component.id)}
                            >
                              <div className="flex items-start gap-2 sm:gap-3">
                                {/* Image that grows when expanded */}
                                <div className={`flex-shrink-0 transition-all duration-300 ease-in-out ${
                                  isExpanded ? 'w-16 sm:w-20 h-16 sm:h-20' : 'w-8 sm:w-10 h-8 sm:h-10'
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
                                          openLightbox([component.default_image_url!], 0);
                                        }
                                      }}
                                    />
                                  )}
                                </div>
                                
                                {/* Content area */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                      {!isExpanded ? (
                                        <div className="font-medium text-xs sm:text-sm text-gray-900 truncate">
                                          {component.name}
                                        </div>
                                      ) : (
                                        <div className="font-medium text-sm sm:text-base text-gray-900 mb-2">
                                          {component.name}
                                        </div>
                                      )}
                                      
                                      <div className="flex items-center gap-1 sm:gap-2 text-xs text-gray-500 mb-1 sm:mb-2">
                                        <span className="font-semibold text-gray-700">
                                          {formatPrice(getDisplayPrice(component.normal_price, component.merchant_price))}
                                        </span>
                                        <span>•</span>
                                        <span>{component.stock_level} stock</span>
                                      </div>
                                      
                                      {/* Expanded details */}
                                      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
                                        isExpanded 
                                          ? 'max-h-32 opacity-100 mb-2 sm:mb-3' 
                                          : 'max-h-0 opacity-0'
                                      }`}>
                                        <div className="text-xs sm:text-sm text-gray-700 mb-1 sm:mb-2">
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
                                    <div className="flex items-center gap-1 sm:gap-2 ml-2 sm:ml-3">
                                      {user && quantity > 0 && (
                                        <div className="flex items-center border rounded text-xs">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              updateLocalQuantity(component, quantity - 1);
                                            }}
                                            disabled={quantity === 0}
                                            className="w-5 sm:w-6 h-5 sm:h-6 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50"
                                          >
                                            <Minus className="h-2 w-2 sm:h-3 sm:w-3" />
                                          </button>
                                          <span className="w-5 sm:w-6 text-center font-medium text-xs">{quantity}</span>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              updateLocalQuantity(component, quantity + 1);
                                            }}
                                            disabled={quantity >= component.stock_level}
                                            className="w-5 sm:w-6 h-5 sm:h-6 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50"
                                          >
                                            <Plus className="h-2 w-2 sm:h-3 sm:w-3" />
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
                                          className="text-xs bg-primary text-primary-foreground hover:bg-primary/90 px-2 sm:px-3 py-1 rounded"
                                        >
                                          Add
                                        </button>
                                      )}
                                      
                                      {!user && (
                                        <div onClick={(e) => e.stopPropagation()}>
                                          <LoginPromptButton
                                            variant="default"
                                            size="sm"
                                            className="text-xs px-2 sm:px-3 py-1 h-auto"
                                            redirectTo={`/product/${id}`}
                                          >
                                            Login
                                          </LoginPromptButton>
                                        </div>
                                      )}
                                      
                                      <div className={`transition-transform duration-300 ease-in-out ${
                                        isExpanded ? 'rotate-180' : 'rotate-0'
                                      }`}>
                                        <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
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

            {/* Compact Cart Summary */}
            {components.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                {localCart.length > 0 ? (
                  <>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm text-gray-600">
                        {getLocalCartTotalQuantity()} item{getLocalCartTotalQuantity() !== 1 ? 's' : ''} selected
                      </span>
                      <span className="text-lg font-bold text-primary">
                        {formatPrice(getLocalCartTotal())}
                      </span>
                    </div>
                    
                    {!user ? (
                      <LoginPromptButton 
                        variant="default" 
                        size="sm" 
                        className="w-full h-9"
                        redirectTo={`/product/${id}`}
                      >
                        <ShoppingCart className="h-3 w-3 mr-2" />
                        Login to Add Items
                      </LoginPromptButton>
                    ) : (
                      <Button 
                        size="sm"
                        onClick={handleAddToCart}
                        disabled={cartLoading}
                        className="w-full h-9 text-sm font-medium"
                      >
                        <ShoppingCart className="h-3 w-3 mr-2" />
                        {cartLoading ? 'Adding...' : 'Add to Cart'}
                      </Button>
                    )}
                  </>
                ) : (
                  <div className="text-center">
                    <p className="text-gray-500 text-xs mb-2">Select components to add to cart</p>
                    {!user ? (
                      <LoginPromptButton 
                        variant="default" 
                        size="sm" 
                        className="w-full h-9"
                        redirectTo={`/product/${id}`}
                      >
                        <ShoppingCart className="h-3 w-3 mr-2" />
                        Login to Add Items
                      </LoginPromptButton>
                    ) : (
                      <Button 
                        disabled
                        size="sm"
                        className="w-full h-9 text-sm font-medium"
                      >
                        <ShoppingCart className="h-3 w-3 mr-2" />
                        Add to Cart
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-12 border-t pt-8">
          {showReviewForm ? (
            <div className="max-w-3xl mx-auto">
              <ReviewForm
                productId={product?.id || ''}
                onSuccess={() => {
                  setShowReviewForm(false);
                  // Reviews will be refreshed automatically by the ReviewsSection component
                }}
                onCancel={() => setShowReviewForm(false)}
              />
            </div>
          ) : (
            <div className="max-w-5xl mx-auto">
              <ReviewsSection
                productId={product?.id || ''}
                onWriteReview={() => setShowReviewForm(true)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Image Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={closeLightbox}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-auto h-auto p-0 border-0">
          <div className="relative w-full h-full bg-black rounded-lg overflow-hidden flex items-center justify-center min-h-[400px]">
            {lightboxImages[currentLightboxIndex] && (
              <>
                <img
                  src={lightboxImages[currentLightboxIndex]}
                  alt="Product image"
                  className="max-w-full max-h-[95vh] w-auto h-auto object-contain"
                />

                {/* Navigation Buttons */}
                {lightboxImages.length > 1 && (
                  <>
                    <button
                      onClick={() => navigateLightbox("prev")}
                      className="absolute -left-16 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-3 transition-all shadow-lg hover:scale-110"
                      aria-label="Previous image"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2.5}
                        stroke="currentColor"
                        className="w-6 h-6"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                      </svg>
                    </button>
                    <button
                      onClick={() => navigateLightbox("next")}
                      className="absolute -right-16 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-3 transition-all shadow-lg hover:scale-110"
                      aria-label="Next image"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2.5}
                        stroke="currentColor"
                        className="w-6 h-6"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </button>

                    {/* Image Counter */}
                    <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 bg-white/90 text-gray-800 px-4 py-2 rounded-full text-sm font-medium shadow-lg">
                      {currentLightboxIndex + 1} / {lightboxImages.length}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductDetails;