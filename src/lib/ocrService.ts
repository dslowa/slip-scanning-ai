import { callAiModel, AiProvider } from "./aiService";
import { supabase } from "./supabase";
import { OcrResponse } from "./types";
import { parseSafeNumber } from "./utils";

function buildSystemPrompt(): string {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return `
You are a South African grocery till slip processor. Analyse this till slip image and extract all data from it.

TODAY'S DATE (for context): ${today}
Use today's date ONLY to decode abbreviated 2-digit years (e.g. "26" → 2026). Never use it to fill in a missing date.
South African receipts commonly print dates as DD.MM.YY, DD/MM/YY, or DD.MM.YYYY — the FIRST number is always the day.

CRITICAL — YEAR PARSING:
When reading 2-digit years, carefully distinguish between "25" and "26" as they are easily misread:
- "25" = 2025 | "26" = 2026
- Double-check thermal print quality - faded dots can make "6" look like "5"
- If the year appears to be "25" but today's date is in 2026, verify carefully - it may be a misread "26"
- Context check: A receipt dated in 2025 when today is ${today} is likely expired/old

CRITICAL — SCREEN DETECTION:
Set "is_screen": true if the receipt is photographed from a digital screen (monitor/phone/tablet). Indicators: screen pixels/grid, glare, bezels, moiré patterns, UI elements (battery icons, scrollbars), or displayed in an app/viewer. Default to true if uncertain.

CRITICAL — MERCHANT NAME EXTRACTION:
Extract only the retailer brand, strip locations/branches/legal suffixes.
Standards: "DISCHEM PARKMORE PHARMACY" → "Dis-Chem" | "PICK N PAY FAMILY HYDE PARK" → "Pick n Pay" | "CHECKERS HYPER MALL OF AFRICA" → "Checkers" | "TOPS AT SPAR ROSEBANK" → "Spar" | "KWIKSPAR" → "Spar" | "SUPERSPAR" → "Spar" | "WOOLWORTHS FOOD SANDTON" → "Woolworths" | "CLICKS PHARMACY" → "Clicks" | "FOOD LOVER'S MARKET WATERFALL" → "Food Lover's Market" | "SHOPRITE LIQUORSHOP" → "Shoprite" | "OK GROCER" → "OK Foods" | "FRUIT & VEG CITY" → "Fruit & Veg City" | "MAKRO" → "Makro" | "GAME" → "Game" | "BOXER" → "Boxer" | "USAVE" → "Usave" | "CAMBRIDGE FOOD" → "Cambridge Food" | "LIQUOR CITY" → "Liquor City" | "ULTRA LIQUORS" → "Ultra Liquors"

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

// JSON Structure Definition
Return the result as a single JSON object with the following fields (use null for any field you cannot determine):
merchant_name (string),
date ({confidence: number, value: final string value should always be in dd/MM/yyyy format and always convert the original string value when in formats like DD.MM.YY, DD/MM/YY, or DD.MM.YYYY to the format dd/MM/yyyy}),
time ({confidence: number, value: string}),
total ({confidence: number, value: number}),
subtotal ({confidence: number, value: number}),
purchase_type (string),
is_receipt (boolean), is_blurry (boolean), is_screen (boolean), isDuplicate (boolean), isFraudulent (boolean),
trip_confidence (number), item_confidence (number),
products (array of {product_name, qty: {confidence, value}, price: {confidence, value}, totalPrice: {confidence, value}, rpn: {confidence, value}, rsd: {confidence, original_case_value, value}, line, upc, brand, size, item_type}),
paymentMethods (array of {amount: {confidence, value}, method: {confidence, value}}),
discounts (array of {description: {confidence, value}, line, price: {confidence, value}, relatedProductIndex}),
phones (array of {confidence, value}),
raw_text_array (array of strings), 
Return only the JSON object with no markdown formatting or code fences
`;
}

/**
 * Extracts the 'value' from a field if it's an object (common in AI responses), 
 * otherwise returns the field itself.
 */
function getAiValue(field: any): any {
    if (field && typeof field === 'object' && 'value' in field) {
        return field.value;
    }
    return field;
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
            const aiDate = getAiValue(data.date);
            return {
                banner_id: 0,
                date: (() => {
                    const confidence = typeof data.date_confidence === 'number' ? data.date_confidence : (data.date_is_printed ? 90 : 0);
                    const passesConfidence = data.date_is_printed && confidence >= 80 && !!aiDate;

                    if (!passesConfidence) {
                        return { confidence: confidence / 100, value: null };
                    }

                    // Code-level sanity checks
                    const parsed = new Date(aiDate);
                    const now = new Date();
                    const thirteenMonthsAgo = new Date(now);
                    thirteenMonthsAgo.setMonth(thirteenMonthsAgo.getMonth() - 13);

                    if (isNaN(parsed.getTime())) return { confidence: 0, value: null };
                    if (parsed > now) return { confidence: 0, value: null };
                    if (parsed < thirteenMonthsAgo) return { confidence: 0, value: null };

                    return { confidence: confidence / 100, value: aiDate };
                })(),
                isDigital: false,
                isFraudulent: false,
                is_blurry: data.is_blurry || false,
                is_receipt: data.is_receipt !== false,
                is_screen: data.is_screen || false,
                ocr_confidence: 0.9,
                paymentMethods: (data.paymentMethods || []).map((pm: { amount: any, method: string }) => ({
                    amount: { confidence: 0.9, value: parseSafeNumber(getAiValue(pm.amount)) },
                    method: { confidence: 0.9, value: getAiValue(pm.method) }
                })),
                products: (data.items || []).map((item: { quantity: any, unitPrice: any, totalPrice: any, description: string, discount?: any, discountDescription?: string }, i: number) => {
                    let finalQty = parseSafeNumber(getAiValue(item.quantity)) || 1;
                    let finalUnitPrice = parseSafeNumber(getAiValue(item.unitPrice));
                    let finalTotalPrice = parseSafeNumber(getAiValue(item.totalPrice));
                    let finalDiscount = parseSafeNumber(getAiValue(item.discount));

                    if (isNaN(finalQty) || finalQty % 1 !== 0 || finalQty <= 0) {
                        finalQty = 1;
                        finalUnitPrice = finalTotalPrice;
                    }

                    return {
                        line: i + 1,
                        price: { confidence: 0.9, value: finalUnitPrice },
                        qty: { confidence: 0.9, value: finalQty },
                        rsd: { confidence: 0.9, value: item.description },
                        totalPrice: { confidence: 0.9, value: finalTotalPrice },
                        product_name: item.description,
                        discount: finalDiscount,
                        discount_description: item.discountDescription || null
                    };
                }),
                total: { confidence: 0.9, value: parseSafeNumber(getAiValue(data.total)) },
                time: { confidence: 0.9, value: getAiValue(data.time) },
                merchant_detection_sources: { value: getAiValue(data.retailer) || getAiValue(data.merchant_name), confidence: 0.9 },
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
