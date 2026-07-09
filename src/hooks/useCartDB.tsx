import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

interface CartItem {
  id: string;
  component_sku: string;
  name: string;
  normal_price: number;
  quantity: number;
  product_name: string;
  component_image?: string;
  /** True when this line is a free (FOC) gift, kept distinct from a paid buy. */
  is_foc?: boolean;
  /** True when this paid line is the FOC trigger (main item that unlocks gifts). */
  is_foc_trigger?: boolean;
  /** Seller of this item. NULL means AutoLab in-house. */
  vendor_id?: string | null;
  /** Display name of seller. NULL/undefined means "AutoLab". */
  vendor_name?: string | null;
}

// A cart line is identified by its component, the product it came from, AND
// whether it is a free gift — so a paid purchase and a FOC gift of the same
// component stay separate lines instead of collapsing into one.
const cartLineId = (sku: string, productName: string, isFoc: boolean) =>
  `${sku}_${productName}_${isFoc ? 'foc' : 'std'}`;

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: Omit<CartItem, 'id'>) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  loading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  // Generate guest session for non-authenticated users (deprecated - keeping for cleanup)
  const getGuestSession = () => {
    // Clear any existing guest session data since we now require authentication
    localStorage.removeItem('guest_cart_session');
    return null;
  };

  // Load cart from database on mount or user change
  useEffect(() => {
    loadCartFromDatabase();
  }, [user]);

  const loadCartFromDatabase = async () => {
    // Only load cart for authenticated users
    if (!user) {
      setCartItems([]);
      setLoading(false);
      return;
    }

    // Don't set loading to true if we're already in the middle of an operation
    if (loading) {
      return;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .rpc('get_user_cart_items', { 
          p_user_id: user.id,
          p_guest_session: null 
        });

      if (error) {
        loadCartFromLocalStorage();
        setLoading(false);
        return;
      }

      if (data && data.length > 0) {
        // Get unique component SKUs to fetch images + vendor info
        const componentSkus = [...new Set(data.map((item: any) => item.component_sku))];

        // Fetch only the components actually in the cart. (Fetching the whole
        // library hit PostgREST's 1000-row cap, so images for SKUs past row
        // 1000 silently vanished — the cart has few SKUs, so filter instead.)
        const { data: allComponentsData } = await supabase
          .from('component_library' as any)
          .select('component_sku, default_image_url, vendor_id')
          .in('component_sku', componentSkus as string[]);

        // Create maps from component_sku to image URL and vendor_id
        const componentSkusSet = new Set(componentSkus);
        const imageMap = new Map<string, string>();
        const vendorIdMap = new Map<string, string | null>();
        if (allComponentsData) {
          (allComponentsData as any[])
            .filter((comp: any) => componentSkusSet.has(comp.component_sku))
            .forEach((comp: any) => {
              if (comp.default_image_url) {
                imageMap.set(comp.component_sku, comp.default_image_url);
              }
              vendorIdMap.set(comp.component_sku, comp.vendor_id ?? null);
            });
        }

        // Resolve vendor display names for any vendor_ids we found
        const vendorIds = [...new Set(
          Array.from(vendorIdMap.values()).filter((v): v is string => !!v)
        )];
        const vendorNameMap = new Map<string, string>();
        if (vendorIds.length > 0) {
          // vendors_public: base vendors table is RLS-locked to owner+admin, so
          // customers read seller names from the public-safe view instead.
          const { data: vendorRows } = await supabase
            .from('vendors_public' as any)
            .select('id, business_name')
            .in('id', vendorIds);
          (vendorRows as any[] | null)?.forEach((v: any) => {
            vendorNameMap.set(v.id, v.business_name);
          });
        }

        // Transform database items to match CartItem interface with images + seller info
        const transformedItems: CartItem[] = data.map((item: any) => {
          const vendorId = vendorIdMap.get(item.component_sku) ?? null;
          const productName = item.product_context || 'Unknown Product';
          // Prefer the persisted is_foc flag; fall back to price for legacy rows.
          const isFoc = item.is_foc ?? (Number(item.unit_price) === 0);
          return {
            id: cartLineId(item.component_sku, productName, isFoc),
            component_sku: item.component_sku,
            name: item.component_name,
            normal_price: item.unit_price,
            quantity: item.quantity,
            product_name: productName,
            is_foc: isFoc,
            is_foc_trigger: item.is_foc_trigger ?? false,
            component_image: imageMap.get(item.component_sku) || item.default_image_url || undefined,
            vendor_id: vendorId,
            vendor_name: vendorId ? (vendorNameMap.get(vendorId) || null) : null,
          };
        }).sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically

        setCartItems(transformedItems);

        // Also sync to localStorage for offline access
        localStorage.setItem('cart', JSON.stringify(transformedItems));
      } else {
        // Clear any old localStorage cart data to prevent unwanted auto-migration
        localStorage.removeItem('cart');
        setCartItems([]);
      }
    } catch (error) {
      loadCartFromLocalStorage();
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const loadCartFromLocalStorage = () => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (error) {
      }
    }
  };

  const addToCart = async (newItem: Omit<CartItem, 'id'>) => {
    // Require authentication for cart operations
    if (!user) {
      return;
    }

    try {

      // Immediately update local state for instant UI feedback
      const isFoc = newItem.is_foc ?? false;
      const itemId = cartLineId(newItem.component_sku, newItem.product_name, isFoc);
      let updatedItems: CartItem[] = [];

      setCartItems(prevItems => {
        const existingItem = prevItems.find(item => item.id === itemId);

        if (existingItem) {
          // Update quantity if item already exists
          updatedItems = prevItems.map(item =>
            item.id === itemId
              ? { ...item, quantity: item.quantity + newItem.quantity }
              : item
          ).sort((a, b) => a.name.localeCompare(b.name)); // Keep sorted
        } else {
          // Add new item and sort
          updatedItems = [...prevItems, { ...newItem, id: itemId }].sort((a, b) => a.name.localeCompare(b.name));
        }

        return updatedItems;
      });
      
      // Find component_id + vendor_id from component_library. We fetch vendor_id
      // here (the same source of truth loadCartFromDatabase uses) so the cart can
      // group the item under the correct seller immediately, without a refresh.
      const { data: componentData, error: componentError } = await supabase
        .from('component_library')
        .select('id, vendor_id')
        .eq('component_sku', newItem.component_sku)
        .single();

      if (componentError || !componentData) {
        // State was already updated above, just sync to localStorage
        localStorage.setItem('cart', JSON.stringify(updatedItems));
        return;
      }

      // Resolve seller info and patch the optimistic item so the multi-seller
      // grouping (AutoLab vs vendor) renders correctly on add — not just on reload.
      const vendorId = (componentData as any).vendor_id ?? null;
      let vendorName: string | null = null;
      if (vendorId) {
        const { data: vendorRow } = await supabase
          .from('vendors' as any)
          .select('business_name')
          .eq('id', vendorId)
          .maybeSingle();
        vendorName = (vendorRow as any)?.business_name ?? null;
      }

      setCartItems(prevItems => {
        const patched = prevItems.map(item =>
          item.id === itemId
            ? { ...item, vendor_id: vendorId, vendor_name: vendorName }
            : item
        );
        localStorage.setItem('cart', JSON.stringify(patched));
        return patched;
      });

      const { error } = await supabase
        .rpc('add_item_to_cart', {
          p_component_id: componentData.id,
          p_component_sku: newItem.component_sku,
          p_component_name: newItem.name,
          p_product_context: newItem.product_name,
          p_quantity: newItem.quantity,
          p_unit_price: newItem.normal_price,
          p_user_id: user.id,
          p_guest_session: null,
          p_is_foc: isFoc,
          p_is_foc_trigger: newItem.is_foc_trigger ?? false,
        } as any);

      if (error) {
        // State was already updated above for instant feedback
        return;
      }
    } catch (error) {
      // State was already updated above for instant feedback
    }
  };

  const addToCartLocalStorage = (newItem: Omit<CartItem, 'id'>) => {
    const itemId = `${newItem.component_sku}_${newItem.product_name}`;

    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.id === itemId);

      let updatedItems;
      if (existingItem) {
        // Update quantity if item already exists
        updatedItems = prevItems.map(item =>
          item.id === itemId
            ? { ...item, quantity: item.quantity + newItem.quantity }
            : item
        ).sort((a, b) => a.name.localeCompare(b.name)); // Keep sorted
      } else {
        // Add new item and sort
        updatedItems = [...prevItems, { ...newItem, id: itemId }].sort((a, b) => a.name.localeCompare(b.name));
      }

      // Save to localStorage
      localStorage.setItem('cart', JSON.stringify(updatedItems));
      return updatedItems;
    });
  };

  const removeFromCart = async (itemId: string) => {
    if (!user) {
      return;
    }

    try {
      // Capture the line before removing it so we can target the exact cart row
      // (component + product + free/paid), not every line sharing the component.
      const removed = cartItems.find(item => item.id === itemId);

      // Immediately update local state for instant UI feedback (already sorted, just filter)
      setCartItems(prevItems => prevItems.filter(item => item.id !== itemId));

      if (!removed) return;

      // Delete the exact cart row directly. We intentionally do NOT look up
      // component_library first: an orphaned SKU whose component was deleted has
      // no library row, and the old lookup-then-RPC path bailed out before the
      // delete — so the row silently persisted and reappeared on refresh.
      // user_cart RLS already scopes deletes to the owner.
      let del = supabase
        .from('user_cart')
        .delete()
        .eq('user_id', user.id)
        .eq('component_sku', removed.component_sku)
        .eq('is_foc', removed.is_foc ?? false);
      del = removed.product_name
        ? del.eq('product_context', removed.product_name)
        : del.is('product_context', null);
      await del;
    } catch (error) {
      // State was already updated above for instant feedback
    }
  };

  const removeFromCartLocalStorage = (itemId: string) => {
    setCartItems(prevItems => {
      const updatedItems = prevItems.filter(item => item.id !== itemId);
      localStorage.setItem('cart', JSON.stringify(updatedItems));
      return updatedItems;
    });
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (!user) {
      return;
    }

    if (quantity <= 0) {
      await removeFromCart(itemId);
      return;
    }

    try {
      // Immediately update local state for instant UI feedback
      setCartItems(prevItems =>
        prevItems.map(item =>
          item.id === itemId
            ? { ...item, quantity: quantity }
            : item
        ).sort((a, b) => a.name.localeCompare(b.name)) // Keep sorted
      );

      // Get existing item details (its sku/product/is_foc identify the line)
      const existingItem = cartItems.find(item => item.id === itemId);
      if (!existingItem) return;

      // Update the exact row's quantity directly. Avoids the component_library
      // lookup that silently no-ops for orphaned SKUs. RLS scopes the write to
      // the owner.
      let upd = supabase
        .from('user_cart')
        .update({ quantity })
        .eq('user_id', user.id)
        .eq('component_sku', existingItem.component_sku)
        .eq('is_foc', existingItem.is_foc ?? false);
      upd = existingItem.product_name
        ? upd.eq('product_context', existingItem.product_name)
        : upd.is('product_context', null);
      await upd;
    } catch (error) {
      // Silently fail - state already updated for instant feedback
    }
  };

  const clearCart = async () => {
    if (!user) {
      return;
    }

    try {
      setLoading(true);
      
      // Authentication is now required for all cart operations
      
      const { error } = await supabase
        .rpc('clear_user_cart', {
          p_user_id: user.id,
          p_guest_session: null
        });

      if (error) {
        // Fallback to localStorage method
        clearCartLocalStorage();
        return;
      }

      // Clear local state and localStorage
      setCartItems([]);
      localStorage.setItem('cart', JSON.stringify([]));
    } catch (error) {
      // Fallback to localStorage method
      clearCartLocalStorage();
    } finally {
      setLoading(false);
    }
  };

  const clearCartLocalStorage = () => {
    setCartItems([]);
    localStorage.setItem('cart', JSON.stringify([]));
  };

  const getTotalItems = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => total + (item.normal_price * item.quantity), 0);
  };

  const value = {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotalItems,
    getTotalPrice,
    loading
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};