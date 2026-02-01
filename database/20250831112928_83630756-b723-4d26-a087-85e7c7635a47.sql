-- AutoMot Hub E-commerce Database Schema
-- Core tables for car parts e-commerce platform

-- Create enums for type safety
CREATE TYPE public.user_role AS ENUM ('customer', 'merchant', 'staff', 'admin');
CREATE TYPE public.order_status AS ENUM ('PLACED', 'PENDING_VERIFICATION', 'VERIFIED', 'PACKING', 'DISPATCHED', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'REJECTED');
CREATE TYPE public.payment_state AS ENUM ('UNPAID', 'SUBMITTED', 'APPROVED', 'REJECTED', 'ON_CREDIT');
CREATE TYPE public.stock_movement_type AS ENUM ('RECEIPT', 'SALE', 'ADJUSTMENT', 'RESERVATION', 'RELEASE');
CREATE TYPE public.debt_ledger_type AS ENUM ('INVOICE', 'PAYMENT', 'CREDIT_NOTE', 'ADJUSTMENT');
CREATE TYPE public.delivery_status AS ENUM ('ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'FAILED');

-- Helper function for updated_at timestamps
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- User profiles extending Supabase auth
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.user_role NOT NULL DEFAULT 'customer',
  full_name TEXT NOT NULL,
  phone_e164 TEXT UNIQUE NOT NULL,
  email TEXT,
  is_phone_verified BOOLEAN DEFAULT false,
  credit_limit NUMERIC(12,2) DEFAULT 0,
  whatsapp_opt_in BOOLEAN DEFAULT true,
  tenant_id UUID DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Categories for products
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  parent_id UUID REFERENCES public.categories(id),
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  tenant_id UUID DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Products catalog
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  brand TEXT,
  model TEXT,
  year_from INTEGER,
  year_to INTEGER,
  category_id UUID REFERENCES public.categories(id),
  price_regular NUMERIC(12,2) NOT NULL,
  price_merchant NUMERIC(12,2) NOT NULL,
  stock_on_hand INTEGER NOT NULL DEFAULT 0,
  reorder_level INTEGER DEFAULT 0,
  weight_kg NUMERIC(8,2),
  dimensions_cm TEXT, -- "LxWxH"
  keywords TEXT[], -- for search
  active BOOLEAN DEFAULT true,
  tenant_id UUID DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Product images
CREATE TABLE public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt_text TEXT,
  sort_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  tenant_id UUID DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Customer addresses
CREATE TABLE public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label TEXT NOT NULL, -- "Home", "Office", etc.
  line1 TEXT NOT NULL,
  line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postcode TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'Malaysia',
  is_default BOOLEAN DEFAULT false,
  tenant_id UUID DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Shopping carts
CREATE TABLE public.carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  guest_key TEXT, -- for anonymous users
  status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, MERGED, ORDERED
  tenant_id UUID DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cart items
CREATE TABLE public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL,
  tenant_id UUID DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(cart_id, product_id)
);

-- Orders
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  status public.order_status NOT NULL DEFAULT 'PLACED',
  payment_state public.payment_state NOT NULL DEFAULT 'UNPAID',
  subtotal NUMERIC(12,2) NOT NULL,
  tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  shipping_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'MYR',
  address_id UUID NOT NULL REFERENCES public.addresses(id),
  notes TEXT,
  tenant_id UUID DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Order items
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL,
  total_price NUMERIC(12,2) NOT NULL,
  tenant_id UUID DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Stock movements for inventory tracking
CREATE TABLE public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id),
  type public.stock_movement_type NOT NULL,
  quantity INTEGER NOT NULL, -- positive for additions, negative for reductions
  reference TEXT, -- order_id, adjustment_id, etc.
  notes TEXT,
  tenant_id UUID DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payment proofs for manual verification
CREATE TABLE public.payment_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  original_filename TEXT,
  reviewed_by UUID REFERENCES public.profiles(id),
  result TEXT, -- APPROVED, REJECTED
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  tenant_id UUID DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profiles: users can view their own, staff/admin can view all
CREATE POLICY "users_select_own_profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "staff_admin_select_all_profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('staff', 'admin')
    )
  );

-- Categories and Products: public read access, staff/admin write
CREATE POLICY "public_select_categories" ON public.categories
  FOR SELECT USING (active = true);

CREATE POLICY "public_select_products" ON public.products
  FOR SELECT USING (active = true);

CREATE POLICY "public_select_product_images" ON public.product_images
  FOR SELECT USING (true);

-- User addresses: users can manage their own
CREATE POLICY "users_manage_own_addresses" ON public.addresses
  FOR ALL USING (auth.uid() = user_id);

-- Carts: users can manage their own or guest carts
CREATE POLICY "users_manage_own_carts" ON public.carts
  FOR ALL USING (auth.uid() = user_id OR guest_key IS NOT NULL);

CREATE POLICY "users_manage_cart_items" ON public.cart_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.carts 
      WHERE id = cart_id 
      AND (auth.uid() = user_id OR guest_key IS NOT NULL)
    )
  );

-- Orders: users can view their own, staff/admin can view all
CREATE POLICY "users_select_own_orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "staff_admin_manage_orders" ON public.orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('staff', 'admin')
    )
  );

-- Order items follow order permissions
CREATE POLICY "order_items_follow_orders" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE id = order_id 
      AND (auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('staff', 'admin')
      ))
    )
  );

-- Stock movements: staff/admin only
CREATE POLICY "staff_admin_manage_stock" ON public.stock_movements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('staff', 'admin')
    )
  );

-- Payment proofs: users can upload for their orders, staff can review
CREATE POLICY "users_upload_payment_proofs" ON public.payment_proofs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE id = order_id AND auth.uid() = user_id
    )
  );

CREATE POLICY "users_view_own_payment_proofs" ON public.payment_proofs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE id = order_id AND auth.uid() = user_id
    )
  );

-- Create updated_at triggers
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_product_images_updated_at BEFORE UPDATE ON public.product_images FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_addresses_updated_at BEFORE UPDATE ON public.addresses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_carts_updated_at BEFORE UPDATE ON public.carts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_cart_items_updated_at BEFORE UPDATE ON public.cart_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_order_items_updated_at BEFORE UPDATE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_stock_movements_updated_at BEFORE UPDATE ON public.stock_movements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_payment_proofs_updated_at BEFORE UPDATE ON public.payment_proofs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Insert some sample categories and products
INSERT INTO public.categories (name, slug, description) VALUES
('Engine Components', 'engine-components', 'Engine parts and components for all vehicle types'),
('Brake System', 'brake-system', 'Brake pads, discs, calipers and related components'),
('Suspension', 'suspension', 'Shocks, struts, springs and suspension components'),
('Electrical', 'electrical', 'Alternators, starters, batteries and electrical parts'),
('Body Parts', 'body-parts', 'Panels, bumpers, lights and exterior components'),
('Interior', 'interior', 'Seats, dashboard, trim and interior accessories');

-- Sample products
INSERT INTO public.products (sku, name, slug, description, brand, category_id, price_regular, price_merchant, stock_on_hand, keywords) 
SELECT 
  'BRK-001',
  'Premium Brake Pads Set - Front',
  'premium-brake-pads-front',
  'High-performance ceramic brake pads for enhanced stopping power and reduced noise. Compatible with most sedan and hatchback models.',
  'AutoTech Pro',
  c.id,
  189.90,
  149.90,
  25,
  ARRAY['brake', 'pads', 'ceramic', 'front', 'performance']
FROM public.categories c WHERE c.slug = 'brake-system'
UNION ALL
SELECT 
  'ENG-002',
  'Oil Filter - Universal Fit',
  'oil-filter-universal',
  'Premium oil filter with advanced filtration technology. Fits most 1.6L to 2.0L engines.',
  'FilterMax',
  c.id,
  29.90,
  24.90,
  150,
  ARRAY['oil', 'filter', 'engine', 'universal', 'maintenance']
FROM public.categories c WHERE c.slug = 'engine-components'
UNION ALL
SELECT 
  'SUS-003',
  'Front Shock Absorber Pair',
  'front-shock-absorber-pair',
  'Heavy-duty shock absorbers designed for Malaysian road conditions. Improved comfort and handling.',
  'RideComfort',
  c.id,
  299.90,
  249.90,
  18,
  ARRAY['shock', 'absorber', 'suspension', 'front', 'comfort']
FROM public.categories c WHERE c.slug = 'suspension';

-- Create indexes for performance
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_active ON public.products(active);
CREATE INDEX idx_products_keywords ON public.products USING GIN(keywords);
CREATE INDEX idx_orders_user ON public.orders(user_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_stock_movements_product ON public.stock_movements(product_id, created_at);
CREATE INDEX idx_cart_items_cart ON public.cart_items(cart_id);
CREATE INDEX idx_product_images_product ON public.product_images(product_id, sort_order);