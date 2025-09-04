import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart, Heart, Star, Truck, Shield, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ProductWithDetails, ComponentVariant, ComponentTypeGroup } from '@/types/product-types';

interface ProductAdvancedProps {
  productId: string;
}

export default function ProductAdvanced({ productId }: ProductAdvancedProps) {
  const [product, setProduct] = useState<ProductWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedComponents, setSelectedComponents] = useState<{ [key: string]: string }>({});
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [componentGroups, setComponentGroups] = useState<ComponentTypeGroup[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchProduct();
  }, [productId]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products_new')
        .select(`
          *,
          categories(name),
          product_images_new(*),
          product_component_variants(
            *,
            component_variants(
              *,
              component_variant_images(*)
            )
          ),
          product_variant_combinations(*)
        `)
        .eq('id', productId)
        .eq('active', true)
        .single();

      if (error) throw error;
      
      setProduct(data);

      // Group component variants by type
      const groups: { [key: string]: ComponentVariant[] } = {};
      const defaults: { [key: string]: string } = {};

      data.product_component_variants?.forEach((pcv: any) => {
        const variant = pcv.component_variants;
        if (!groups[variant.component_type]) {
          groups[variant.component_type] = [];
        }
        groups[variant.component_type].push({
          ...variant,
          images: variant.component_variant_images || []
        });

        // Set default selections
        if (pcv.is_default) {
          defaults[variant.component_type] = variant.id;
        }
      });

      // Convert to ComponentTypeGroup array
      const groupArray = Object.entries(groups).map(([type, variants]) => ({
        type: type as any,
        label: type.charAt(0).toUpperCase() + type.slice(1),
        description: `Choose ${type}`,
        variants
      }));

      setComponentGroups(groupArray);
      setSelectedComponents(defaults);

      // Auto-select first component of each type if no default
      const autoSelections = { ...defaults };
      groupArray.forEach(group => {
        if (!autoSelections[group.type] && group.variants.length > 0) {
          autoSelections[group.type] = group.variants[0].id;
        }
      });
      setSelectedComponents(autoSelections);

    } catch (error) {
      console.error('Error fetching product:', error);
      toast({
        title: "Error",
        description: "Failed to load product",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculatePrice = () => {
    if (!product) return 0;
    
    let totalPrice = 0;
    Object.values(selectedComponents).forEach(componentId => {
      const component = componentGroups
        .flatMap(group => group.variants)
        .find(variant => variant.id === componentId);
      
      if (component) {
        totalPrice += component.selling_price;
      }
    });

    return totalPrice;
  };

  const getAvailableStock = () => {
    if (!product) return 0;
    
    const selectedVariants = Object.values(selectedComponents)
      .map(componentId => 
        componentGroups
          .flatMap(group => group.variants)
          .find(variant => variant.id === componentId)
      )
      .filter(Boolean);

    if (selectedVariants.length === 0) return 0;
    
    // Stock is limited by the component with the least stock
    return Math.min(...selectedVariants.map(variant => variant.stock_quantity));
  };

  const getCurrentImage = () => {
    if (!product) return '';

    // Try to get image from selected component variants first
    const selectedVariants = Object.values(selectedComponents)
      .map(componentId => 
        componentGroups
          .flatMap(group => group.variants)
          .find(variant => variant.id === componentId)
      )
      .filter(Boolean);

    // Look for images in selected variants
    for (const variant of selectedVariants) {
      const primaryImage = variant.images.find(img => img.is_primary);
      if (primaryImage) return primaryImage.url;
      if (variant.images.length > 0) return variant.images[0].url;
    }

    // Fallback to product images
    if (product.product_images_new && product.product_images_new.length > 0) {
      return product.product_images_new[selectedImage]?.url || product.product_images_new[0].url;
    }

    return '';
  };

  const getImageGallery = () => {
    if (!product) return [];

    let images: string[] = [];

    // Add product images
    if (product.product_images_new) {
      images = [...images, ...product.product_images_new.map(img => img.url)];
    }

    // Add selected component variant images
    Object.values(selectedComponents).forEach(componentId => {
      const component = componentGroups
        .flatMap(group => group.variants)
        .find(variant => variant.id === componentId);
      
      if (component && component.images) {
        images = [...images, ...component.images.map(img => img.url)];
      }
    });

    // Remove duplicates
    return [...new Set(images)].filter(Boolean);
  };

  const handleComponentChange = (componentType: string, componentId: string) => {
    setSelectedComponents(prev => ({
      ...prev,
      [componentType]: componentId
    }));
    
    // Reset image selection when components change
    setSelectedImage(0);
  };

  const handleAddToCart = async () => {
    if (getAvailableStock() < quantity) {
      toast({
        title: "Insufficient Stock",
        description: "Not enough items available",
        variant: "destructive"
      });
      return;
    }

    try {
      // Here you would add the item to cart
      // For now, just show success message
      toast({
        title: "Added to Cart!",
        description: `${quantity} x ${product?.name} added to your cart`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add to cart",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold">Product not found</h3>
        <p className="text-muted-foreground">The product you're looking for doesn't exist.</p>
      </div>
    );
  }

  const currentPrice = calculatePrice();
  const availableStock = getAvailableStock();
  const imageGallery = getImageGallery();
  const currentImage = getCurrentImage();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Product Images */}
      <div className="space-y-4">
        <div className="aspect-square rounded-lg border overflow-hidden bg-gray-50">
          {currentImage ? (
            <img
              src={currentImage}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              No image available
            </div>
          )}
        </div>
        
        {imageGallery.length > 1 && (
          <div className="grid grid-cols-6 gap-2">
            {imageGallery.map((url, index) => (
              <button
                key={index}
                onClick={() => setSelectedImage(index)}
                className={`aspect-square rounded border overflow-hidden ${
                  selectedImage === index ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <img
                  src={url}
                  alt={`${product.name} ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product Details */}
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            {product.brand && (
              <Badge variant="outline">{product.brand}</Badge>
            )}
            {product.featured && (
              <Badge variant="secondary">Featured</Badge>
            )}
          </div>
          
          <h1 className="text-3xl font-bold">{product.name}</h1>
          
          <div className="flex items-center gap-2 mt-2">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">(4.8) • 124 reviews</span>
          </div>

          <div className="text-3xl font-bold text-green-600 mt-4">
            ${currentPrice.toFixed(2)}
          </div>
        </div>

        {product.description && (
          <div>
            <h3 className="font-semibold mb-2">Description</h3>
            <p className="text-muted-foreground">{product.description}</p>
          </div>
        )}

        {/* Component Variants Selection */}
        {componentGroups.map(group => (
          <div key={group.type}>
            <Label className="text-base font-semibold">
              {group.label} {group.variants.some(v => 
                product.product_component_variants?.find(pcv => 
                  pcv.component_variant_id === v.id && pcv.is_required
                )
              ) && <span className="text-red-500">*</span>}
            </Label>
            <p className="text-sm text-muted-foreground mb-3">{group.description}</p>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {group.variants.map(variant => {
                const isSelected = selectedComponents[group.type] === variant.id;
                const isOutOfStock = variant.stock_quantity <= 0;
                
                return (
                  <button
                    key={variant.id}
                    onClick={() => !isOutOfStock && handleComponentChange(group.type, variant.id)}
                    disabled={isOutOfStock}
                    className={`p-3 text-left border rounded-lg transition-colors ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-50 text-blue-700' 
                        : isOutOfStock
                        ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium text-sm">{variant.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {variant.selling_price > 0 ? `+$${variant.selling_price}` : 'Included'}
                    </div>
                    {isOutOfStock && (
                      <div className="text-xs text-red-500 mt-1">Out of stock</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <Separator />

        {/* Quantity and Stock */}
        <div>
          <Label className="text-base font-semibold">Quantity</Label>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center border rounded">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="px-3 py-2 hover:bg-gray-50"
              >
                -
              </button>
              <span className="px-4 py-2 border-x">{quantity}</span>
              <button
                onClick={() => setQuantity(Math.min(availableStock, quantity + 1))}
                className="px-3 py-2 hover:bg-gray-50"
                disabled={quantity >= availableStock}
              >
                +
              </button>
            </div>
            <div className="text-sm text-muted-foreground">
              {availableStock > 0 ? (
                <span className="text-green-600">{availableStock} available</span>
              ) : (
                <span className="text-red-600">Out of stock</span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={handleAddToCart}
            disabled={availableStock === 0}
            className="w-full h-12"
            size="lg"
          >
            <ShoppingCart className="mr-2 h-5 w-5" />
            {availableStock > 0 ? 'Add to Cart' : 'Out of Stock'}
          </Button>
          
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="lg">
              <Heart className="mr-2 h-4 w-4" />
              Wishlist
            </Button>
            <Button variant="outline" size="lg">
              Buy Now
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 text-center text-sm">
          <div className="flex flex-col items-center gap-1">
            <Truck className="h-5 w-5 text-blue-600" />
            <span>Free Shipping</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <RotateCcw className="h-5 w-5 text-green-600" />
            <span>Easy Returns</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Shield className="h-5 w-5 text-purple-600" />
            <span>Warranty</span>
          </div>
        </div>

        {/* Product Details */}
        {(product.weight_kg || product.dimensions_cm || product.year_from || product.year_to) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Specifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {product.weight_kg && (
                <div className="flex justify-between">
                  <span>Weight:</span>
                  <span>{product.weight_kg} kg</span>
                </div>
              )}
              {product.dimensions_cm && (
                <div className="flex justify-between">
                  <span>Dimensions:</span>
                  <span>{product.dimensions_cm} cm</span>
                </div>
              )}
              {product.year_from && (
                <div className="flex justify-between">
                  <span>Year Range:</span>
                  <span>
                    {product.year_from}
                    {product.year_to && product.year_to !== product.year_from && ` - ${product.year_to}`}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}