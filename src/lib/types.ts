export interface OcrProduct {
  line: number;
  price: { confidence: number; value: number };
  qty: { confidence: number; value: number };
  rsd: { confidence: number; value: string; original_case_value?: string };
  totalPrice: { confidence: number; value: number };
  product_name?: string;
  infoLines?: { text: { value: string }; type: { value: string } }[];
}

export interface OcrResponse {
  banner_id: number;
  date: { confidence: number; value: string };
  isDigital: boolean;
  isFraudulent: boolean;
  is_blurry: boolean;
  is_receipt: boolean;
  is_screen: boolean;
  ocr_confidence: number;
  paymentMethods: {
    amount: { confidence: number; value: number };
    method: { confidence: number; value: string };
  }[];
  products: OcrProduct[];
  total: { confidence: number; value: number };
  time: { confidence: number; value: string };
  merchant_detection_sources?: { value: string; confidence: number };
  raw_trip_header?: string;
  raw_text_array?: string[];
}

export interface ProcessedReceipt {
  retailer: string;
  date: string;
  time: string;
  total_amount: number;
  is_blurry: boolean;
  is_screen: boolean;
  is_receipt: boolean;
  items: ProcessedItem[];
  payments: ProcessedPayment[];
}

export interface ProcessedItem {
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  discount: number;
  final_price: number;
}

export interface ProcessedPayment {
  method: string;
  amount: number;
}

export interface ExportedReceipt {
  retailer_name: string;
  date: string; // MM/DD/YYYY
  time: string;
  is_blurry: boolean;
  is_screen: boolean;
  is_receipt: boolean;
  slip_total: number;
  payment_methods: { method: string; amount: number }[];
  image_url: string;
  is_duplicate: boolean;
  product_line_items: ExportedItem[];
}

export interface ExportedItem {
  description: string;
  qty: number;
  unit_price: number;
  discount: number;
  total_price: number; // qty * unit_price
  final_line_total: number; // after discount
}
