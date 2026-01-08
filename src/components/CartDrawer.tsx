import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '@/hooks/useCartDB';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Minus, Plus, Trash2, ShoppingBag, X, ArrowRight } from 'lucide-react';
import CheckoutModal from '@/components/CheckoutModal';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { cartItems, updateQuantity, removeFromCart, getTotalPrice, getTotalItems, clearCart } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const navigate = useNavigate();

  // Handle cart clearing after successful payment
  useEffect(() => {
    const shouldClearCart = localStorage.getItem('clearCartAfterPayment');
    if (shouldClearCart === 'true') {
      clearCart();
      localStorage.removeItem('clearCartAfterPayment');
      toast({
        title: "Payment Successful!",
        description: "Your order has been placed. Your cart has been cleared.",
      });
    }
  }, [clearCart, toast]);

  // Select all items by default when cart opens
  useEffect(() => {
    if (isOpen && cartItems.length > 0) {
      setSelectedItems(cartItems.map(item => item.id));
    }
  }, [isOpen, cartItems]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
    }).format(amount);
  };

  const handleItemSelection = (itemId: string, checked: boolean) => {
    setSelectedItems(prev =>
      checked
        ? [...prev, itemId]
        : prev.filter(id => id !== itemId)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedItems(checked ? cartItems.map(item => item.id) : []);
  };

  const getSelectedItems = () => {
    return cartItems.filter(item => selectedItems.includes(item.id));
  };

  const getSelectedTotal = () => {
    return getSelectedItems().reduce((total, item) => total + (item.normal_price * item.quantity), 0);
  };

  const isAllSelected = selectedItems.length === cartItems.length && cartItems.length > 0;
  const hasSelectedItems = selectedItems.length > 0;

  const handleCheckout = () => {
    if (!user) {
      onClose();
      navigate('/auth');
      return;
    }
    setShowCheckoutModal(true);
  };

  const handleItemClick = async (item: any) => {
    try {
      // Look up product by component SKU using product_name stored in cart
      // The product_name in cart is actually the product name from when item was added
      console.log('🔍 Looking for product with name:', item.product_name);

      const { data: products, error } = await supabase
        .from('products_new')
        .select('id, name')
        .ilike('name', `%${item.product_name}%`)
        .limit(1);

      if (error) {
        console.error('Error finding product:', error);
        return;
      }

      if (products && products.length > 0) {
        // Navigate to the product details page
        console.log('✅ Found product:', products[0]);
        onClose();
        navigate(`/product/${products[0].id}`);
      } else {
        console.log('⚠️ No product found for:', item.product_name);
      }
    } catch (error) {
      console.error('Error navigating to product:', error);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-lime-100 rounded-lg flex items-center justify-center">
              <ShoppingBag className="h-4 w-4 text-lime-700" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Shopping Cart</h2>
              <p className="text-xs text-gray-500">{getTotalItems()} items</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Cart Content */}
        {cartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[calc(100%-140px)] px-6">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <ShoppingBag className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-2">Your cart is empty</h3>
            <p className="text-[15px] text-gray-500 text-center mb-6">
              Add some products to get started!
            </p>
            <Button onClick={onClose} asChild>
              <Link to="/catalog">
                Browse Catalog
              </Link>
            </Button>
          </div>
        ) : (
          <>
            {/* Select All */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all-drawer"
                  checked={isAllSelected}
                  onCheckedChange={handleSelectAll}
                />
                <label htmlFor="select-all-drawer" className="text-[13px] font-medium cursor-pointer text-gray-700">
                  Select All ({cartItems.length})
                </label>
              </div>
              <button
                onClick={clearCart}
                className="text-xs text-red-500 hover:text-red-600 font-bold uppercase tracking-wide"
              >
                Clear Cart
              </button>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto h-[calc(100%-280px)]">
              <div className="divide-y divide-gray-100">
                {cartItems.map((item) => (
                  <div key={item.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedItems.includes(item.id)}
                        onCheckedChange={(checked) => handleItemSelection(item.id, checked as boolean)}
                        className="mt-1 flex-shrink-0"
                      />

                      {/* Clickable area - Image and Title */}
                      <div
                        onClick={() => handleItemClick(item)}
                        className="flex items-start gap-3 flex-1 min-w-0 cursor-pointer group/item"
                      >
                        <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 ring-2 ring-transparent group-hover/item:ring-lime-500 transition-all">
                          {item.component_image ? (
                            <img
                              src={item.component_image}
                              alt={item.name}
                              className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ShoppingBag className="h-6 w-6 text-gray-300" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="text-[15px] font-medium text-gray-900 line-clamp-2 mb-1 group-hover/item:text-lime-600 transition-colors">{item.name}</h3>
                          <p className="text-xs text-gray-500 mb-2">{item.component_sku}</p>
                        </div>
                      </div>

                      {/* Action buttons - NOT clickable for navigation */}
                      <div className="flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFromCart(item.id);
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Quantity controls and price - Below the clickable area */}
                    <div className="flex items-center justify-between gap-2 mt-2 ml-[52px]">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 transition-colors"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-9 text-center text-sm font-medium">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <span className="text-[15px] font-bold text-gray-900">
                        {formatPrice(item.normal_price * item.quantity)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer - Order Summary */}
            <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-[15px] text-gray-600">Selected <span className="font-medium text-gray-900">({selectedItems.length} items)</span></span>
                <span className="text-lg font-heading font-bold text-gray-900 italic">{formatPrice(getSelectedTotal())}</span>
              </div>

              <Button
                className="w-full bg-lime-600 hover:bg-lime-700 text-white h-11 font-bold uppercase tracking-wide text-[13px]"
                disabled={!hasSelectedItems}
                onClick={handleCheckout}
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>

              <button
                onClick={onClose}
                className="w-full text-center text-[13px] text-gray-500 hover:text-gray-700 font-medium transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          </>
        )}
      </div>

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
        selectedItems={getSelectedItems()}
        onOrderSuccess={(orderId) => {
          clearCart();
          setSelectedItems([]);
          setShowCheckoutModal(false);
          onClose();
          navigate('/my-orders', { state: { expandOrderId: orderId } });
        }}
      />
    </>
  );
}
