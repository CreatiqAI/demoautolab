-- Installation Guides System
-- Enterprise merchants can access installation guides for various car models and products

-- Create installation_guides table
CREATE TABLE IF NOT EXISTS installation_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic Info
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL, -- 'Head Unit', 'Camera', 'Dashcam', 'Audio', 'Sensors', etc.
  difficulty_level VARCHAR(50) DEFAULT 'Medium', -- 'Easy', 'Medium', 'Hard', 'Expert'

  -- Car Information
  car_brand VARCHAR(100), -- 'Toyota', 'Honda', 'Proton', etc.
  car_model VARCHAR(100), -- 'Vios', 'City', 'X50', etc.
  car_year_start INTEGER,
  car_year_end INTEGER,

  -- Content
  video_url TEXT, -- YouTube or Vimeo URL
  video_duration VARCHAR(20), -- e.g., '15:30'
  thumbnail_url TEXT,
  pdf_url TEXT, -- Optional PDF guide

  -- Step-by-step instructions (JSON array)
  instructions_steps JSONB, -- [{step: 1, title: '...', description: '...', image_url: '...'}]

  -- Required tools and materials (JSON array)
  required_tools JSONB, -- ['Screwdriver', 'Wire stripper', 'Multimeter']
  required_materials JSONB, -- ['Wiring harness', 'Mounting bracket']

  -- Metadata
  estimated_time_minutes INTEGER, -- Total installation time
  views_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,

  -- Access Control
  is_published BOOLEAN DEFAULT false,
  requires_enterprise_plan BOOLEAN DEFAULT true,

  -- Tags for better searchability (JSON array)
  tags JSONB, -- ['installation', 'android player', 'toyota']

  -- SEO
  search_keywords TEXT, -- Space-separated keywords for search

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES customer_profiles(id),

  CONSTRAINT valid_year_range CHECK (car_year_end IS NULL OR car_year_end >= car_year_start)
);

-- Create guide_views table for tracking
CREATE TABLE IF NOT EXISTS guide_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID NOT NULL REFERENCES installation_guides(id) ON DELETE CASCADE,
  merchant_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  watch_duration_seconds INTEGER, -- How long they watched
  completed BOOLEAN DEFAULT false,

  CONSTRAINT unique_guide_view UNIQUE(guide_id, merchant_id, viewed_at)
);

-- Create guide_likes table
CREATE TABLE IF NOT EXISTS guide_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID NOT NULL REFERENCES installation_guides(id) ON DELETE CASCADE,
  merchant_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  liked_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_guide_like UNIQUE(guide_id, merchant_id)
);

-- Create guide_comments table for merchant feedback
CREATE TABLE IF NOT EXISTS guide_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID NOT NULL REFERENCES installation_guides(id) ON DELETE CASCADE,
  merchant_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  is_helpful BOOLEAN, -- Did this help them?
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert sample installation guides
INSERT INTO installation_guides (
  title, description, category, difficulty_level,
  car_brand, car_model, car_year_start, car_year_end,
  video_url, video_duration, thumbnail_url,
  estimated_time_minutes, is_published, search_keywords,
  tags, required_tools, required_materials, instructions_steps
) VALUES
  (
    'Android Player Installation - Toyota Vios',
    'Complete guide to installing an aftermarket Android head unit in Toyota Vios 2019-2023 models. Includes wiring harness setup and steering wheel control integration.',
    'Head Unit',
    'Medium',
    'Toyota',
    'Vios',
    2019,
    2023,
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    '15:30',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
    45,
    true,
    'toyota vios android player head unit installation 2019 2020 2021 2022 2023',
    '["android player", "toyota", "vios", "head unit", "steering control"]'::jsonb,
    '["Phillips screwdriver", "Panel removal tools", "Wire stripper", "Multimeter", "Electrical tape"]'::jsonb,
    '["Wiring harness adapter", "Mounting bracket", "GPS antenna", "USB extension cable"]'::jsonb,
    '[
      {"step": 1, "title": "Disconnect Battery", "description": "Safety first - disconnect the negative terminal", "duration": "2 min"},
      {"step": 2, "title": "Remove Factory Head Unit", "description": "Use panel tools to carefully remove trim and factory unit", "duration": "10 min"},
      {"step": 3, "title": "Connect Wiring Harness", "description": "Match wire colors and connect the harness adapter", "duration": "15 min"},
      {"step": 4, "title": "Install New Android Unit", "description": "Mount the new unit and secure with brackets", "duration": "10 min"},
      {"step": 5, "title": "Test All Functions", "description": "Reconnect battery and test audio, steering controls, and camera", "duration": "8 min"}
    ]'::jsonb
  ),
  (
    'Reverse Camera Installation - Honda City',
    'Step-by-step guide for installing a reverse camera in Honda City 2021-2024. Includes routing wires through the cabin.',
    'Camera',
    'Easy',
    'Honda',
    'City',
    2021,
    2024,
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    '8:45',
    'https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=800',
    30,
    true,
    'honda city reverse camera backup camera installation',
    '["reverse camera", "honda", "city", "backup camera", "parking"]'::jsonb,
    '["Drill with 20mm hole saw", "Phillips screwdriver", "Wire fish tape", "Electrical tape"]'::jsonb,
    '["Reverse camera", "RCA cable", "Power cable", "Rubber grommet"]'::jsonb,
    '[
      {"step": 1, "title": "Choose Camera Location", "description": "Mark the spot on rear bumper or license plate area", "duration": "3 min"},
      {"step": 2, "title": "Drill Mounting Hole", "description": "Carefully drill hole for camera and wiring", "duration": "5 min"},
      {"step": 3, "title": "Route Wires", "description": "Fish wires from trunk to head unit location", "duration": "12 min"},
      {"step": 4, "title": "Connect to Head Unit", "description": "Connect RCA video cable and reverse trigger wire", "duration": "8 min"},
      {"step": 5, "title": "Test and Adjust", "description": "Test camera view and adjust angle if needed", "duration": "2 min"}
    ]'::jsonb
  ),
  (
    'Dashcam Hardwire Installation - Proton X50',
    'Professional hardwire installation guide for dashcam in Proton X50. Includes parking mode setup.',
    'Dashcam',
    'Medium',
    'Proton',
    'X50',
    2020,
    NULL,
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    '12:20',
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800',
    40,
    true,
    'proton x50 dashcam hardwire installation parking mode',
    '["dashcam", "proton", "x50", "hardwire", "parking mode"]'::jsonb,
    '["Trim removal tools", "Wire tap connectors", "Multimeter", "Cable ties"]'::jsonb,
    '["Hardwire kit", "Fuse taps", "Cable clips"]'::jsonb,
    '[
      {"step": 1, "title": "Locate Fuse Box", "description": "Find the fuse box and identify ACC and constant power", "duration": "5 min"},
      {"step": 2, "title": "Install Fuse Taps", "description": "Install fuse taps for power connection", "duration": "8 min"},
      {"step": 3, "title": "Route Dashcam Cable", "description": "Hide cables behind headliner and A-pillar trim", "duration": "15 min"},
      {"step": 4, "title": "Ground Connection", "description": "Connect ground wire to chassis ground point", "duration": "5 min"},
      {"step": 5, "title": "Configure Parking Mode", "description": "Set up parking mode in dashcam settings", "duration": "7 min"}
    ]'::jsonb
  ),
  (
    'Component Speaker Upgrade - Perodua Myvi',
    'Upgrade factory speakers to component speakers in Perodua Myvi. Includes crossover wiring.',
    'Audio',
    'Medium',
    'Perodua',
    'Myvi',
    2018,
    NULL,
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    '20:15',
    'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800',
    60,
    true,
    'perodua myvi speaker upgrade component speakers audio',
    '["speakers", "perodua", "myvi", "component", "audio upgrade"]'::jsonb,
    '["Panel removal tools", "Phillips screwdriver", "Wire crimper", "Electrical tape"]'::jsonb,
    '["Component speaker set", "Speaker wire", "Speaker adapters", "Sound deadening material"]'::jsonb,
    '[
      {"step": 1, "title": "Remove Door Panels", "description": "Carefully remove door panels to access speakers", "duration": "10 min"},
      {"step": 2, "title": "Install Tweeters", "description": "Mount tweeters in A-pillar or door mirror triangle", "duration": "15 min"},
      {"step": 3, "title": "Install Woofers", "description": "Mount woofers in door with adapter brackets", "duration": "20 min"},
      {"step": 4, "title": "Wire Crossovers", "description": "Connect crossovers according to diagram", "duration": "10 min"},
      {"step": 5, "title": "Sound Deadening", "description": "Apply sound deadening material to doors", "duration": "5 min"}
    ]'::jsonb
  ),
  (
    '360 Camera System - Toyota Hilux',
    'Complete 360-degree camera system installation for Toyota Hilux. Includes all 4 cameras and control box setup.',
    'Camera',
    'Hard',
    'Toyota',
    'Hilux',
    2020,
    NULL,
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    '25:00',
    'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800',
    120,
    true,
    'toyota hilux 360 camera around view parking system',
    '["360 camera", "toyota", "hilux", "surround view", "parking assist"]'::jsonb,
    '["Drill", "Panel removal tools", "Wire fish tape", "Crimping tool", "Multimeter"]'::jsonb,
    '["360 camera kit", "Control box", "Trigger harness", "Mounting brackets", "RCA cables"]'::jsonb,
    '[
      {"step": 1, "title": "Plan Camera Positions", "description": "Mark positions for front, rear, and side cameras", "duration": "10 min"},
      {"step": 2, "title": "Install All Cameras", "description": "Mount and drill holes for all 4 cameras", "duration": "40 min"},
      {"step": 3, "title": "Route All Cables", "description": "Route cables from all cameras to control box location", "duration": "35 min"},
      {"step": 4, "title": "Install Control Box", "description": "Mount and wire control box behind head unit", "duration": "20 min"},
      {"step": 5, "title": "Calibrate System", "description": "Use calibration mode to align all camera views", "duration": "15 min"}
    ]'::jsonb
  ),
  (
    'Amplifier Installation - Honda Civic',
    'Install a 4-channel amplifier in Honda Civic. Includes power wiring, RCA routing, and speaker wire setup.',
    'Audio',
    'Hard',
    'Honda',
    'Civic',
    2016,
    NULL,
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    '18:30',
    'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800',
    90,
    true,
    'honda civic amplifier installation 4 channel power wiring',
    '["amplifier", "honda", "civic", "4 channel", "audio system"]'::jsonb,
    '["Wire stripper", "Crimping tool", "Drill", "Panel removal tools", "Multimeter"]'::jsonb,
    '["4-channel amplifier", "Power cable kit", "RCA cables", "Speaker wire", "Fuse holder", "Distribution block"]'::jsonb,
    '[
      {"step": 1, "title": "Plan Amplifier Location", "description": "Choose location in trunk with good ventilation", "duration": "5 min"},
      {"step": 2, "title": "Run Power Cable", "description": "Route power cable from battery through firewall to trunk", "duration": "25 min"},
      {"step": 3, "title": "Install Ground Wire", "description": "Connect ground to clean metal chassis ground point", "duration": "10 min"},
      {"step": 4, "title": "Run RCA and Remote", "description": "Route RCA cables and remote turn-on wire from head unit", "duration": "20 min"},
      {"step": 5, "title": "Connect Speakers", "description": "Wire speakers to amplifier outputs", "duration": "20 min"},
      {"step": 6, "title": "Tune Amplifier", "description": "Set gain, crossover, and EQ settings", "duration": "10 min"}
    ]'::jsonb
  )
ON CONFLICT DO NOTHING;

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_guide_views()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE installation_guides
  SET views_count = views_count + 1
  WHERE id = NEW.guide_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for view counting
DROP TRIGGER IF EXISTS trigger_increment_guide_views ON guide_views;
CREATE TRIGGER trigger_increment_guide_views
  AFTER INSERT ON guide_views
  FOR EACH ROW
  EXECUTE FUNCTION increment_guide_views();

-- Function to update likes count
CREATE OR REPLACE FUNCTION update_guide_likes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE installation_guides
    SET likes_count = likes_count + 1
    WHERE id = NEW.guide_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE installation_guides
    SET likes_count = likes_count - 1
    WHERE id = OLD.guide_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger for like counting
DROP TRIGGER IF EXISTS trigger_update_guide_likes ON guide_likes;
CREATE TRIGGER trigger_update_guide_likes
  AFTER INSERT OR DELETE ON guide_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_guide_likes();

-- Enable RLS
ALTER TABLE installation_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for installation_guides
CREATE POLICY "Published guides visible to enterprise merchants"
  ON installation_guides FOR SELECT
  USING (
    is_published = true
    AND (
      -- Enterprise merchants can see all
      EXISTS (
        SELECT 1 FROM customer_profiles cp
        JOIN premium_partnerships pp ON cp.id = pp.merchant_id
        WHERE cp.user_id = auth.uid()
        AND pp.subscription_plan = 'enterprise'
        AND pp.subscription_status = 'ACTIVE'
        AND pp.admin_approved = true
      )
      -- Or admins
      OR EXISTS (
        SELECT 1 FROM customer_profiles
        WHERE user_id = auth.uid()
        AND customer_type = 'admin'
      )
    )
  );

CREATE POLICY "Admins can manage all guides"
  ON installation_guides FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM customer_profiles
      WHERE user_id = auth.uid()
      AND customer_type = 'admin'
    )
  );

-- RLS Policies for guide_views
CREATE POLICY "Merchants can log their own views"
  ON guide_views FOR INSERT
  WITH CHECK (
    merchant_id IN (
      SELECT id FROM customer_profiles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Merchants can see their own views"
  ON guide_views FOR SELECT
  USING (
    merchant_id IN (
      SELECT id FROM customer_profiles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can see all views"
  ON guide_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM customer_profiles
      WHERE user_id = auth.uid()
      AND customer_type = 'admin'
    )
  );

-- RLS Policies for guide_likes
CREATE POLICY "Merchants can manage their own likes"
  ON guide_likes FOR ALL
  USING (
    merchant_id IN (
      SELECT id FROM customer_profiles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can see all likes"
  ON guide_likes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM customer_profiles
      WHERE user_id = auth.uid()
      AND customer_type = 'admin'
    )
  );

-- RLS Policies for guide_comments
CREATE POLICY "Merchants can manage their own comments"
  ON guide_comments FOR ALL
  USING (
    merchant_id IN (
      SELECT id FROM customer_profiles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all comments"
  ON guide_comments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM customer_profiles
      WHERE user_id = auth.uid()
      AND customer_type = 'admin'
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_guides_category ON installation_guides(category);
CREATE INDEX IF NOT EXISTS idx_guides_brand ON installation_guides(car_brand);
CREATE INDEX IF NOT EXISTS idx_guides_model ON installation_guides(car_model);
CREATE INDEX IF NOT EXISTS idx_guides_published ON installation_guides(is_published);
CREATE INDEX IF NOT EXISTS idx_guide_views_guide ON guide_views(guide_id);
CREATE INDEX IF NOT EXISTS idx_guide_views_merchant ON guide_views(merchant_id);
CREATE INDEX IF NOT EXISTS idx_guide_likes_guide ON guide_likes(guide_id);
CREATE INDEX IF NOT EXISTS idx_guide_comments_guide ON guide_comments(guide_id);

-- Create full-text search index
CREATE INDEX IF NOT EXISTS idx_guides_search ON installation_guides
  USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '') || ' ' || COALESCE(search_keywords, '')));

-- Grant permissions
GRANT ALL ON installation_guides TO authenticated;
GRANT ALL ON guide_views TO authenticated;
GRANT ALL ON guide_likes TO authenticated;
GRANT ALL ON guide_comments TO authenticated;
