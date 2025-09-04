import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { 
  ShoppingCart, 
  Star, 
  Eye, 
  Heart,
  Package
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface Product {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description: string;
  brand: string;
  price_regular: number;
  price_merchant: number;
  stock_on_hand: number;
  images?: Array<{ url: string; alt_text: string }>;
}

interface ProductCardProps {
  product: Product;
  userRole?: 'customer' | 'merchant' | 'staff' | 'admin';
  onAddToCart?: (productId: string) => void;
}

const ProductCard = ({ product, userRole = 'customer', onAddToCart }: ProductCardProps) => {
  const [isWishlisted, setIsWishlisted] = useState(false);
  
  const price = userRole === 'merchant' ? product.price_merchant : product.price_regular;
  const imageUrl = product.images?.[0]?.url || '/placeholder.svg';
  
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('ms-MY', {
      style: 'currency',
      currency: 'MYR'
    }).format(amount);
  };

  const getStockStatus = () => {
    if (product.stock_on_hand === 0) {
      return { label: 'Out of Stock', variant: 'destructive' as const, available: false };
    } else if (product.stock_on_hand <= 5) {
      return { label: 'Low Stock', variant: 'warning' as const, available: true };
    } else if (product.stock_on_hand <= 10) {
      return { label: 'Limited Stock', variant: 'secondary' as const, available: true };
    } else {
      return { label: 'In Stock', variant: 'success' as const, available: true };
    }
  };

  const stockStatus = getStockStatus();

  return (
    <Card className="group overflow-hidden bg-gradient-card border-card-border hover:shadow-premium transition-spring">
      <div className="relative">
        {/* Product Image */}
        <div className="aspect-square overflow-hidden bg-muted">
          <img 
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-smooth"
            loading="lazy"
            decoding="async"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/placeholder.svg';
            }}
          />
        </div>
        
        {/* Overlay Actions */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-smooth flex items-center justify-center gap-2">
          <Button size="sm" variant="secondary" asChild>
            <Link to={`/product/${product.slug}`}>
              <Eye className="h-4 w-4" />
              Quick View
            </Link>
          </Button>
          <Button 
            size="sm" 
            variant={isWishlisted ? "destructive" : "secondary"}
            onClick={() => setIsWishlisted(!isWishlisted)}
          >
            <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-current' : ''}`} />
          </Button>
        </div>

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          <Badge 
            variant={stockStatus.variant}
            className="text-xs font-medium"
          >
            <Package className="h-3 w-3 mr-1" />
            {stockStatus.label}
          </Badge>
        </div>
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Brand & SKU */}
        <div className="flex items-center justify-between text-sm">
          <Badge variant="outline" className="text-xs">
            {product.brand}
          </Badge>
          <span className="text-muted-foreground">SKU: {product.sku}</span>
        </div>

        {/* Product Name */}
        <Link to={`/product/${product.slug}`}>
          <h3 className="font-semibold text-card-foreground group-hover:text-primary transition-fast line-clamp-2">
            {product.name}
          </h3>
        </Link>

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2">
          {product.description}
        </p>

        {/* Rating */}
        <div className="flex items-center gap-1">
          <div className="flex">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star 
                key={star} 
                className="h-4 w-4 fill-warning text-warning" 
              />
            ))}
          </div>
          <span className="text-sm text-muted-foreground ml-1">(4.8)</span>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0 flex items-center justify-between">
        {/* Price */}
        <div className="flex flex-col">
          <span className="text-lg font-bold text-primary">
            {formatPrice(price)}
          </span>
        </div>

        {/* Add to Cart Button */}
        <Button 
          variant={stockStatus.available ? "hero" : "secondary"}
          size="sm"
          disabled={!stockStatus.available}
          onClick={() => onAddToCart?.(product.id)}
          className="flex items-center gap-2"
        >
          <ShoppingCart className="h-4 w-4" />
          {stockStatus.available ? 'Add to Cart' : 'Unavailable'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ProductCard;