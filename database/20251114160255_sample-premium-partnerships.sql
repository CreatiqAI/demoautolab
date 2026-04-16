-- =====================================================
-- SAMPLE PREMIUM PARTNERSHIPS DATA
-- =====================================================
-- This creates sample test data for testing the Find Shops page
-- Run this AFTER creating the premium_partnerships table

-- Note: You'll need to replace the merchant_id with actual customer_profile IDs from your database
-- To get a customer_profile ID, run: SELECT id FROM customer_profiles LIMIT 1;

-- Sample Partnership 1: Active Featured Shop in Kuala Lumpur
INSERT INTO premium_partnerships (
  merchant_id,
  business_name,
  business_type,
  contact_person,
  contact_phone,
  contact_email,
  address,
  city,
  state,
  postcode,
  latitude,
  longitude,
  description,
  services_offered,
  operating_hours,
  website_url,
  facebook_url,
  instagram_url,
  subscription_status,
  subscription_plan,
  monthly_fee,
  subscription_start_date,
  subscription_end_date,
  next_billing_date,
  admin_approved,
  is_featured,
  display_priority,
  shop_photos,
  logo_url
) VALUES (
  (SELECT id FROM customer_profiles LIMIT 1), -- Replace with actual merchant_id
  'Auto Lab Premium Workshop KL',
  'Car Workshop & Accessories',
  'Ahmad bin Abdullah',
  '+60123456789',
  'contact@autolabkl.com',
  'No 123, Jalan Bukit Bintang',
  'Kuala Lumpur',
  'Kuala Lumpur',
  '55100',
  3.1466,
  101.7072,
  'Premier auto workshop specializing in performance upgrades, maintenance, and installation services. Authorized Auto Lab partner with over 10 years of experience.',
  ARRAY['Installation Service', 'Repair & Maintenance', 'Consultation', 'Product Sourcing', 'Warranty Service', 'Custom Orders'],
  '{"monday": "9:00 AM - 6:00 PM", "tuesday": "9:00 AM - 6:00 PM", "wednesday": "9:00 AM - 6:00 PM", "thursday": "9:00 AM - 6:00 PM", "friday": "9:00 AM - 6:00 PM", "saturday": "9:00 AM - 3:00 PM", "sunday": "Closed"}'::jsonb,
  'https://example.com/autolabkl',
  'https://facebook.com/autolabkl',
  'https://instagram.com/autolabkl',
  'ACTIVE',
  'PREMIUM',
  149.00,
  NOW() - INTERVAL '1 month',
  NOW() + INTERVAL '11 months',
  NOW() + INTERVAL '1 month',
  true,
  true, -- Featured
  100, -- High priority
  ARRAY[
    'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800',
    'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=800'
  ],
  'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=200'
);

-- Sample Partnership 2: Active Shop in Selangor
INSERT INTO premium_partnerships (
  merchant_id,
  business_name,
  business_type,
  contact_person,
  contact_phone,
  contact_email,
  address,
  city,
  state,
  postcode,
  latitude,
  longitude,
  description,
  services_offered,
  operating_hours,
  subscription_status,
  subscription_plan,
  monthly_fee,
  subscription_start_date,
  subscription_end_date,
  next_billing_date,
  admin_approved,
  is_featured,
  display_priority,
  shop_photos
) VALUES (
  (SELECT id FROM customer_profiles LIMIT 1), -- Replace with actual merchant_id
  'Petaling Auto Accessories',
  'Auto Accessories Shop',
  'Lee Chong Wei',
  '+60198765432',
  'info@petalingauto.com',
  '45, Jalan SS2/24',
  'Petaling Jaya',
  'Selangor',
  '47300',
  3.1136,
  101.6239,
  'Your one-stop shop for all automotive accessories and parts. We carry premium Auto Lab products with professional installation available.',
  ARRAY['Installation Service', 'Product Sourcing', 'Delivery Available'],
  '{"monday": "10:00 AM - 8:00 PM", "tuesday": "10:00 AM - 8:00 PM", "wednesday": "10:00 AM - 8:00 PM", "thursday": "10:00 AM - 8:00 PM", "friday": "10:00 AM - 8:00 PM", "saturday": "10:00 AM - 8:00 PM", "sunday": "10:00 AM - 6:00 PM"}'::jsonb,
  'ACTIVE',
  'PREMIUM',
  149.00,
  NOW() - INTERVAL '2 months',
  NOW() + INTERVAL '10 months',
  NOW() + INTERVAL '1 month',
  true,
  false, -- Not featured
  50,
  ARRAY[
    'https://images.unsplash.com/photo-1625047509168-a7026f36de04?w=800',
    'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=800'
  ]
);

-- Sample Partnership 3: Active Shop in Johor
INSERT INTO premium_partnerships (
  merchant_id,
  business_name,
  business_type,
  contact_person,
  contact_phone,
  contact_email,
  address,
  city,
  state,
  postcode,
  description,
  services_offered,
  operating_hours,
  subscription_status,
  subscription_plan,
  monthly_fee,
  subscription_start_date,
  subscription_end_date,
  next_billing_date,
  admin_approved,
  display_priority,
  shop_photos
) VALUES (
  (SELECT id FROM customer_profiles LIMIT 1), -- Replace with actual merchant_id
  'JB Performance Center',
  'Performance Tuning Shop',
  'Kumar Selvam',
  '+60167891234',
  'service@jbperformance.com',
  '88, Jalan Tun Abdul Razak',
  'Johor Bahru',
  'Johor',
  '80000',
  'Specializing in performance tuning and racing modifications. Authorized Auto Lab performance parts dealer.',
  ARRAY['Installation Service', 'Repair & Maintenance', 'Consultation', 'Custom Orders'],
  '{"monday": "9:00 AM - 6:00 PM", "tuesday": "9:00 AM - 6:00 PM", "wednesday": "9:00 AM - 6:00 PM", "thursday": "9:00 AM - 6:00 PM", "friday": "9:00 AM - 6:00 PM", "saturday": "9:00 AM - 2:00 PM", "sunday": "Closed"}'::jsonb,
  'ACTIVE',
  'PREMIUM',
  149.00,
  NOW() - INTERVAL '15 days',
  NOW() + INTERVAL '11 months 15 days',
  NOW() + INTERVAL '1 month',
  true,
  75,
  ARRAY[
    'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800'
  ]
);

-- Sample Partnership 4: Pending Approval (Won't show on Find Shops)
INSERT INTO premium_partnerships (
  merchant_id,
  business_name,
  business_type,
  contact_person,
  contact_phone,
  contact_email,
  address,
  city,
  state,
  postcode,
  description,
  services_offered,
  operating_hours,
  subscription_status,
  subscription_plan,
  monthly_fee,
  subscription_start_date,
  subscription_end_date,
  admin_approved,
  display_priority
) VALUES (
  (SELECT id FROM customer_profiles LIMIT 1), -- Replace with actual merchant_id
  'Pending Auto Shop',
  'Auto Accessories',
  'Test User',
  '+60123456789',
  'test@test.com',
  'Test Address',
  'Penang',
  'Penang',
  '10000',
  'This shop is pending approval and should NOT appear on Find Shops page.',
  ARRAY['Installation Service'],
  '{}'::jsonb,
  'PENDING',
  'PREMIUM',
  149.00,
  NOW(),
  NOW() + INTERVAL '1 year',
  false, -- Not approved
  0
);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Sample premium partnerships created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Created 4 partnerships:';
  RAISE NOTICE '  - 3 ACTIVE & APPROVED (will show on Find Shops)';
  RAISE NOTICE '  - 1 PENDING (won''t show on Find Shops)';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  NOTE: All partnerships use the same merchant_id from customer_profiles.';
  RAISE NOTICE '    You should update them with different merchant IDs if needed.';
END $$;
