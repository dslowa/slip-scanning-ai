-- ============================================
-- Slip Scanning AI - Initial Database Schema
-- ============================================

-- TABLE: slips
CREATE TABLE slips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  image_url text,
  user_id text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'auto_approved', 'auto_rejected', 'manual_review', 'approved', 'rejected', 'corrected')),
  ai_processed_at timestamp with time zone,
  ai_processing_time_ms integer,
  ai_model_used text,
  ai_cost_usd decimal(10,6),
  recommended_action text CHECK (recommended_action IN ('AUTO_APPROVE', 'AUTO_REJECT', 'MANUAL_REVIEW')),
  reviewed_by text,
  reviewed_at timestamp with time zone,
  review_notes text,

  -- Extracted data
  retailer_name text,
  store_branch text,
  slip_date date,
  slip_time time,
  total_amount decimal(10,2),
  vat_amount decimal(10,2),
  payment_method text,
  till_number text,
  receipt_number text,
  barcode_data text,
  line_items_count integer,

  -- Full AI response
  ai_response jsonb,
  extraction_confidence decimal(3,2),

  -- Validation
  approved_retailer boolean,
  slip_within_7_days boolean,
  is_valid boolean,

  -- Fraud
  fraud_risk_score decimal(3,2),
  fraud_risk_level text CHECK (fraud_risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
  is_direct_photo boolean,
  fraud_flags text[],

  -- Corrections
  corrected_data jsonb,
  was_corrected boolean DEFAULT false,

  -- Duplicate detection
  image_hash text,
  is_duplicate boolean DEFAULT false,
  duplicate_of uuid REFERENCES slips(id)
);

-- TABLE: slip_line_items
CREATE TABLE slip_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slip_id uuid REFERENCES slips(id) ON DELETE CASCADE,
  description text,
  quantity integer,
  unit_price decimal(10,2),
  total_price decimal(10,2),
  is_corrected boolean DEFAULT false,
  corrected_description text,
  corrected_quantity integer,
  corrected_unit_price decimal(10,2),
  corrected_total_price decimal(10,2),
  brand_campaign_match text
);

-- TABLE: moderators
CREATE TABLE moderators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text,
  role text CHECK (role IN ('admin', 'moderator')),
  created_at timestamp with time zone DEFAULT now()
);

-- TABLE: activity_log
CREATE TABLE activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slip_id uuid REFERENCES slips(id) ON DELETE CASCADE,
  moderator_id uuid REFERENCES moderators(id),
  action text CHECK (action IN ('approved', 'rejected', 'corrected', 'escalated', 'noted')),
  details text,
  created_at timestamp with time zone DEFAULT now()
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX idx_slips_status ON slips(status);
CREATE INDEX idx_slips_slip_date ON slips(slip_date);
CREATE INDEX idx_slips_retailer_name ON slips(retailer_name);
CREATE INDEX idx_slips_recommended_action ON slips(recommended_action);
CREATE INDEX idx_slips_fraud_risk_level ON slips(fraud_risk_level);
CREATE INDEX idx_slips_created_at ON slips(created_at);
CREATE INDEX idx_slips_image_hash ON slips(image_hash);

CREATE INDEX idx_slip_line_items_slip_id ON slip_line_items(slip_id);
CREATE INDEX idx_activity_log_slip_id ON activity_log(slip_id);
CREATE INDEX idx_activity_log_moderator_id ON activity_log(moderator_id);

-- ============================================
-- Storage bucket for slip images
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('slip-images', 'slip-images', false);

-- Storage policies: allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'slip-images');

-- Storage policies: allow authenticated users to read
CREATE POLICY "Allow authenticated reads"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'slip-images');

-- ============================================
-- Row Level Security
-- ============================================
ALTER TABLE slips ENABLE ROW LEVEL SECURITY;
ALTER TABLE slip_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderators ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated access (moderators)
CREATE POLICY "Moderators can view all slips"
  ON slips FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Moderators can update slips"
  ON slips FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Service role can insert slips"
  ON slips FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Moderators can view all line items"
  ON slip_line_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can insert line items"
  ON slip_line_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Moderators can update line items"
  ON slip_line_items FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Moderators can view moderators"
  ON moderators FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Moderators can view activity log"
  ON activity_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Moderators can insert activity log"
  ON activity_log FOR INSERT
  TO authenticated
  WITH CHECK (true);
