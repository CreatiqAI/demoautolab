import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ShoppingCart, Package, Minus, Plus, ArrowLeft, Eye, ChevronDown, Clock, Users, DollarSign, Wrench, Video, Star, Info, PlayCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/hooks/useCartDB';
import { useAuth } from '@/hooks/useAuth';
import { usePricing } from '@/hooks/usePricing';
import Header from '@/components/Header';
import LoginPromptButton from '@/components/LoginPromptButton';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ReviewsSection } from '@/components/reviews/ReviewsSection';
import { ReviewForm } from '@/components/reviews/ReviewForm';
import { ProductInstallationGuide } from '@/types/product-types';
import { cn } from '@/lib/utils';

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
  const [installationGuide, setInstallationGuide] = useState<ProductInstallationGuide | null>(null);
  const [installationOpen, setInstallationOpen] = useState(false);
  const [reviewsOpen, setReviewsOpen] = useState(true);
  const { toast } = useToast();
  const { addToCart, loading: cartLoading } = useCart();
  const { user } = useAuth();
  const { getDisplayPrice } = usePricing();

  useEffect(() => {
    if (id) {
      fetchProduct();
      fetchProductComponents();
      fetchInstallationGuide();
    }
  }, [id]);

  const fetchInstallationGuide = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('product_installation_guides' as any)
        .select('*')
        .eq('product_id', id)
        .single();

      if (!error && data) {
        setInstallationGuide(data as ProductInstallationGuide);
      }
    } catch (error) {
      // No installation guide for this product - that's fine
    }
  };

  // Helper function to get video embed
  const getVideoEmbed = (url: string) => {
    // YouTube
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
    if (youtubeMatch) {
      return (
        <iframe
          src={`https://www.youtube.com/embed/${youtubeMatch[1]}`}
          className="w-full h-full rounded-lg"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      );
    }

    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      return (
        <iframe
          src={`https://player.vimeo.com/video/${vimeoMatch[1]}`}
          className="w-full h-full rounded-lg"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      );
    }

    // Fallback: Show link button
    return (
      <div className="flex items-center justify-center h-full bg-gray-100 rounded-lg">
        <Button
          onClick={() => window.open(url, '_blank')}
          className="bg-lime-600 hover:bg-lime-700"
        >
          <Video className="h-4 w-4 mr-2" />
          Watch Video
        </Button>
      </div>
    );
  };

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
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            <p className="text-gray-500">Loading product...</p>
          </div>
        </div>
      </div>
    );
  }

  const primaryImage = product.product_images.find(img => img.is_primary) || product.product_images[0];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Breadcrumb / Back */}
        <nav className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/catalog')}
            className="text-gray-600 hover:text-gray-900 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Catalog
          </Button>
        </nav>

        {/* Main Product Section */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            {/* Left: Product Images */}
            <div className="p-6 lg:p-8 bg-gray-50/50">
              {/* Main Image */}
              <div
                className="relative aspect-square rounded-xl overflow-hidden bg-white cursor-pointer group mb-4"
                onClick={() => openLightbox(product.product_images.map(img => img.url), selectedImage)}
              >
                <img
                  src={product.product_images[selectedImage]?.url || primaryImage?.url || '/placeholder.svg'}
                  alt={product.product_images[selectedImage]?.alt_text || product.name}
                  className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/placeholder.svg';
                  }}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
                <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                  <Eye className="h-5 w-5 text-gray-700" />
                </div>
              </div>

              {/* Thumbnails */}
              {product.product_images.length > 1 && (
                <div className="flex gap-2 justify-center">
                  {product.product_images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={cn(
                        "relative w-16 h-16 rounded-lg overflow-hidden border-2 transition-all duration-200",
                        index === selectedImage
                          ? 'border-primary ring-2 ring-primary/20'
                          : 'border-transparent hover:border-gray-300'
                      )}
                    >
                      <img
                        src={image.url}
                        alt={image.alt_text || `View ${index + 1}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Product Info */}
            <div className="p-6 lg:p-8 flex flex-col">
              {/* Product Header */}
              <div className="mb-6">
                {/* Badges */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-0">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    In Stock
                  </Badge>
                  {product.featured && (
                    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-0">
                      <Star className="h-3 w-3 mr-1 fill-current" />
                      Featured
                    </Badge>
                  )}
                </div>

                {/* Title */}
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
                  {product.name}
                </h1>

                {/* Brand/Model/Year */}
                <p className="text-lg text-gray-600 mb-4">
                  {product.brand} {product.model}
                  {product.year_from && product.year_to && (
                    <span className="text-gray-400 ml-2">
                      ({product.year_from}–{product.year_to})
                    </span>
                  )}
                </p>

                {/* Screen Sizes */}
                {product.screen_size && product.screen_size.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {product.screen_size.map((size) => (
                      <Badge key={size} variant="outline" className="text-xs">
                        {size}" Display
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Description */}
              {product.description && (
                <div className="mb-6">
                  <p className="text-gray-600 leading-relaxed">
                    {product.description}
                  </p>
                </div>
              )}

              <Separator className="my-4" />

              {/* Component Selection */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Select Components
                  </h2>
                  <span className="text-sm text-gray-500">
                    {components.length} option{components.length !== 1 ? 's' : ''} available
                  </span>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : components.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-xl">
                    <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No components available</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                    {components.map((component) => {
                      const quantity = getLocalCartQuantity(component.id);
                      const isExpanded = expandedComponent === component.id;
                      const price = getDisplayPrice(component.normal_price, component.merchant_price);

                      return (
                        <div
                          key={component.id}
                          className={cn(
                            "border rounded-xl transition-all duration-200",
                            isExpanded ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300',
                            quantity > 0 && !isExpanded && 'border-primary/50 bg-primary/5'
                          )}
                        >
                          <div
                            className="p-3 cursor-pointer"
                            onClick={() => setExpandedComponent(isExpanded ? null : component.id)}
                          >
                            <div className="flex items-center gap-3">
                              {/* Thumbnail */}
                              {component.default_image_url && (
                                <div className={cn(
                                  "flex-shrink-0 rounded-lg overflow-hidden bg-white border transition-all duration-200",
                                  isExpanded ? 'w-20 h-20' : 'w-12 h-12'
                                )}>
                                  <img
                                    src={component.default_image_url}
                                    alt={component.name}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                    onClick={(e) => {
                                      if (isExpanded) {
                                        e.stopPropagation();
                                        openLightbox([component.default_image_url!], 0);
                                      }
                                    }}
                                  />
                                </div>
                              )}

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <h3 className={cn(
                                      "font-medium text-gray-900 transition-all",
                                      isExpanded ? 'text-base' : 'text-sm truncate'
                                    )}>
                                      {component.name}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="font-semibold text-primary">
                                        {formatPrice(price)}
                                      </span>
                                      <span className="text-xs text-gray-400">•</span>
                                      <span className="text-xs text-gray-500">
                                        {component.stock_level} in stock
                                      </span>
                                    </div>
                                  </div>

                                  {/* Controls */}
                                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                    {user && quantity > 0 ? (
                                      <div className="flex items-center border rounded-lg bg-white">
                                        <button
                                          onClick={() => updateLocalQuantity(component, quantity - 1)}
                                          className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-l-lg transition-colors"
                                        >
                                          <Minus className="h-3 w-3" />
                                        </button>
                                        <span className="w-8 text-center font-medium text-sm">{quantity}</span>
                                        <button
                                          onClick={() => updateLocalQuantity(component, quantity + 1)}
                                          disabled={quantity >= component.stock_level}
                                          className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-r-lg transition-colors disabled:opacity-50"
                                        >
                                          <Plus className="h-3 w-3" />
                                        </button>
                                      </div>
                                    ) : user ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => updateLocalQuantity(component, 1)}
                                        disabled={component.stock_level === 0}
                                        className="h-8"
                                      >
                                        Add
                                      </Button>
                                    ) : (
                                      <LoginPromptButton
                                        variant="outline"
                                        size="sm"
                                        className="h-8"
                                        redirectTo={`/product/${id}`}
                                      >
                                        Login
                                      </LoginPromptButton>
                                    )}

                                    <ChevronDown className={cn(
                                      "h-4 w-4 text-gray-400 transition-transform duration-200",
                                      isExpanded && "rotate-180"
                                    )} />
                                  </div>
                                </div>

                                {/* Expanded Details */}
                                {isExpanded && (
                                  <div className="mt-3 pt-3 border-t border-gray-200">
                                    <p className="text-sm text-gray-600 mb-2">
                                      {component.description}
                                    </p>
                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                      <span>SKU: {component.component_sku}</span>
                                      <span>Type: {component.component_type}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Cart Summary */}
              {components.length > 0 && (
                <div className="mt-6 pt-4 border-t">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm text-gray-500">
                        {localCart.length > 0
                          ? `${getLocalCartTotalQuantity()} item${getLocalCartTotalQuantity() !== 1 ? 's' : ''} selected`
                          : 'No items selected'
                        }
                      </p>
                      {localCart.length > 0 && (
                        <p className="text-2xl font-bold text-gray-900">
                          {formatPrice(getLocalCartTotal())}
                        </p>
                      )}
                    </div>

                    {user ? (
                      <Button
                        size="lg"
                        onClick={handleAddToCart}
                        disabled={cartLoading || localCart.length === 0}
                        className="min-w-[160px]"
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        {cartLoading ? 'Adding...' : 'Add to Cart'}
                      </Button>
                    ) : (
                      <LoginPromptButton
                        size="lg"
                        className="min-w-[160px]"
                        redirectTo={`/product/${id}`}
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Login to Add
                      </LoginPromptButton>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Installation Guide Section */}
        {installationGuide && (
          <div className="mt-6">
            <Collapsible open={installationOpen} onOpenChange={setInstallationOpen}>
              <Card className="overflow-hidden">
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between p-5 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-lime-100 rounded-lg">
                        <Wrench className="h-5 w-5 text-lime-600" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold text-gray-900">Installation Guide</h3>
                        <p className="text-sm text-gray-500">
                          {installationGuide.recommended_time && `${installationGuide.recommended_time}`}
                          {installationGuide.recommended_time && installationGuide.installation_price && ' • '}
                          {installationGuide.installation_price && `${formatPrice(installationGuide.installation_price)} installation fee`}
                        </p>
                      </div>
                    </div>
                    <ChevronDown className={cn(
                      "h-5 w-5 text-gray-400 transition-transform duration-300",
                      installationOpen && "rotate-180"
                    )} />
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="px-5 pb-5 space-y-5">
                    <Separator />

                    {/* Info Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {installationGuide.recommended_time && (
                        <div className="bg-gray-50 rounded-xl p-4">
                          <Clock className="h-5 w-5 text-blue-500 mb-2" />
                          <p className="text-xs text-gray-500 mb-1">Time Required</p>
                          <p className="font-semibold text-gray-900">{installationGuide.recommended_time}</p>
                        </div>
                      )}

                      {installationGuide.workman_power && (
                        <div className="bg-gray-50 rounded-xl p-4">
                          <Users className="h-5 w-5 text-purple-500 mb-2" />
                          <p className="text-xs text-gray-500 mb-1">Workers Needed</p>
                          <p className="font-semibold text-gray-900">
                            {installationGuide.workman_power} {installationGuide.workman_power === 1 ? 'person' : 'people'}
                          </p>
                        </div>
                      )}

                      {installationGuide.installation_price && installationGuide.installation_price > 0 && (
                        <div className="bg-gray-50 rounded-xl p-4">
                          <DollarSign className="h-5 w-5 text-green-500 mb-2" />
                          <p className="text-xs text-gray-500 mb-1">Installation Fee</p>
                          <p className="font-semibold text-lime-600">{formatPrice(installationGuide.installation_price)}</p>
                        </div>
                      )}

                      {installationGuide.difficulty_level && (
                        <div className="bg-gray-50 rounded-xl p-4">
                          <Info className="h-5 w-5 text-orange-500 mb-2" />
                          <p className="text-xs text-gray-500 mb-1">Difficulty</p>
                          <Badge
                            className={cn(
                              "capitalize",
                              installationGuide.difficulty_level === 'easy' && 'bg-green-100 text-green-800 hover:bg-green-100',
                              installationGuide.difficulty_level === 'medium' && 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
                              installationGuide.difficulty_level === 'hard' && 'bg-orange-100 text-orange-800 hover:bg-orange-100',
                              installationGuide.difficulty_level === 'expert' && 'bg-red-100 text-red-800 hover:bg-red-100'
                            )}
                          >
                            {installationGuide.difficulty_level}
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Installation Videos */}
                    {installationGuide.installation_videos && installationGuide.installation_videos.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <PlayCircle className="h-4 w-4 text-gray-500" />
                          <h4 className="font-medium text-gray-900">Installation Videos</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {installationGuide.installation_videos.map((video, index) => (
                            <div key={index} className="rounded-xl overflow-hidden border">
                              <div className="aspect-video bg-gray-100">
                                {getVideoEmbed(video.url)}
                              </div>
                              {(video.title || video.duration) && (
                                <div className="p-3 bg-white">
                                  {video.title && <p className="font-medium text-sm">{video.title}</p>}
                                  {video.duration && (
                                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                      <Clock className="h-3 w-3" />
                                      {video.duration}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {installationGuide.notes && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                        <h4 className="font-medium text-amber-900 mb-2 flex items-center gap-2">
                          <Info className="h-4 w-4" />
                          Installation Notes
                        </h4>
                        <p className="text-sm text-amber-800">{installationGuide.notes}</p>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </div>
        )}

        {/* Reviews Section */}
        <div className="mt-6">
          <Collapsible open={reviewsOpen} onOpenChange={setReviewsOpen}>
            <Card className="overflow-hidden">
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between p-5 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <Star className="h-5 w-5 text-amber-600" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900">Customer Reviews</h3>
                      <p className="text-sm text-gray-500">See what others are saying about this product</p>
                    </div>
                  </div>
                  <ChevronDown className={cn(
                    "h-5 w-5 text-gray-400 transition-transform duration-300",
                    reviewsOpen && "rotate-180"
                  )} />
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="px-5 pb-5">
                  <Separator className="mb-5" />
                  {showReviewForm ? (
                    <ReviewForm
                      productId={product.id}
                      onSuccess={() => {
                        setShowReviewForm(false);
                      }}
                      onCancel={() => setShowReviewForm(false)}
                    />
                  ) : (
                    <ReviewsSection
                      productId={product.id}
                      onWriteReview={() => setShowReviewForm(true)}
                    />
                  )}
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>
      </div>

      {/* Image Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={closeLightbox}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-auto h-auto p-0 border-0 bg-transparent">
          <div className="relative flex items-center justify-center">
            {lightboxImages[currentLightboxIndex] && (
              <>
                <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
                  <img
                    src={lightboxImages[currentLightboxIndex]}
                    alt="Product image"
                    className="max-w-[90vw] max-h-[85vh] w-auto h-auto object-contain"
                  />
                </div>

                {/* Navigation */}
                {lightboxImages.length > 1 && (
                  <>
                    <button
                      onClick={() => navigateLightbox("prev")}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/95 hover:bg-white text-gray-800 rounded-full p-3 transition-all shadow-lg hover:scale-110"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                      </svg>
                    </button>
                    <button
                      onClick={() => navigateLightbox("next")}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/95 hover:bg-white text-gray-800 rounded-full p-3 transition-all shadow-lg hover:scale-110"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </button>

                    {/* Counter */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm font-medium">
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
