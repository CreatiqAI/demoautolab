import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client.js';
import { useAuth } from './useAuth';

interface CartItem {
  id: string;
  component_sku: string;
  name: string;
  normal_price: number;
  quantity: number;
  product_name: string;
  component_image?: string;
}

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
      console.log('🔄 No authenticated user, clearing cart');
      setCartItems([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('🔄 Loading cart from database for user:', user?.id);
      
      const { data, error } = await supabase
        .rpc('get_user_cart_items', { 
          p_user_id: user.id,
          p_guest_session: null 
        });

      if (error) {
        console.error('❌ Database cart load failed:', error);
        console.log('🔄 Falling back to localStorage');
        loadCartFromLocalStorage();
        return;
      }

      console.log('✅ Database cart data received:', data);

      if (data && data.length > 0) {
        // Transform database items to match CartItem interface
        const transformedItems: CartItem[] = data.map((item: any) => ({
          id: `${item.component_sku}_${item.product_context}`,
          component_sku: item.component_sku,
          name: item.component_name,
          normal_price: item.unit_price,
          quantity: item.quantity,
          product_name: item.product_context || 'Unknown Product'
        }));
        
        console.log('🔄 Transformed items:', transformedItems);
        setCartItems(transformedItems);
        
        // Also sync to localStorage for offline access
        localStorage.setItem('cart', JSON.stringify(transformedItems));
        console.log('💾 Synced to localStorage');
      } else {
        console.log('📭 No items in database cart');
        // Clear any old localStorage cart data to prevent unwanted auto-migration
        console.log('🧹 Clearing old localStorage cart data');
        localStorage.removeItem('cart');
        setCartItems([]);
      }
    } catch (error) {
      console.error('💥 Unexpected error loading cart:', error);
      loadCartFromLocalStorage();
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
        console.error('Error loading cart from localStorage:', error);
      }
    }
  };

  const addToCart = async (newItem: Omit<CartItem, 'id'>) => {
    // Require authentication for cart operations
    if (!user) {
      console.warn('❌ User not authenticated - cannot add to cart');
      return;
    }

    try {
      setLoading(true);
      console.log('🛒 Adding item to cart:', newItem);
      
      // Find component_id from component_library
      console.log('🔍 Looking up component:', newItem.component_sku);
      const { data: componentData, error: componentError } = await supabase
        .from('component_library')
        .select('id')
        .eq('component_sku', newItem.component_sku)
        .single();

      if (componentError || !componentData) {
        console.error('❌ Component lookup failed:', componentError);
        console.log('🔄 Falling back to localStorage method');
        addToCartLocalStorage(newItem);
        return;
      }

      console.log('✅ Component found:', componentData.id);
      
      console.log('📞 Calling add_item_to_cart function with params:', {
        p_component_id: componentData.id,
        p_component_sku: newItem.component_sku,
        p_component_name: newItem.name,
        p_product_context: newItem.product_name,
        p_quantity: newItem.quantity,
        p_unit_price: newItem.normal_price,
        p_user_id: user.id,
        p_guest_session: null
      });

      const { data, error } = await supabase
        .rpc('add_item_to_cart', {
          p_component_id: componentData.id,
          p_component_sku: newItem.component_sku,
          p_component_name: newItem.name,
          p_product_context: newItem.product_name,
          p_quantity: newItem.quantity,
          p_unit_price: newItem.normal_price,
          p_user_id: user.id,
          p_guest_session: null
        });

      if (error) {
        console.error('❌ Database add_to_cart failed:', error);
        console.log('🔄 Falling back to localStorage method');
        addToCartLocalStorage(newItem);
        return;
      }

      console.log('✅ Database add_to_cart success:', data);
      
      // Reload cart from database
      console.log('🔄 Reloading cart from database...');
      await loadCartFromDatabase();
    } catch (error) {
      console.error('💥 Unexpected error adding to cart:', error);
      addToCartLocalStorage(newItem);
    } finally {
      setLoading(false);
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
        );
      } else {
        // Add new item
        updatedItems = [...prevItems, { ...newItem, id: itemId }];
      }
      
      // Save to localStorage
      localStorage.setItem('cart', JSON.stringify(updatedItems));
      return updatedItems;
    });
  };

  const removeFromCart = async (itemId: string) => {
    if (!user) {
      console.warn('❌ User not authenticated - cannot remove from cart');
      return;
    }

    try {
      setLoading(true);
      
      // Extract component_sku from itemId
      const component_sku = itemId.split('_')[0];
      
      // Find component_id
      const { data: componentData, error: componentError } = await supabase
        .from('component_library')
        .select('id')
        .eq('component_sku', component_sku)
        .single();

      if (componentError || !componentData) {
        console.error('Component not found for removal:', componentError);
        // Fallback to localStorage method
        removeFromCartLocalStorage(itemId);
        return;
      }

      // Authentication is now required for all cart operations
      
      const { error } = await supabase
        .rpc('remove_item_from_cart', {
          p_component_id: componentData.id,
          p_user_id: user.id,
          p_guest_session: null
        });

      if (error) {
        console.error('Error removing from cart database:', error);
        // Fallback to localStorage method
        removeFromCartLocalStorage(itemId);
        return;
      }

      // Reload cart from database
      await loadCartFromDatabase();
    } catch (error) {
      console.error('Error removing from cart:', error);
      // Fallback to localStorage method
      removeFromCartLocalStorage(itemId);
    } finally {
      setLoading(false);
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
      console.warn('❌ User not authenticated - cannot update cart');
      return;
    }

    if (quantity <= 0) {
      await removeFromCart(itemId);
      return;
    }

    // For now, implement as remove + add with new quantity
    const existingItem = cartItems.find(item => item.id === itemId);
    if (existingItem) {
      await removeFromCart(itemId);
      await addToCart({
        component_sku: existingItem.component_sku,
        name: existingItem.name,
        normal_price: existingItem.normal_price,
        quantity: quantity,
        product_name: existingItem.product_name,
        component_image: existingItem.component_image
      });
    }
  };

  const clearCart = async () => {
    if (!user) {
      console.warn('❌ User not authenticated - cannot clear cart');
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
        console.error('Error clearing cart database:', error);
        // Fallback to localStorage method
        clearCartLocalStorage();
        return;
      }

      // Clear local state and localStorage
      setCartItems([]);
      localStorage.setItem('cart', JSON.stringify([]));
    } catch (error) {
      console.error('Error clearing cart:', error);
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