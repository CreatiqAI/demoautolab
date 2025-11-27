-- Route Management Database Schema
-- Run this SQL in your Supabase SQL Editor

-- 1. Create route_assignments table
CREATE TABLE IF NOT EXISTS public.route_assignments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    driver_id text NOT NULL,
    driver_name text NOT NULL,
    route_date date NOT NULL,
    departure_time time NOT NULL,
    status text NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed', 'cancelled')),
    total_distance numeric(10,2),
    total_duration integer, -- in minutes
    total_driving_time integer, -- in minutes
    estimated_fuel_cost numeric(10,2),
    route_efficiency numeric(5,2),
    optimization_method text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    notes text
);

-- 2. Create route_stops table
CREATE TABLE IF NOT EXISTS public.route_stops (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    route_assignment_id uuid NOT NULL REFERENCES public.route_assignments(id) ON DELETE CASCADE,
    stop_order integer NOT NULL,
    location_id text NOT NULL,
    location_address text NOT NULL,
    location_coordinates jsonb NOT NULL, -- {lat: number, lng: number}
    estimated_arrival_time timestamp with time zone,
    actual_arrival_time timestamp with time zone,
    estimated_travel_time integer, -- minutes from previous stop
    actual_travel_time integer, -- minutes from previous stop
    estimated_distance numeric(10,2), -- km from previous stop
    cumulative_time integer, -- total minutes from start
    cumulative_distance numeric(10,2), -- total km from start
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'arrived', 'completed', 'skipped')),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create route_orders table (many-to-many relationship between routes and orders)
CREATE TABLE IF NOT EXISTS public.route_orders (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    route_assignment_id uuid NOT NULL REFERENCES public.route_assignments(id) ON DELETE CASCADE,
    route_stop_id uuid NOT NULL REFERENCES public.route_stops(id) ON DELETE CASCADE,
    order_id uuid NOT NULL,
    order_number text NOT NULL,
    customer_name text NOT NULL,
    customer_phone text,
    delivery_status text NOT NULL DEFAULT 'assigned' CHECK (delivery_status IN ('assigned', 'out_for_delivery', 'delivered', 'failed', 'returned')),
    delivered_at timestamp with time zone,
    delivery_notes text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_route_assignments_driver_id ON public.route_assignments(driver_id);
CREATE INDEX IF NOT EXISTS idx_route_assignments_route_date ON public.route_assignments(route_date);
CREATE INDEX IF NOT EXISTS idx_route_assignments_status ON public.route_assignments(status);
CREATE INDEX IF NOT EXISTS idx_route_stops_route_assignment_id ON public.route_stops(route_assignment_id);
CREATE INDEX IF NOT EXISTS idx_route_stops_stop_order ON public.route_stops(route_assignment_id, stop_order);
CREATE INDEX IF NOT EXISTS idx_route_orders_route_assignment_id ON public.route_orders(route_assignment_id);
CREATE INDEX IF NOT EXISTS idx_route_orders_order_id ON public.route_orders(order_id);

-- 5. Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create triggers for updated_at
CREATE TRIGGER handle_updated_at_route_assignments
    BEFORE UPDATE ON public.route_assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_route_stops
    BEFORE UPDATE ON public.route_stops
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_route_orders
    BEFORE UPDATE ON public.route_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 7. Enable Row Level Security (RLS)
ALTER TABLE public.route_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_orders ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies (adjust based on your authentication setup)
-- Allow all operations for authenticated users (you can make this more restrictive)
CREATE POLICY "Allow all operations on route_assignments" ON public.route_assignments
    FOR ALL USING (true);

CREATE POLICY "Allow all operations on route_stops" ON public.route_stops
    FOR ALL USING (true);

CREATE POLICY "Allow all operations on route_orders" ON public.route_orders
    FOR ALL USING (true);

-- 9. Grant permissions
GRANT ALL ON public.route_assignments TO authenticated;
GRANT ALL ON public.route_stops TO authenticated;
GRANT ALL ON public.route_orders TO authenticated;
GRANT ALL ON public.route_assignments TO anon;
GRANT ALL ON public.route_stops TO anon;
GRANT ALL ON public.route_orders TO anon;