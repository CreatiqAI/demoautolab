-- Create notification preferences table
-- This table stores user notification settings for WhatsApp notifications

-- Drop existing table and dependencies first
DROP TRIGGER IF EXISTS trigger_create_notification_preferences ON customer_profiles;
DROP FUNCTION IF EXISTS create_default_notification_preferences() CASCADE;
DROP TABLE IF EXISTS notification_preferences CASCADE;

-- Create the table
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,

  -- Notification types (all default to true for new users)
  notify_new_products BOOLEAN DEFAULT true,
  notify_car_news BOOLEAN DEFAULT true,
  notify_promotions BOOLEAN DEFAULT true,
  notify_order_status BOOLEAN DEFAULT true,

  -- WhatsApp notification settings
  whatsapp_enabled BOOLEAN DEFAULT true,
  phone_number TEXT, -- User's registered phone number for WhatsApp

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one preference record per customer
  UNIQUE(customer_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_notification_preferences_customer_id
ON notification_preferences(customer_id);

-- Enable RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view and update their own notification preferences
CREATE POLICY "Users can view their own notification preferences"
ON notification_preferences
FOR SELECT
USING (
  customer_id IN (
    SELECT id FROM customer_profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own notification preferences"
ON notification_preferences
FOR INSERT
WITH CHECK (
  customer_id IN (
    SELECT id FROM customer_profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own notification preferences"
ON notification_preferences
FOR UPDATE
USING (
  customer_id IN (
    SELECT id FROM customer_profiles WHERE user_id = auth.uid()
  )
);

-- Function to automatically create notification preferences for new customers
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Get phone number from customer profile
  INSERT INTO notification_preferences (
    customer_id,
    notify_new_products,
    notify_car_news,
    notify_promotions,
    notify_order_status,
    whatsapp_enabled,
    phone_number
  ) VALUES (
    NEW.id,
    true, -- Default: enable new products notifications
    true, -- Default: enable car news notifications
    true, -- Default: enable promotions notifications
    true, -- Default: enable order status notifications
    true, -- Default: enable WhatsApp notifications
    NEW.phone -- Get phone from customer_profiles
  )
  ON CONFLICT (customer_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Trigger to create default notification preferences when customer profile is created
DROP TRIGGER IF EXISTS trigger_create_notification_preferences ON customer_profiles;
CREATE TRIGGER trigger_create_notification_preferences
AFTER INSERT ON customer_profiles
FOR EACH ROW
EXECUTE FUNCTION create_default_notification_preferences();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON notification_preferences TO authenticated;

COMMENT ON TABLE notification_preferences IS 'Stores user notification preferences for WhatsApp notifications including new products, car news, promotions, and order status updates';
