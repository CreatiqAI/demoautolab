import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

  const isMerchant = userRole === 'merchant';
  const price = isMerchant ? product.price_merchant : product.price_regular;
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
    <div className="group flex flex-col bg-white rounded-2xl p-4 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 border border-gray-100 hover:border-lime-100 card-lift">
      {/* Merchant Badge */}
      {isMerchant && product.price_merchant < product.price_regular && (
        <div className="absolute top-4 left-4 z-10 bg-gray-900/90 backdrop-blur-md text-white text-[9px] font-bold px-3 py-1.5 uppercase tracking-wider rounded-full shadow-lg border border-gray-700">
          Merchant Price
        </div>
      )}

      {/* Image Container */}
      <div className="relative w-full aspect-square overflow-hidden bg-gray-50 rounded-xl mb-4 group-hover:bg-white transition-colors">
        {/* Shine Effect */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 z-10 bg-gradient-to-tr from-white/0 via-white/40 to-white/0 transform -translate-x-full group-hover:translate-x-full" style={{ transition: 'transform 0.7s ease-in-out, opacity 0.3s' }}></div>

        <img
          src={imageUrl}
          alt={product.name}
          className="w-full h-full object-contain p-4 transition-transform duration-700 ease-out group-hover:scale-110 mix-blend-multiply"
          loading="lazy"
          decoding="async"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = '/placeholder.svg';
          }}
        />

        {/* Hover Actions */}
        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-2">
          <Button
            size="sm"
            className="bg-white text-gray-900 hover:bg-lime-600 hover:text-white shadow-lg"
            asChild
          >
            <Link to={`/product/${product.slug}`}>
              <Eye className="h-4 w-4 mr-1" />
              View
            </Link>
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className={`bg-white shadow-lg ${isWishlisted ? 'text-red-500' : 'text-gray-600'} hover:text-red-500`}
            onClick={() => setIsWishlisted(!isWishlisted)}
          >
            <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-current' : ''}`} />
          </Button>
        </div>

        {/* Stock Badge */}
        <div className="absolute top-3 right-3">
          <Badge
            variant={stockStatus.variant}
            className="text-[10px] font-bold uppercase tracking-wide"
          >
            <Package className="h-3 w-3 mr-1" />
            {stockStatus.label}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col items-center gap-2 px-2 text-center flex-grow">
        {/* Brand */}
        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
          {product.brand}
        </p>

        {/* Product Name */}
        <Link to={`/product/${product.slug}`} className="w-full">
          <h3 className="text-sm md:text-base font-bold text-gray-900 group-hover:text-lime-600 transition-colors uppercase leading-tight min-h-[2.5em] flex items-center justify-center line-clamp-2">
            {product.name}
          </h3>
        </Link>

        {/* Rating */}
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className="h-3 w-3 fill-lime-500 text-lime-500"
            />
          ))}
          <span className="text-xs text-gray-400 ml-1">(4.8)</span>
        </div>

        {/* Price */}
        <div className="mt-2 flex flex-col items-center">
          <span className={`text-xl font-bold ${isMerchant ? 'text-gray-900' : 'text-lime-600'} drop-shadow-sm`}>
            {formatPrice(price)}
          </span>
          {isMerchant && product.price_merchant < product.price_regular && (
            <span className="text-xs text-gray-400 line-through decoration-red-300">
              Retail: {formatPrice(product.price_regular)}
            </span>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <Button
          variant={stockStatus.available ? "default" : "secondary"}
          size="sm"
          disabled={!stockStatus.available}
          onClick={() => onAddToCart?.(product.id)}
          className={`w-full ${stockStatus.available ? 'bg-lime-600 hover:bg-lime-700 text-white shadow-lime-glow btn-liquid' : ''}`}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          {stockStatus.available ? 'Add to Cart' : 'Unavailable'}
        </Button>
      </div>
    </div>
  );
};

export default ProductCard;
