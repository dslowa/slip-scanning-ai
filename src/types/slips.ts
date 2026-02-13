export interface SlipLineItem {
  id: string;
  slip_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  is_corrected: boolean;
  corrected_description: string | null;
  corrected_quantity: number | null;
  corrected_unit_price: number | null;
  corrected_total_price: number | null;
  brand_campaign_match: string | null;
}

export interface ActivityLogEntry {
  id: string;
  slip_id: string;
  moderator_id: string | null;
  action: "approved" | "rejected" | "corrected" | "escalated" | "noted";
  details: string | null;
  created_at: string;
  moderator?: {
    name: string;
    email: string;
  };
}

export interface Slip {
  id: string;
  created_at: string;
  image_url: string | null;
  user_id: string | null;
  status: SlipStatus;
  ai_processed_at: string | null;
  ai_processing_time_ms: number | null;
  ai_model_used: string | null;
  ai_cost_usd: number | null;
  recommended_action: "AUTO_APPROVE" | "AUTO_REJECT" | "MANUAL_REVIEW" | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;

  // Extracted data
  retailer_name: string | null;
  store_branch: string | null;
  slip_date: string | null;
  slip_time: string | null;
  total_amount: number | null;
  vat_amount: number | null;
  payment_method: string | null;
  till_number: string | null;
  receipt_number: string | null;
  barcode_data: string | null;
  line_items_count: number | null;

  // Full AI response
  ai_response: Record<string, unknown> | null;
  extraction_confidence: number | null;

  // Validation
  approved_retailer: boolean | null;
  slip_within_7_days: boolean | null;
  is_valid: boolean | null;

  // Fraud
  fraud_risk_score: number | null;
  fraud_risk_level: "LOW" | "MEDIUM" | "HIGH" | null;
  is_direct_photo: boolean | null;
  fraud_flags: string[] | null;

  // Corrections
  corrected_data: Record<string, unknown> | null;
  was_corrected: boolean;

  // Duplicate detection
  image_hash: string | null;
  is_duplicate: boolean;
  duplicate_of: string | null;

  // Relations (loaded separately)
  line_items?: SlipLineItem[];
  activity_log?: ActivityLogEntry[];
}

export type SlipStatus =
  | "pending"
  | "processing"
  | "auto_approved"
  | "auto_rejected"
  | "manual_review"
  | "approved"
  | "rejected"
  | "corrected";

export interface CorrectedFields {
  [fieldName: string]: {
    original: string | number | null;
    corrected: string | number;
  };
}

export interface CorrectedLineItem {
  id: string;
  fields: {
    [fieldName: string]: {
      original: string | number | null;
      corrected: string | number;
    };
  };
}
