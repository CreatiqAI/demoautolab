import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '@/hooks/useCartDB';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft } from 'lucide-react';
import Header from '@/components/Header';
import CheckoutModal from '@/components/CheckoutModal';

export default function Cart() {
  const { cartItems, updateQuantity, removeFromCart, getTotalPrice, getTotalItems, clearCart } = useCart();
  const { user } = useAuth();
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const navigate = useNavigate();

  // Redirect unauthenticated users
  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  // Don't render cart if user is not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p>Redirecting to login...</p>
          </div>
        </div>
      </div>
    );
  }

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

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <div className="mb-8">
              <ShoppingBag className="h-24 w-24 mx-auto text-muted-foreground mb-4" />
              <h1 className="text-3xl font-bold mb-4">Your Cart is Empty</h1>
              <p className="text-muted-foreground mb-8">
                Add some automotive parts to your cart to get started!
              </p>
              <Link to="/catalog">
                <Button size="lg">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Browse Catalog
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Shopping Cart</h1>
            <p className="text-muted-foreground">
              {getTotalItems()} item{getTotalItems() !== 1 ? 's' : ''} in your cart
            </p>
          </div>
          <Link to="/catalog">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Continue Shopping
            </Button>
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-4">
                  <CardTitle>Cart Items</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="select-all"
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                    />
                    <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                      Select All
                    </label>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={clearCart}
                  className="text-destructive hover:text-destructive"
                >
                  Clear Cart
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {cartItems.map((item) => (
                    <div key={item.id} className="p-6 flex items-center gap-4">
                      <Checkbox
                        checked={selectedItems.includes(item.id)}
                        onCheckedChange={(checked) => handleItemSelection(item.id, checked as boolean)}
                      />
                      {item.component_image && (
                        <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          <img
                            src={item.component_image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{item.name}</h3>
                        <p className="text-sm text-muted-foreground">{item.component_sku}</p>
                        <p className="text-sm text-muted-foreground">
                          From: {item.product_name}
                        </p>
                        <div className="mt-2">
                          <Badge variant="outline" className="text-xs">
                            {formatPrice(item.normal_price)} each
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-12 text-center border rounded px-2 py-1">
                            {item.quantity}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        <div className="text-right min-w-[100px]">
                          <p className="font-semibold">
                            {formatPrice(item.normal_price * item.quantity)}
                          </p>
                        </div>
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFromCart(item.id)}
                          className="text-destructive hover:text-destructive p-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Selected Items ({selectedItems.length} of {getTotalItems()})</span>
                    <span>{formatPrice(getSelectedTotal())}</span>
                  </div>
                  {hasSelectedItems && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span>Shipping</span>
                        <span className="text-muted-foreground">Calculated at checkout</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Tax</span>
                        <span className="text-muted-foreground">Calculated at checkout</span>
                      </div>
                    </>
                  )}
                </div>
                
                <Separator />
                
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span>{formatPrice(getSelectedTotal())}</span>
                </div>
                
                <Button 
                  className="w-full" 
                  size="lg"
                  disabled={!hasSelectedItems}
                  onClick={() => setShowCheckoutModal(true)}
                >
                  Proceed to Checkout ({selectedItems.length} items)
                </Button>
                
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">
                    Secure checkout powered by Stripe
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      <CheckoutModal 
        isOpen={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
        selectedItems={getSelectedItems()}
        onOrderSuccess={(orderId) => {
          // Clear the cart after successful order
          clearCart();
          // Clear selected items
          setSelectedItems([]);
          // Redirect to My Orders page and pass order ID for expansion
          navigate('/my-orders', { state: { expandOrderId: orderId } });
        }}
      />
    </div>
  );
}