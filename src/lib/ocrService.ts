import { GoogleGenerativeAI } from "@google/generative-ai";
import { OcrResponse } from "./types";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function processReceiptWithOCR(imageUrl: string): Promise<OcrResponse> {
    if (!GEMINI_API_KEY) {
        console.warn("GEMINI_API_KEY not found. Using Mock Service.");
        return processReceiptWithMock();
    }

    try {
        console.log("Processing with Gemini Flash...");
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        // Detect MIME type from URL — no server-side download needed
        const mimeType = imageUrl.toLowerCase().includes(".png") ? "image/png" : "image/jpeg";

        const prompt = `
You are a South African grocery till slip processor. Analyse this receipt image and extract structured data.
Return ONLY valid JSON — no markdown, no code fences, no explanation.

CRITICAL — DISCOUNT LINE HANDLING:

South African grocery slips (especially Shoprite, Checkers, and Checkers Hyper) show loyalty card discounts as SEPARATE line items with NEGATIVE prices. These discount lines typically start with "XTRASAVE", "SAVE", "DISC", "PROMO", "LOYALTY", "SMART SHOPPER", "WCARD", or contain negative values like -R5.00.

YOU MUST FOLLOW THESE RULES:

RULE 1: NEVER return a discount line as its own item. Discount lines must ALWAYS be merged into the product(s) they apply to.

RULE 2: A discount line applies to the product(s) IMMEDIATELY ABOVE it. Merge the discount by:
- Subtracting the discount from the product's totalPrice
- Recording the discount amount in the "discount" field
- The "totalPrice" must reflect what the customer ACTUALLY PAID after the discount

RULE 3: SIMPLE DISCOUNT (one discount, one product above):
On the slip:
  MIAMI ATCHR 780G          R84.99
  XTRASAVE ATCHAR           -R5.00
Return as ONE item:
{
  "description": "MIAMI ATCHR 780G",
  "quantity": 1,
  "unitPrice": 84.99,
  "totalPrice": 79.99,
  "discount": 5.00,
  "discountDescription": "XTRASAVE ATCHAR"
}

RULE 4: MULTI-PRODUCT DISCOUNT (one discount applies to multiple products above it):
Sometimes a single discount line covers 2 or more products listed above it. This happens with "buy X get Y off" or combo deals. In this case, apply the FULL discount to the LAST product before the discount line, and note in discountDescription that it's a multi-buy discount.

Example on the slip:
  DORITOS 145G              R23.99
  DORITOS 145G              R23.99
  DORITOS 145G              R23.99
  XTRASAVE DORITOS          -R12.97
Return as:
{"description":"DORITOS 145G","quantity":1,"unitPrice":23.99,"totalPrice":23.99,"discount":0,"discountDescription":null},
{"description":"DORITOS 145G","quantity":1,"unitPrice":23.99,"totalPrice":23.99,"discount":0,"discountDescription":null},
{"description":"DORITOS 145G","quantity":1,"unitPrice":23.99,"totalPrice":11.02,"discount":12.97,"discountDescription":"XTRASAVE DORITOS (multi-buy)"}

RULE 5: CROSS-PRODUCT DISCOUNT (one discount covers different product types above it):
Example:
  BACON SHLDR 200G   2 @    R85.98
  BACON DICD 200G    2 @    R79.98
  XTRASAVE BACON            -R34.00
Apply the full discount to the last product before the discount line:
{"description":"BACON SHLDR 200G","quantity":2,"unitPrice":42.99,"totalPrice":85.98,"discount":0,"discountDescription":null},
{"description":"BACON DICD 200G","quantity":2,"unitPrice":39.99,"totalPrice":45.98,"discount":34.00,"discountDescription":"XTRASAVE BACON (multi-buy)"}

RULE 6: The sum of ALL item totalPrice values MUST equal the receipt total. Discrepancies of up to R0.10 are acceptable due to cash rounding (see Rule 8).

RULE 7: Items with NO discount should have discount: 0 and discountDescription: null.

RULE 8: SOUTH AFRICAN CASH ROUNDING:
Cash transactions are rounded to the nearest 5 or 10 cents (e.g., R437.12 becomes R437.10).
- If the slip contains a "Rounding", "Round", or "Cash Round" line item, DO NOT return it as a product.
- If the sum of items (e.g., R437.12) differs from the "Total" (e.g., R437.10) by 5c or less, accept the item sum as the source of truth for the items.
- The 'total' field in the JSON should reflect the final Total as printed on the slip.

EXTRACTION RULES:
- South African currency is ZAR. All amounts as numbers, no symbols.
- Date formats: DD/MM/YYYY, DD-MM-YYYY. Return as YYYY-MM-DD.
- Extract quantities from "2 @", "x2", "QTY 2" notations.
- Never hallucinate — use null if unreadable.

QUALITY CHECKS:
- is_blurry: true if image too blurry to read
- is_screen: true if screenshot or photo of a screen
- is_receipt: false if not a receipt

Required JSON Structure:
{
    "retailer": "string",
    "date": "string (YYYY-MM-DD)",
    "time": "string (HH:MM)",
    "total": number,
    "paymentMethods": [{"method": "string", "amount": number}],
    "items": [
        {
            "description": "string",
            "quantity": number,
            "unitPrice": number,
            "totalPrice": number,
            "discount": number,
            "discountDescription": "string or null"
        }
    ],
    "is_blurry": boolean,
    "is_screen": boolean,
    "is_receipt": boolean
}
`;

        // Pass image URL directly to Gemini — it fetches the image itself.
        // This removes a full server-side download+encode step (~0.3–1s saved).
        const result = await model.generateContent([
            prompt,
            {
                fileData: {
                    fileUri: imageUrl,
                    mimeType,
                },
            },
        ]);

        const response = await result.response;
        const text = response.text();
        console.log("Gemini Raw Response:", text); // Debug log

        // Clean markdown code blocks if present
        const jsonString = text.replace(/```json/g, "").replace(/```/g, "").trim();

        try {
            const data = JSON.parse(jsonString);

            // Map to internal OcrResponse structure
            return {
                banner_id: 0,
                date: { confidence: 0.9, value: data.date },
                isDigital: false,
                isFraudulent: false,
                is_blurry: data.is_blurry || false,
                is_receipt: data.is_receipt !== false, // Default true
                is_screen: data.is_screen || false,
                ocr_confidence: 0.9,
                paymentMethods: (data.paymentMethods || []).map((pm: { amount: number; method: string }) => ({
                    amount: { confidence: 0.9, value: pm.amount },
                    method: { confidence: 0.9, value: pm.method }
                })),
                products: (data.items || []).map((item: {
                    unitPrice: number;
                    quantity: number;
                    description: string;
                    totalPrice: number;
                    discount: number;
                    discountDescription: string | null;
                }, i: number) => ({
                    line: i + 1,
                    price: { confidence: 0.9, value: item.unitPrice },
                    qty: { confidence: 0.9, value: item.quantity },
                    rsd: { confidence: 0.9, value: item.description },
                    totalPrice: { confidence: 0.9, value: item.totalPrice },
                    product_name: item.description,
                    discount: item.discount || 0,
                    discount_description: item.discountDescription || null
                })),
                total: { confidence: 0.9, value: data.total },
                time: { confidence: 0.9, value: data.time },
                merchant_detection_sources: { value: data.retailer, confidence: 0.9 },
                gemini_raw_response: text,
            } as OcrResponse;

        } catch (parseError) {
            console.error("JSON Parse Error:", parseError);
            console.error("Failed JSON String:", jsonString);
            throw new Error("Failed to parse OCR response");
        }

    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "OCR Processing Failed";
        console.error("Gemini OCR Failed:", errorMessage);
        throw new Error(errorMessage);
    }
}

async function processReceiptWithMock(): Promise<OcrResponse> {
    // Simulate network latency
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Mock response based on the user provided JSON
    const mockResponse: OcrResponse = {
        "banner_id": 0,
        "date": {
            "confidence": 99.1866683959961,
            "value": "01/12/2025"
        },
        "isDigital": false,
        "isFraudulent": false,
        "is_blurry": false,
        "is_receipt": true,
        "is_screen": false,
        "ocr_confidence": 96.30787658691406,
        "paymentMethods": [
            {
                "amount": { "confidence": 100, "value": 141.1 },
                "method": { "confidence": 99.98564910888672, "value": "Cash" }
            }
        ],
        "products": [
            {
                "line": 1009,
                "price": { "confidence": 99.98662567138672, "value": 12.99 },
                "qty": { "confidence": 100, "value": 1 },
                "rsd": { "confidence": 99.76820373535156, "value": "MESSARIS BUBBLES 100GR" },
                "totalPrice": { "confidence": 100, "value": 12.99 },
                "product_name": "MESSARIS BUBBLES 100GR"
            }
            // ... (rest of mock data can be simplified or full list)
        ],
        "total": { "confidence": 95, "value": 141.13 },
        "time": { "confidence": 99.1866683959961, "value": "19:00" },
        "merchant_detection_sources": { "confidence": 99, "value": "SPAR" }
    };

    return mockResponse;
}
