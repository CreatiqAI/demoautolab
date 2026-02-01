-- Add car columns to customer_profiles table for tracking customer's current vehicle
-- These columns store the customer's current car information for personalized recommendations

ALTER TABLE public.customer_profiles
ADD COLUMN IF NOT EXISTS car_make_id UUID REFERENCES public.car_makes(id),
ADD COLUMN IF NOT EXISTS car_make_name TEXT,
ADD COLUMN IF NOT EXISTS car_model_id UUID REFERENCES public.car_models(id),
ADD COLUMN IF NOT EXISTS car_model_name TEXT;

-- Add index for car-based queries
CREATE INDEX IF NOT EXISTS idx_customer_profiles_car_make ON public.customer_profiles(car_make_id);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_car_model ON public.customer_profiles(car_model_id);

-- Comment for documentation
COMMENT ON COLUMN public.customer_profiles.car_make_id IS 'Reference to car_makes table for customer current vehicle';
COMMENT ON COLUMN public.customer_profiles.car_make_name IS 'Denormalized car make name for display';
COMMENT ON COLUMN public.customer_profiles.car_model_id IS 'Reference to car_models table for customer current vehicle';
COMMENT ON COLUMN public.customer_profiles.car_model_name IS 'Denormalized car model name for display';
