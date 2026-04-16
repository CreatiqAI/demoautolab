-- ============================================================================
-- PHASE 2: NOTIFICATION SYSTEM
-- Purpose: WhatsApp notification preferences and tracking
-- Date: 2025-12-07
-- ============================================================================

-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Channel preferences
  channel TEXT NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'email', 'sms', 'push')),

  -- Notification types
  type TEXT NOT NULL CHECK (type IN (
    'new_products',
    'order_placed',
    'order_status_updates',
    'payment_confirmation',
    'delivery_updates',
    'promotions',
    'shop_updates',
    'system_announcements',
    'review_responses',
    'secondhand_inquiries'
  )),

  -- Enabled/disabled
  enabled BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one preference per user per channel per type
  UNIQUE(user_id, channel, type)
);

-- Create notification_logs table (to track sent notifications)
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Notification details
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email', 'sms', 'push')),
  type TEXT NOT NULL,
  recipient TEXT NOT NULL, -- Phone number, email, or device token
  subject TEXT,
  message TEXT NOT NULL,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered', 'read')),
  error_message TEXT,

  -- External reference (e.g., Twilio message SID)
  external_id TEXT,

  -- Related entity
  related_entity_type TEXT, -- 'order', 'product', 'secondhand_listing', etc.
  related_entity_id UUID,

  -- Timestamps
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add WhatsApp opt-in fields to customer_profiles
ALTER TABLE customer_profiles
ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_opt_in BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS whatsapp_opt_in_date TIMESTAMPTZ;

-- Create indexes
CREATE INDEX idx_notification_preferences_user ON notification_preferences(user_id);
CREATE INDEX idx_notification_preferences_type ON notification_preferences(type);
CREATE INDEX idx_notification_preferences_enabled ON notification_preferences(enabled);
CREATE INDEX idx_notification_logs_user ON notification_logs(user_id);
CREATE INDEX idx_notification_logs_status ON notification_logs(status);
CREATE INDEX idx_notification_logs_created ON notification_logs(created_at DESC);
CREATE INDEX idx_notification_logs_type ON notification_logs(type);
CREATE INDEX idx_customer_profiles_whatsapp_opt_in ON customer_profiles(whatsapp_opt_in);

-- Add comments
COMMENT ON TABLE notification_preferences IS 'User notification preferences by channel and type';
COMMENT ON TABLE notification_logs IS 'Log of all sent notifications for tracking and debugging';
COMMENT ON COLUMN customer_profiles.whatsapp_number IS 'User WhatsApp number (may differ from phone)';
COMMENT ON COLUMN customer_profiles.whatsapp_opt_in IS 'User has opted in to receive WhatsApp notifications';

-- Enable Row Level Security
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_preferences

-- Policy: Users can view their own preferences
CREATE POLICY "Users can view their own notification preferences" ON notification_preferences
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Users can manage their own preferences
CREATE POLICY "Users can manage their own notification preferences" ON notification_preferences
  FOR ALL
  USING (user_id = auth.uid());

-- Policy: Admins can view all preferences
CREATE POLICY "Admins can view all notification preferences" ON notification_preferences
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for notification_logs

-- Policy: Users can view their own notification logs
CREATE POLICY "Users can view their own notification logs" ON notification_logs
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: System can insert notification logs
CREATE POLICY "System can insert notification logs" ON notification_logs
  FOR INSERT
  WITH CHECK (true);

-- Policy: Admins can view all notification logs
CREATE POLICY "Admins can view all notification logs" ON notification_logs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Function to create default notification preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  -- Create default WhatsApp notification preferences
  INSERT INTO notification_preferences (user_id, channel, type, enabled) VALUES
    (NEW.id, 'whatsapp', 'new_products', true),
    (NEW.id, 'whatsapp', 'order_placed', true),
    (NEW.id, 'whatsapp', 'order_status_updates', true),
    (NEW.id, 'whatsapp', 'payment_confirmation', true),
    (NEW.id, 'whatsapp', 'delivery_updates', true),
    (NEW.id, 'whatsapp', 'promotions', true),
    (NEW.id, 'whatsapp', 'shop_updates', false),
    (NEW.id, 'whatsapp', 'system_announcements', true),
    (NEW.id, 'whatsapp', 'review_responses', true),
    (NEW.id, 'whatsapp', 'secondhand_inquiries', true)
  ON CONFLICT (user_id, channel, type) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for default preferences
DROP TRIGGER IF EXISTS trigger_create_default_notification_preferences ON profiles;
CREATE TRIGGER trigger_create_default_notification_preferences
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_preferences();

-- Helper function to check if user wants notification
CREATE OR REPLACE FUNCTION should_send_notification(
  p_user_id UUID,
  p_channel TEXT,
  p_type TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  is_enabled BOOLEAN;
BEGIN
  SELECT enabled INTO is_enabled
  FROM notification_preferences
  WHERE user_id = p_user_id
    AND channel = p_channel
    AND type = p_type;

  RETURN COALESCE(is_enabled, false);
END;
$$ LANGUAGE plpgsql;
