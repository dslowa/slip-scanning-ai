export type SlipStatus =
  | "pending"
  | "processing"
  | "auto_approved"
  | "auto_rejected"
  | "manual_review"
  | "approved"
  | "rejected"
  | "corrected";

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
  recommended_action: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
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
  ai_response: Record<string, unknown> | null;
  extraction_confidence: number | null;
  approved_retailer: boolean | null;
  slip_within_7_days: boolean | null;
  is_valid: boolean | null;
  fraud_risk_score: number | null;
  fraud_risk_level: "LOW" | "MEDIUM" | "HIGH" | null;
  is_direct_photo: boolean | null;
  fraud_flags: string[] | null;
  corrected_data: Record<string, unknown> | null;
  was_corrected: boolean;
  image_hash: string | null;
  is_duplicate: boolean;
  duplicate_of: string | null;
}

export interface SlipFilters {
  status: string;
  dateFrom: string;
  dateTo: string;
  retailer: string;
  riskLevel: string;
  search: string;
  sortBy: string;
}
