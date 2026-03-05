import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { withRetry, fetchImageAsBase64, callAiProvider, exactStringMatch, numericMatch, resolveJsonPath, resizeImageIfTooLarge } from "@/lib/batchService";
import { AiProvider } from "@/lib/aiService";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Note: Using Service Role key if available to bypass RLS in the API route, else anon key
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey;
const supabase = createClient(supabaseUrl, serviceRoleKey);

// Original Gemini Prompt (Locked reference)
const GEMINI_PROMPT_LOCKED = `
You are a South African grocery till slip processor. Analyse this receipt image and extract structured data.
Return valid JSON according to the specified structure.

CRITICAL — DISCOUNT LINE HANDLING:
South African grocery slips (especially Shoprite, Checkers, and Checkers Hyper) show loyalty card discounts as SEPARATE line items with NEGATIVE prices. These discount lines typically start with "XTRASAVE", "SAVE", "DISC", "PROMO", "LOYALTY", "SMART SHOPPER", "WCARD", or contain negative values like -R5.00.

RULES:
1. NEVER return a discount line as its own item. Merge it into the product(s) IMMEDIATELY ABOVE it.
2. The "totalPrice" of a product must reflect what the customer ACTUALLY PAID after the discount.
3. Record the discount amount in the "discount" field.
4. The sum of ALL item totalPrice values MUST equal the receipt total (within R0.10 due to rounding).
5. If you cannot find a date PRINTED on the slip, return "date": null. DO NOT guess or use current date.
6. STRICT LEGIBILITY: Only extract the date if clearly readable. If faint or blurry, return null.

CRITICAL — QUANTITY HANDLING:
For grocery items sold by weight or any item where the quantity is not a simple integer (e.g. 0.45kg, 2.3kg, 0.500), ALWAYS set "quantity" to 1. In these cases, set the "unitPrice" to be the same as the "totalPrice" for that line item.

Required JSON Structure:
{
    "retailer": "string",
    "date": "string (YYYY-MM-DD) or null",
    "date_is_printed": boolean,
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

export async function POST(req: Request) {
    let currentSlipId: string | null = null;
    try {
        const body = await req.json();
        currentSlipId = body.slipId;

        if (!currentSlipId) return NextResponse.json({ error: "Missing slipId" }, { status: 400 });

        console.log(`[Batch Processor] Starting slip: ${currentSlipId}`);

        // 1. Fetch Slip Record & verify it's pending
        const { data: slip, error: slipError } = await supabase
            .from("batch_slips")
            .select("*")
            .eq("id", currentSlipId)
            .single();

        if (slipError || !slip) {
            console.error(`[Batch Processor] Slip NOT FOUND: ${currentSlipId}`);
            return NextResponse.json({ error: "Slip not found" }, { status: 404 });
        }

        // Set to processing immediately
        await supabase.from("batch_slips").update({ status: "processing" }).eq("id", currentSlipId);
        console.log(`[Batch Processor] Status set to processing: ${currentSlipId}`);

        // ... rest of the logic ...
        // (Skipping to the fetch image part for the replacement chunk)

        let imageUrl = slip.storage_path;
        if (!imageUrl.startsWith("http")) {
            const { data: urlData } = await supabase.storage.from("receipts").createSignedUrl(slip.storage_path, 3600);
            if (urlData?.signedUrl) imageUrl = urlData.signedUrl;
            else imageUrl = supabase.storage.from("receipts").getPublicUrl(slip.storage_path).data.publicUrl;
        }

        console.log(`[Batch Processor] Fetching image for ${currentSlipId}...`);
        let { base64Data, mimeType } = await fetchImageAsBase64(imageUrl);
        console.log(`[Batch Processor] Image fetched: ${mimeType}, size: ${base64Data.length} bytes`);

        // Check and resize if too large (Claude 5MB limit)
        base64Data = await resizeImageIfTooLarge(base64Data, 4);

        // 2. Fetch Admin Settings
        const { data: rawSettings } = await supabase.from("admin_settings").select("*");

        // Fallbacks
        const judgePromptSetting = rawSettings?.find(s => s.key === "judge_prompt")?.value || { version: "1.0", text: "You are a rigorous receipt judge. Extract retailer_name, slip_date (YYYY-MM-DD), and total_incl_vat. Return strict JSON. Do not guess." };
        const mappings = rawSettings?.find(s => s.key === "gemini_mapping")?.value || { retailer_path: "retailer", date_path: "date", total_path: "total" };

        const extractorConfig = rawSettings?.find(s => s.key === "extractor_config")?.value || { provider: "gemini", model: "gemini-1.5-flash" };
        const judgeConfig = rawSettings?.find(s => s.key === "judge_config")?.value || { provider: "gemini", model: "gemini-1.5-flash" };

        const extProvider = extractorConfig.provider as AiProvider;
        const extModel = extractorConfig.model;

        const jdgProvider = judgeConfig.provider as AiProvider;
        const jdgModel = judgeConfig.model;

        console.log(`[Batch Processor] Providers - Ext: ${extProvider} (${extModel}), Jdg: ${jdgProvider} (${jdgModel})`);

        let triageReasons: string[] = [];

        // ==========================================
        // 3. GEMINI RUN (Existing Logic wrapper)
        // ==========================================
        let geminiJson: any = null;
        let geminiRetailer = null;
        let geminiDate = null;
        let geminiTotal = null;

        try {
            console.log(`[Batch Processor] Calling Extractor AI...`);
            const geminiResult = await withRetry(() => callAiProvider(extProvider, extModel, GEMINI_PROMPT_LOCKED, base64Data, mimeType), 2);
            geminiJson = JSON.parse(geminiResult.text);

            geminiRetailer = resolveJsonPath(geminiJson, mappings.retailer_path);
            geminiDate = resolveJsonPath(geminiJson, mappings.date_path);
            geminiTotal = resolveJsonPath(geminiJson, mappings.total_path);

            if (geminiRetailer === null || geminiDate === null || geminiTotal === null) {
                triageReasons.push("Gemini missing required fields");
            }
        } catch (e: any) {
            console.error(`[Batch Processor] Extractor AI Error: ${e.message}`);
            triageReasons.push(`Gemini Parse/API Error: ${e.message}`);
        }

        // ==========================================
        // 4. JUDGE RUN
        // ==========================================
        let judgeJson: any = null;
        let judgeRetailer = null;
        let judgeDate = null;
        let judgeTotal = null;
        let confRetailer = 0;
        let confDate = 0;
        let confTotal = 0;
        let judgeNotes = "";

        try {
            console.log(`[Batch Processor] Calling Judge AI...`);
            const judgeResult = await withRetry(() => callAiProvider(jdgProvider, jdgModel, judgePromptSetting.text, base64Data, mimeType), 2);
            judgeJson = JSON.parse(judgeResult.text);

            judgeRetailer = judgeJson.retailer_name ?? null;
            judgeDate = judgeJson.slip_date ?? null;
            judgeTotal = judgeJson.total_incl_vat ?? null;

            confRetailer = judgeJson.confidence?.retailer_name || 0;
            confDate = judgeJson.confidence?.slip_date || 0;
            confTotal = judgeJson.confidence?.total_incl_vat || 0;
            judgeNotes = judgeJson.notes || "";

            if (judgeRetailer === null || judgeDate === null || judgeTotal === null) {
                triageReasons.push("Judge missing required fields");
            }

            const threshold = 0.75;
            if (confRetailer < threshold || confDate < threshold || confTotal < threshold) {
                triageReasons.push(`Judge confidence below ${threshold}`);
            }
        } catch (e: any) {
            console.error(`[Batch Processor] Judge AI Error: ${e.message}`);
            triageReasons.push(`Judge Parse/API Error: ${e.message}`);
        }

        // ==========================================
        // 5. COMPARISON & TRIAGE
        // ==========================================
        const matchRetailer = exactStringMatch(geminiRetailer, judgeRetailer);
        const matchDate = exactStringMatch(geminiDate, judgeDate);
        const matchTotal = numericMatch(geminiTotal, judgeTotal);

        if (matchRetailer === "NO") triageReasons.push("Retailer mismatch");
        if (matchDate === "NO") triageReasons.push("Date mismatch");
        if (matchTotal === "NO") triageReasons.push("Total mismatch");

        console.log(`[Triage] Slip: ${currentSlipId}, Reasons: ${triageReasons.length ? triageReasons.join(" | ") : "NONE"}`);

        const reviewRequired = triageReasons.length > 0 ? "YES" : "NO";
        const finalReason = triageReasons.join(" | ");

        console.log(`[Judge Stats] Retailer: ${judgeRetailer}, Date: ${judgeDate}, Total: ${judgeTotal}`);
        console.log(`[Judge Conf] Retailer: ${confRetailer}, Date: ${confDate}, Total: ${confTotal}`);

        // Correct Values (Judge is truth proxy if mismatch)
        const correctRetailer = matchRetailer === "NO" && judgeRetailer ? judgeRetailer : null;
        const correctDate = matchDate === "NO" && judgeDate ? judgeDate : null;
        const correctTotal = matchTotal === "NO" && judgeTotal !== null ? judgeTotal : null;

        // ==========================================
        // 6. UPDATE RECORD
        // ==========================================
        console.log(`[Batch Processor] Saving results for ${currentSlipId}...`);

        const updateData: any = {
            status: "completed",
            processed_at: new Date().toISOString(),

            // Gemini Output
            gemini_raw_json: geminiJson,
            gemini_retailer_name: geminiRetailer ? String(geminiRetailer) : null,
            gemini_slip_date: geminiDate ? String(geminiDate) : null,
            gemini_total_incl_vat: geminiTotal !== null && !isNaN(Number(geminiTotal)) ? Number(geminiTotal) : null,
            gemini_prompt_version: "original-v1",

            // Judge Output
            judge_raw_json: judgeJson,
            judge_retailer_name: judgeRetailer ? String(judgeRetailer) : null,
            judge_slip_date: judgeDate ? String(judgeDate) : null,
            judge_total_incl_vat: judgeTotal !== null && !isNaN(Number(judgeTotal)) ? Number(judgeTotal) : null,
            judge_conf_retailer: confRetailer,
            judge_conf_date: confDate,
            judge_conf_total: confTotal,
            judge_notes: judgeNotes,
            judge_prompt_version: judgePromptSetting.version,

            // Match Flags
            retailer_match: matchRetailer,
            date_match: matchDate,
            total_match: matchTotal,

            // Correct Values
            correct_retailer_name: correctRetailer ? String(correctRetailer) : null,
            correct_slip_date: correctDate ? String(correctDate) : null,
            correct_total_incl_vat: correctTotal !== null && !isNaN(Number(correctTotal)) ? Number(correctTotal) : null,

            // Triage
            review_required: reviewRequired,
            review_reason: finalReason || null,

            updated_at: new Date().toISOString()
        };

        // Note: These columns might be missing if the migration wasn't run yet.
        // We'll add them only if they exist in the schema or just try it.
        // To be safe and avoid "missing column" errors, we'll try a check or just omit for now
        // if the user hasn't run the migration.
        // Actually, let's just omit them to GET IT WORKING, and tell them to run migration for these.
        /*
        updateData.extractor_model = extModel;
        updateData.extractor_provider = extProvider;
        updateData.judge_model = jdgModel;
        updateData.judge_provider = jdgProvider;
        */

        const { error: updateError } = await supabase.from("batch_slips").update(updateData).eq("id", currentSlipId);

        if (updateError) {
            console.error(`[Batch Processor] DB Update FAILED for ${currentSlipId}:`, updateError);
            throw updateError;
        }

        console.log(`[Batch Processor] Slip ${currentSlipId} COMPLETED successfully.`);
        return NextResponse.json({ success: true, slipId: currentSlipId, reviewRequired, reason: finalReason });
    } catch (error: any) {
        console.error(`[Batch Processor] FATAL ERROR for ${currentSlipId}:`, error);

        // Try to update the slip status to error in DB so finishBatch can see it
        if (currentSlipId) {
            try {
                await supabase.from("batch_slips").update({
                    status: "error",
                    review_required: "YES",
                    review_reason: `System Error: ${error.message}`
                }).eq("id", currentSlipId);
                console.log(`[Batch Processor] Slip ${currentSlipId} marked as ERROR in DB.`);
            } catch (dbError: any) {
                console.error(`[Batch Processor] Failed to mark slip ${currentSlipId} as ERROR in DB:`, dbError.message);
            }
        }

        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
