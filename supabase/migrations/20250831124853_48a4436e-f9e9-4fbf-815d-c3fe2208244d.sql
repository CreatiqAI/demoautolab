-- Create function for updating timestamps first
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add more automotive products with better variety
INSERT INTO public.products (
  sku, name, slug, description, brand, category_id, price_regular, price_merchant, stock_on_hand, keywords, active
) VALUES 
-- Navigation Systems (Electrical category)
('NAV-001', 'AUDI A1 2008-2012 9 inch Android Navigation System', 'audi-a1-android-nav-system', 
 'Premium Android navigation system with GPS, Bluetooth, and multimedia features. Compatible with AUDI A1 models 2008-2012.', 
 'AutoTech Pro', '0e6b9a11-f434-4d83-99e7-e70660491f00', 350.00, 280.00, 15, 
 ARRAY['navigation', 'android', 'gps', 'audi', 'multimedia'], true),

('NAV-002', 'Honda Civic 2016-2021 10 inch CarPlay Android Auto System', 'honda-civic-carplay-system',
 'Advanced infotainment system with Apple CarPlay and Android Auto support. Perfect fit for Honda Civic 2016-2021.',
 'MediaMax', '0e6b9a11-f434-4d83-99e7-e70660491f00', 420.00, 350.00, 8,
 ARRAY['carplay', 'android auto', 'honda', 'infotainment'], true),

-- Engine Performance
('ENG-003', 'K&N High Flow Air Filter - Universal', 'kn-high-flow-air-filter',
 'Washable and reusable high-flow air filter. Increases horsepower and acceleration while providing excellent filtration.',
 'K&N Performance', 'd25e1b5f-c850-4a61-8734-46e958d44612', 89.90, 75.00, 45,
 ARRAY['air filter', 'performance', 'kn', 'universal'], true),

('ENG-004', 'Bosch Platinum Spark Plugs Set of 4', 'bosch-platinum-spark-plugs',
 'Premium platinum spark plugs for improved fuel efficiency and engine performance. Long-lasting and reliable.',
 'Bosch', 'd25e1b5f-c850-4a61-8734-46e958d44612', 120.00, 95.00, 60,
 ARRAY['spark plugs', 'platinum', 'bosch', 'engine'], true),

-- Brake System
('BRK-002', 'Brembo High Performance Brake Discs - Rear', 'brembo-brake-discs-rear',
 'Premium ventilated brake discs from Brembo. Superior heat dissipation and braking performance.',
 'Brembo', 'a09ee2e0-6a6a-44a6-ad3b-48f150ef864c', 280.00, 230.00, 12,
 ARRAY['brake discs', 'brembo', 'rear', 'performance'], true),

('BRK-003', 'EBC RedStuff Ceramic Brake Pads - Front', 'ebc-redstuff-ceramic-pads',
 'Low dust ceramic brake pads with excellent stopping power. Designed for fast road and light track use.',
 'EBC Brakes', 'a09ee2e0-6a6a-44a6-ad3b-48f150ef864c', 195.00, 165.00, 28,
 ARRAY['brake pads', 'ceramic', 'ebc', 'performance'], true),

-- Suspension
('SUS-004', 'Bilstein B4 Shock Absorber Set', 'bilstein-b4-shock-set',
 'OE replacement shock absorbers from Bilstein. Restore original ride quality and handling.',
 'Bilstein', '4bf6bc7e-4305-4419-9f9b-4165fdf02127', 450.00, 380.00, 10,
 ARRAY['bilstein', 'shock absorber', 'oe replacement'], true),

('SUS-005', 'Eibach Pro-Kit Lowering Springs', 'eibach-pro-kit-springs',
 'Progressive rate lowering springs. Reduces vehicle height while maintaining ride comfort.',
 'Eibach', '4bf6bc7e-4305-4419-9f9b-4165fdf02127', 320.00, 270.00, 16,
 ARRAY['lowering springs', 'eibach', 'performance', 'suspension'], true),

-- Body Parts
('BDY-001', 'LED Headlight Conversion Kit H4', 'led-headlight-h4-kit',
 'Plug-and-play LED headlight conversion kit. 6000K cool white light with improved visibility.',
 'LightMax Pro', 'd0a446e6-7048-4532-a1bf-5472e5d574c6', 150.00, 125.00, 35,
 ARRAY['led headlight', 'h4', 'conversion', 'lighting'], true),

('BDY-002', 'Carbon Fiber Side Mirror Covers', 'carbon-fiber-mirror-covers',
 'Lightweight carbon fiber side mirror covers. Direct replacement for OEM covers.',
 'CarbonTech', 'd0a446e6-7048-4532-a1bf-5472e5d574c6', 80.00, 65.00, 22,
 ARRAY['carbon fiber', 'mirror covers', 'exterior'], true),

-- Interior
('INT-001', 'Racing Bucket Seat Pair with Harness', 'racing-bucket-seats',
 'FIA approved racing bucket seats with 4-point harness. Lightweight and durable construction.',
 'SeatPro Racing', '2b79ca74-d8b6-4b8b-9f62-cd8957403a6a', 850.00, 720.00, 6,
 ARRAY['racing seats', 'bucket', 'harness', 'fia'], true);

-- Add product images for the navigation system (main product)
INSERT INTO public.product_images (product_id, url, alt_text, sort_order, is_primary) VALUES
((SELECT id FROM products WHERE sku = 'NAV-001'), '/lovable-uploads/3bee92b0-dd87-47e3-8f8c-bc8ddb0e1044.png', 'AUDI A1 Android Navigation System', 0, true);

-- Create product variants table for different options
CREATE TABLE public.product_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL,
  name TEXT NOT NULL,
  sku TEXT NOT NULL,
  price_regular NUMERIC NOT NULL,
  price_merchant NUMERIC NOT NULL,
  stock_on_hand INTEGER NOT NULL DEFAULT 0,
  components TEXT,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  tenant_id UUID DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on product_variants
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

-- Create policy for public access to active variants
CREATE POLICY "public_select_product_variants" 
ON public.product_variants 
FOR SELECT 
USING (active = true);

-- Add variants for the AUDI navigation system
INSERT INTO public.product_variants (product_id, name, sku, price_regular, price_merchant, stock_on_hand, components, sort_order) VALUES
((SELECT id FROM products WHERE sku = 'NAV-001'), 'Android Casing Only', 'NAV-001-AC', 200.00, 160.00, 25, 'asd (AU-015N)', 1),
((SELECT id FROM products WHERE sku = 'NAV-001'), 'Socket Canbus Only', 'NAV-001-SC', 123.00, 98.00, 100, 'a123123 (cb-999)', 2),
((SELECT id FROM products WHERE sku = 'NAV-001'), 'Complete Package', 'NAV-001-CP', 323.00, 258.00, 25, 'asd (AU-015N), a123123 (cb-999)', 3);

-- Create trigger for updating timestamps
CREATE TRIGGER update_product_variants_updated_at
BEFORE UPDATE ON public.product_variants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();