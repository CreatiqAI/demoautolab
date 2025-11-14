-- Drop the existing function first
DROP FUNCTION IF EXISTS get_active_partnerships(text, text, text);

-- Recreate with shop_photos column included
CREATE OR REPLACE FUNCTION get_active_partnerships(
  p_state TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_service_type TEXT DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  business_name TEXT,
  business_type TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  postcode TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  description TEXT,
  services_offered TEXT[],
  operating_hours JSONB,
  website_url TEXT,
  facebook_url TEXT,
  instagram_url TEXT,
  subscription_plan TEXT,
  is_featured BOOLEAN,
  logo_url TEXT,
  cover_image_url TEXT,
  shop_photos TEXT[],
  total_views INTEGER,
  display_priority INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pp.id,
    pp.business_name,
    pp.business_type,
    pp.contact_phone,
    pp.contact_email,
    pp.address,
    pp.city,
    pp.state,
    pp.postcode,
    pp.latitude,
    pp.longitude,
    pp.description,
    pp.services_offered,
    pp.operating_hours,
    pp.website_url,
    pp.facebook_url,
    pp.instagram_url,
    pp.subscription_plan,
    pp.is_featured,
    pp.logo_url,
    pp.cover_image_url,
    pp.shop_photos,
    pp.total_views,
    pp.display_priority
  FROM premium_partnerships pp
  WHERE pp.subscription_status = 'ACTIVE'
    AND pp.admin_approved = true
    AND pp.subscription_end_date > NOW()
    AND (p_state IS NULL OR pp.state = p_state)
    AND (p_city IS NULL OR pp.city = p_city)
    AND (p_service_type IS NULL OR p_service_type = ANY(pp.services_offered))
  ORDER BY
    pp.is_featured DESC,
    pp.display_priority DESC,
    pp.created_at DESC;
END;
$$ LANGUAGE plpgsql;
