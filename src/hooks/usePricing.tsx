import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface PricingContext {
  customerType: 'normal' | 'merchant';
  pricingMode: 'B2C' | 'B2B';
  showsMerchantPrice: boolean;
  isLoading: boolean;
  refreshPricingContext: () => void;
  getDisplayPrice: (normalPrice: number, merchantPrice: number) => number;
  getPriceLabel: () => string;
}

interface PricingContextData {
  user_id: string | null;
  customer_id: string | null;
  customer_name: string | null;
  customer_type: 'normal' | 'merchant';
  pricing_mode: 'B2C' | 'B2B';
  shows_merchant_price: boolean;
  is_active: boolean;
}

const PricingContext = createContext<PricingContext | undefined>(undefined);

interface PricingProviderProps {
  children: ReactNode;
}

export function PricingProvider({ children }: PricingProviderProps) {
  const { user } = useAuth();
  const [pricingData, setPricingData] = useState<PricingContextData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPricingContext = async () => {
    try {
      setIsLoading(true);
      
      if (!user) {
        // Default for non-authenticated users
        setPricingData({
          user_id: null,
          customer_id: null,
          customer_name: null,
          customer_type: 'normal',
          pricing_mode: 'B2C',
          shows_merchant_price: false,
          is_active: false
        });
        return;
      }

      const { data, error } = await supabase
        .rpc('get_user_pricing_context', { 
          p_user_id: user.id 
        });

      if (error) {
        console.error('Error fetching pricing context:', error);
        // Fallback to normal customer
        setPricingData({
          user_id: user.id,
          customer_id: null,
          customer_name: null,
          customer_type: 'normal',
          pricing_mode: 'B2C',
          shows_merchant_price: false,
          is_active: false
        });
      } else {
        // Process the pricing context data
        if (data && typeof data === 'object') {
          setPricingData(data as PricingContextData);
        } else {
          setPricingData({
            user_id: user.id,
            customer_id: null,
            customer_name: null,
            customer_type: 'normal',
            pricing_mode: 'B2C',
            shows_merchant_price: false,
            is_active: false
          });
        }
      }
    } catch (error) {
      console.error('Error in fetchPricingContext:', error);
      // Fallback to normal customer
      setPricingData({
        user_id: user?.id || null,
        customer_id: null,
        customer_name: null,
        customer_type: 'normal',
        pricing_mode: 'B2C',
        shows_merchant_price: false,
        is_active: false
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPricingContext();
  }, [user]);

  // Listen for customer type changes
  useEffect(() => {
    const handleCustomerTypeChange = () => {
      fetchPricingContext();
    };

    window.addEventListener('customerTypeChanged', handleCustomerTypeChange);
    return () => window.removeEventListener('customerTypeChanged', handleCustomerTypeChange);
  }, []);

  // Add a function to manually refresh pricing context
  const refreshPricingContext = async () => {
    await fetchPricingContext();
  };

  const getDisplayPrice = (normalPrice: number, merchantPrice: number): number => {
    if (!pricingData) return normalPrice;
    
    if (pricingData.customer_type === 'merchant') {
      // Return merchant price if available, otherwise fall back to normal price
      return merchantPrice > 0 ? merchantPrice : normalPrice;
    }
    
    return normalPrice;
  };

  const getPriceLabel = (): string => {
    if (!pricingData) return 'Price';
    
    return pricingData.customer_type === 'merchant' ? 'Merchant Price' : 'Price';
  };

  const contextValue: PricingContext = {
    customerType: pricingData?.customer_type || 'normal',
    pricingMode: pricingData?.pricing_mode || 'B2C',
    showsMerchantPrice: pricingData?.shows_merchant_price || false,
    isLoading,
    refreshPricingContext: refreshPricingContext,
    getDisplayPrice,
    getPriceLabel
  };

  // Clean implementation without debug logs

  return (
    <PricingContext.Provider value={contextValue}>
      {children}
    </PricingContext.Provider>
  );
}

export function usePricing(): PricingContext {
  const context = useContext(PricingContext);
  if (context === undefined) {
    throw new Error('usePricing must be used within a PricingProvider');
  }
  return context;
}

// Hook specifically for getting components with appropriate pricing
export function useComponentPricing() {
  const { user } = useAuth();
  const { customerType } = usePricing(); // Add dependency on customer type
  const [components, setComponents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComponents = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .rpc('get_components_with_pricing', { 
          customer_user_id: user?.id || null 
        });

      if (fetchError) {
        console.error('Error fetching components with pricing:', fetchError);
        setError(fetchError.message);
        setComponents([]);
      } else {
        console.log('✅ Components with pricing loaded:', data?.length, 'components');
        if (data && data.length > 0) {
          console.log('📊 Sample component pricing:', {
            name: data[0].name,
            normal_price: data[0].normal_price,
            merchant_price: data[0].merchant_price,
            price: data[0].price,
            customer_type: data[0].customer_type
          });
        }
        setComponents(data || []);
      }
    } catch (err: any) {
      console.error('Error in fetchComponents:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComponents();
  }, [user, customerType]); // Refetch when customer type changes

  return {
    components,
    isLoading,
    error,
    refetch: fetchComponents
  };
}