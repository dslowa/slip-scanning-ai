import { callAiModel, AiProvider } from "./aiService";
import { supabase } from "./supabase";
import { OcrResponse } from "./types";

function buildSystemPrompt(): string {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return `
You are a South African grocery till slip processor. Analyse this receipt image and extract structured data.
Return valid JSON according to the specified structure.

TODAY'S DATE (for context): ${today}
Use today's date ONLY to decode abbreviated 2-digit years (e.g. "26" → 2026). Never use it to fill in a missing date.
South African receipts commonly print dates as DD.MM.YY, DD/MM/YY, or DD.MM.YYYY — the FIRST number is always the day.

CRITICAL — DATE EXTRACTION:
The date on a till slip appears in ONE specific, labelled location. Per retailer:
- PICK N PAY: Very last line of the receipt — a row printed as "SLIP / TILL / CASHIER / DATE / TIME" followed by their values. The date is in the 4th column of that row in DD/MM/YY or DD/MM/YYYY format. If this row is cut off or not fully visible, return null.
- CHECKERS / SHOPRITE / CHECKERS HYPER: Bottom transaction block, labelled "DATE" or "DATUM". Format DD/MM/YYYY or DD.MM.YY.
- SPAR / TOPS AT SPAR: Bottom row labelled "SLIP / TILL / CASHIER / DATE / TIME", same format as Pick n Pay. The date is the 4th column value.
- WOOLWORTHS: Near the bottom, a clearly labelled field "Date:" or "DATE:" followed by the date value.
- CLICKS: Near the top or bottom of the receipt with a clear "Date:" label.
- ALL OTHER RETAILERS: Look for an explicitly labelled "DATE" or "Date" field only.

STRICT DATE RULES:
- You MUST identify the labelled "DATE" field on the receipt. Do NOT extract a date from anywhere else.
- The following are NOT dates and must NEVER be used as dates: Bonus Points counts, VAT amounts, receipt numbers, till numbers, cashier IDs, barcode numbers, item prices, Smart Shopper numbers, or any other numeric field.
- If the DATE row is cut off, folded, obscured, blurry, or not fully visible — return "date": null and "date_confidence": 0.
- If you cannot see both the label AND the value for the date field, return null.
- NEVER guess, infer, or construct a date. Only copy exactly what is printed in the date field.
- If your extracted date would be AFTER today (${today}), it is definitely wrong — return null.
- Set "date_source" to a short description of exactly where on the receipt you found the date (e.g. "DATE field in bottom TXN row"). If you cannot name a specific location, set date to null.

CRITICAL — DISCOUNT LINE HANDLING:
South African grocery slips (especially Shoprite, Checkers, and Checkers Hyper) show loyalty card discounts as SEPARATE line items with NEGATIVE prices. These discount lines typically start with "XTRASAVE", "SAVE", "DISC", "PROMO", "LOYALTY", "SMART SHOPPER", "WCARD", or contain negative values like -R5.00.

RULES:
1. NEVER return a discount line as its own item. Merge it into the product(s) IMMEDIATELY ABOVE it.
2. The "totalPrice" of a product must reflect what the customer ACTUALLY PAID after the discount.
3. Record the discount amount in the "discount" field.
4. The sum of ALL item totalPrice values MUST equal the receipt total (within R0.10 due to rounding).
5. If you cannot find a date PRINTED on the slip, return "date": null. DO NOT guess or use current date.
6. STRICT LEGIBILITY: Only extract the date if clearly readable. If faint or cut off or blurry, return null.

CRITICAL — QUANTITY HANDLING:
For grocery items sold by weight or any item where the quantity is not a simple integer (e.g. 0.45kg, 2.3kg, 0.500), ALWAYS set "quantity" to 1. In these cases, set the "unitPrice" to be the same as the "totalPrice" for that line item.

Required JSON Structure:
{
    "retailer": "string (the chain name only, e.g. 'MAKRO', 'PICK N PAY', 'SPAR')",
    "date": "string (YYYY-MM-DD) or null",
    "date_is_printed": boolean,
    "date_confidence": number (0-100: 100 = full date clearly visible and readable; 50 = partially visible; 0 = not visible or not found. Default to 0 if unsure),
    "date_source": "string describing exactly where you saw the date on the receipt, or null if not found",
    "time": "string (HH:MM) or null",
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
}

export async function processReceiptWithOCR(imageUrl: string): Promise<OcrResponse> {
    try {
        // 1. Fetch AI Config from DB
        const { data: settings } = await supabase.from("admin_settings").select("key, value");
        const extractorConfig = settings?.find(s => s.key === "slip_extractor_config")?.value || { provider: "gemini", model: "gemini-2.0-flash" };

        console.log(`Processing with ${extractorConfig.provider} (${extractorConfig.model})...`);

        // 2. Fetch image and convert to base64
        const tFetchStart = Date.now();
        const imgResponse = await fetch(imageUrl);
        if (!imgResponse.ok) throw new Error(`Failed to fetch image: ${imgResponse.statusText}`);
        const buffer = await imgResponse.arrayBuffer();
        const base64Data = Buffer.from(buffer).toString("base64");
        const mimeType = imgResponse.headers.get("content-type") || "image/jpeg";
        console.log(`[OCR Timing] Fetch + Base64: ${Date.now() - tFetchStart}ms`);

        // 3. Call AI Model
        const tAiStart = Date.now();
        const result = await callAiModel({
            provider: extractorConfig.provider as AiProvider,
            model: extractorConfig.model,
            systemPrompt: buildSystemPrompt(),
            base64Data,
            mimeType
        });

        const text = result.text;
        console.log(`[OCR Timing] AI API: ${Date.now() - tAiStart}ms`);
        console.log(`[OCR Stats] Response length: ${text.length} chars`);

        try {
            const data = JSON.parse(text);
            console.log(`[OCR Stats] Extracted items count: ${data.items?.length || 0}`);

            // Map to internal OcrResponse structure
            return {
                banner_id: 0,
                date: (() => {
                    const confidence = typeof data.date_confidence === 'number' ? data.date_confidence : (data.date_is_printed ? 90 : 0);
                    const passesConfidence = data.date_is_printed && confidence >= 80 && !!data.date;

                    if (!passesConfidence) {
                        return { confidence: confidence / 100, value: null };
                    }

                    // Code-level sanity checks
                    const parsed = new Date(data.date);
                    const now = new Date();
                    const thirteenMonthsAgo = new Date(now);
                    thirteenMonthsAgo.setMonth(thirteenMonthsAgo.getMonth() - 13);

                    if (isNaN(parsed.getTime())) return { confidence: 0, value: null };
                    if (parsed > now) return { confidence: 0, value: null };
                    if (parsed < thirteenMonthsAgo) return { confidence: 0, value: null };

                    return { confidence: confidence / 100, value: data.date };
                })(),
                isDigital: false,
                isFraudulent: false,
                is_blurry: data.is_blurry || false,
                is_receipt: data.is_receipt !== false,
                is_screen: data.is_screen || false,
                ocr_confidence: 0.9,
                paymentMethods: (data.paymentMethods || []).map((pm: { amount: number, method: string }) => ({
                    amount: { confidence: 0.9, value: pm.amount },
                    method: { confidence: 0.9, value: pm.method }
                })),
                products: (data.items || []).map((item: { quantity: unknown, unitPrice: unknown, totalPrice: unknown, description: string, discount?: number, discountDescription?: string }, i: number) => {
                    let finalQty = item.quantity;
                    let finalUnitPrice = item.unitPrice;

                    if (typeof finalQty !== 'number' || isNaN(finalQty) || finalQty % 1 !== 0) {
                        finalQty = 1;
                        finalUnitPrice = item.totalPrice;
                    }

                    return {
                        line: i + 1,
                        price: { confidence: 0.9, value: finalUnitPrice },
                        qty: { confidence: 0.9, value: finalQty },
                        rsd: { confidence: 0.9, value: item.description },
                        totalPrice: { confidence: 0.9, value: item.totalPrice },
                        product_name: item.description,
                        discount: item.discount || 0,
                        discount_description: item.discountDescription || null
                    };
                }),
                total: { confidence: 0.9, value: data.total },
                time: { confidence: 0.9, value: data.time },
                merchant_detection_sources: { value: data.retailer, confidence: 0.9 },
                gemini_raw_response: text,
                usage: result.usage
            };

        } catch (parseError) {
            console.error("JSON Parse Error:", parseError);
            console.error("Raw text:", text);
            throw new Error("Failed to parse OCR response");
        }

    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "OCR Processing Failed";
        console.error("AI OCR Failed:", errorMessage);
        throw new Error(errorMessage);
    }
}
