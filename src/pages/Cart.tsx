import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '@/hooks/useCartDB';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft, Store, Building2 } from 'lucide-react';
import Header from '@/components/Header';
import CheckoutModal from '@/components/CheckoutModal';
import { groupCartItemsBySeller } from '@/lib/cartGrouping';
import { transformImage } from '@/lib/imageTransform';

export default function Cart() {
  const { cartItems, updateQuantity, removeFromCart, getTotalItems, clearCart } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const navigate = useNavigate();

  // Redirect unauthenticated users
  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

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

  // Group items by seller for the Shopee-style layout
  const sellerGroups = useMemo(() => groupCartItemsBySeller(cartItems), [cartItems]);

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

  // Free (FOC) gifts follow their main item: a free line is selected iff a paid
  // item from the same product is selected. This keeps a gift bundled with its
  // purchase and drops it when the main item is unchecked. Free items' checkboxes
  // are disabled in the UI, so their selection is always derived here.
  const reconcileFreeSelection = (ids: string[]): string[] => {
    const idSet = new Set(ids);
    const paidSelectedProducts = new Set(
      cartItems.filter(i => i.normal_price > 0 && idSet.has(i.id)).map(i => i.product_name)
    );
    const result = new Set(
      // keep only the user-controllable (paid) selections...
      ids.filter(id => {
        const item = cartItems.find(i => i.id === id);
        return item ? item.normal_price > 0 : true;
      })
    );
    // ...then add free gifts whose product has a selected paid sibling
    cartItems.forEach(i => {
      if (i.normal_price === 0 && paidSelectedProducts.has(i.product_name)) {
        result.add(i.id);
      }
    });
    return Array.from(result);
  };

  const handleItemSelection = (itemId: string, checked: boolean) => {
    setSelectedItems(prev =>
      reconcileFreeSelection(
        checked ? [...prev, itemId] : prev.filter(id => id !== itemId)
      )
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedItems(checked ? reconcileFreeSelection(cartItems.map(item => item.id)) : []);
  };

  const handleSelectGroup = (groupItemIds: string[], checked: boolean) => {
    setSelectedItems(prev => {
      if (checked) {
        const merged = new Set([...prev, ...groupItemIds]);
        return reconcileFreeSelection(Array.from(merged));
      }
      const drop = new Set(groupItemIds);
      return reconcileFreeSelection(prev.filter(id => !drop.has(id)));
    });
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

        <div className="container mx-auto px-3 sm:px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <div className="mb-8">
              <ShoppingBag className="h-16 w-16 sm:h-24 sm:w-24 mx-auto text-muted-foreground mb-4" />
              <h1 className="text-2xl sm:text-3xl font-bold mb-4">Your Cart is Empty</h1>
              <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8 px-4">
                Add some automotive parts to your cart to get started!
              </p>
              <Link to="/catalog">
                <Button size="lg" className="w-full sm:w-auto">
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

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 pb-32 lg:pb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Shopping Cart</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              {getTotalItems()} item{getTotalItems() !== 1 ? 's' : ''} from {sellerGroups.length} seller{sellerGroups.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Link to="/catalog">
            <Button variant="outline" size="sm" className="w-full sm:w-auto">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Continue Shopping
            </Button>
          </Link>
        </div>

        {/* Top toolbar: select-all + clear-cart */}
        <div className="flex items-center justify-between bg-white border rounded-lg px-3 sm:px-5 py-3 mb-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <Checkbox
              id="select-all"
              checked={isAllSelected}
              onCheckedChange={handleSelectAll}
            />
            <label htmlFor="select-all" className="text-xs sm:text-sm font-medium cursor-pointer">
              Select All ({cartItems.length})
            </label>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearCart}
            className="text-destructive hover:text-destructive text-xs sm:text-sm"
          >
            Clear Cart
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
          {/* Cart items grouped by seller */}
          <div className="lg:col-span-2 space-y-3">
            {sellerGroups.map((group) => {
              const groupItemIds = group.items.map(i => i.id);
              const groupSelectedCount = groupItemIds.filter(id => selectedItems.includes(id)).length;
              const allInGroupSelected = groupSelectedCount === groupItemIds.length && groupItemIds.length > 0;

              return (
                <Card key={group.sellerKey} className="overflow-hidden">
                  {/* Seller header */}
                  <div className="flex items-center justify-between gap-3 px-3 sm:px-5 py-3 bg-gray-50 border-b">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <Checkbox
                        checked={allInGroupSelected}
                        onCheckedChange={(checked) =>
                          handleSelectGroup(groupItemIds, checked as boolean)
                        }
                      />
                      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-md flex items-center justify-center flex-shrink-0 ${
                        group.isVendor ? 'bg-lime-100 text-lime-700' : 'bg-gray-200 text-gray-700'
                      }`}>
                        {group.isVendor ? <Store className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                      </div>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold text-sm sm:text-base text-gray-900 truncate">
                          {group.sellerName}
                        </span>
                        {group.isVendor ? (
                          <Badge variant="outline" className="text-[10px] border-lime-300 text-lime-700">Vendor</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] border-gray-300 text-gray-600">In-house</Badge>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {group.items.length} item{group.items.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Items in this group */}
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {group.items.map((item) => {
                        const isFree = item.normal_price === 0;
                        return (
                        <div key={item.id} className="p-3 sm:p-5">
                          <div className="flex items-start gap-3 sm:gap-4">
                            <Checkbox
                              checked={selectedItems.includes(item.id)}
                              onCheckedChange={(checked) => handleItemSelection(item.id, checked as boolean)}
                              disabled={isFree}
                              title={isFree ? 'Free gift — follows the main item' : undefined}
                              className="mt-1"
                            />
                            {item.component_image && (
                              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                <img
                                  src={transformImage(item.component_image, { width: 160, quality: 70 })}
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  decoding="async"
                                />
                              </div>
                            )}

                            <div className="flex-1 min-w-0 space-y-2">
                              <div>
                                <h3 className="text-sm sm:text-base font-semibold line-clamp-2">{item.name}</h3>
                                <p className="text-xs sm:text-sm text-muted-foreground">{item.component_sku}</p>
                                <p className="text-xs sm:text-sm text-muted-foreground">
                                  From: {item.product_name}
                                </p>
                              </div>

                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                  {isFree ? (
                                    <Badge className="text-xs bg-green-100 text-green-800 border border-green-200 hover:bg-green-100">🎁 FREE / FOC</Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-xs">
                                      {formatPrice(item.normal_price)} each
                                    </Badge>
                                  )}
                                </div>

                                <div className="flex items-center justify-between gap-3">
                                  {isFree ? (
                                    <div className="flex items-center text-sm font-medium text-green-700">
                                      Qty {item.quantity}
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1 sm:gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                        disabled={item.quantity <= 1}
                                        className="h-8 w-8 p-0"
                                      >
                                        <Minus className="h-3 w-3" />
                                      </Button>
                                      <span className="w-8 sm:w-12 text-center text-sm border rounded px-1 sm:px-2 py-1">
                                        {item.quantity}
                                      </span>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                        className="h-8 w-8 p-0"
                                      >
                                        <Plus className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  )}

                                  <div className="text-right min-w-[80px] sm:min-w-[100px]">
                                    <p className={`text-sm sm:text-base font-semibold ${isFree ? 'text-green-700' : ''}`}>
                                      {isFree ? 'FREE' : formatPrice(item.normal_price * item.quantity)}
                                    </p>
                                  </div>

                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => removeFromCart(item.id)}
                                    className="text-destructive hover:text-destructive p-1 sm:p-2 h-8 w-8"
                                  >
                                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  </CardContent>

                  {/* Per-seller subtotal */}
                  <div className="flex items-center justify-between px-3 sm:px-5 py-3 bg-gray-50 border-t">
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      Subtotal ({group.items.reduce((s, i) => s + i.quantity, 0)} pcs)
                    </span>
                    <span className="text-sm sm:text-base font-semibold text-gray-900">
                      {formatPrice(group.subtotal)}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1 hidden lg:block">
            <Card className="sticky top-4">
              <CardContent className="p-5 space-y-3 sm:space-y-4">
                <h2 className="text-lg sm:text-xl font-semibold">Order Summary</h2>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span>Selected Items ({selectedItems.length} of {getTotalItems()})</span>
                    <span className="font-medium">{formatPrice(getSelectedTotal())}</span>
                  </div>
                  {hasSelectedItems && (
                    <>
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span>Shipping</span>
                        <span className="text-muted-foreground">Calculated at checkout</span>
                      </div>
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span>Tax</span>
                        <span className="text-muted-foreground">Calculated at checkout</span>
                      </div>
                    </>
                  )}
                </div>

                <Separator />

                <div className="flex justify-between text-base sm:text-lg font-semibold">
                  <span>Total</span>
                  <span>{formatPrice(getSelectedTotal())}</span>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  disabled={!hasSelectedItems}
                  onClick={() => setShowCheckoutModal(true)}
                >
                  Check Out ({selectedItems.length})
                </Button>

                <div className="text-center">
                  <p className="text-xs text-muted-foreground">
                    Secure checkout
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Sticky bottom checkout bar (mobile + tablet) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-40">
        <div className="px-3 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Checkbox
              id="select-all-mobile"
              checked={isAllSelected}
              onCheckedChange={handleSelectAll}
            />
            <label htmlFor="select-all-mobile" className="text-xs font-medium cursor-pointer whitespace-nowrap">
              All
            </label>
            <div className="ml-2 min-w-0">
              <p className="text-xs text-muted-foreground leading-tight">Total ({selectedItems.length})</p>
              <p className="text-base font-bold text-gray-900 leading-tight truncate">{formatPrice(getSelectedTotal())}</p>
            </div>
          </div>
          <Button
            disabled={!hasSelectedItems}
            onClick={() => setShowCheckoutModal(true)}
            className="flex-shrink-0"
          >
            Check Out ({selectedItems.length})
          </Button>
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
