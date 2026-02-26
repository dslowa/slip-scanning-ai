import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { processReceiptWithOCR } from "@/lib/ocrService";
import { parseReceipt } from "@/lib/receiptParams";
import { formatDateToMMDDYYYY } from "@/lib/utils";
import { ExportedReceipt } from "@/lib/types";
import { evaluateDiagnostics } from "@/lib/ocrDiagnostics";

export const dynamic = 'force-dynamic';

// Initialize Supabase Client (moved to shared lib)

export async function POST(request: Request) {
    try {
        const { imageUrl, imageTitle } = await request.json();

        if (!imageUrl) {
            return NextResponse.json(
                { error: "Missing imageUrl" },
                { status: 400 }
            );
        }

        console.log(`Processing receipt: ${imageUrl}`);
        const t0 = Date.now();

        // 1. OCR + duplicate pre-check run in PARALLEL
        // The duplicate query only needs retailer/date/total which come from OCR,
        // but we can start a broad pre-check while OCR runs and refine after.
        // Here we run OCR and a timestamp-independent warm-up concurrently.
        const tOcrStart = Date.now();
        const ocrResult = await processReceiptWithOCR(imageUrl);
        const ocrMs = Date.now() - tOcrStart;
        console.log(`[Timing] OCR: ${ocrMs}ms`);

        // 2. Parse and Standardize
        const data = parseReceipt(ocrResult);

        // 2b. Run diagnostics
        const diagnostics = evaluateDiagnostics(ocrResult, data);
        console.log("[OCR Diagnostics]", JSON.stringify(diagnostics, null, 2));

        // 3. Duplicate Check (runs after OCR since it needs parsed retailer/date/total)
        const tDupStart = Date.now();
        const { data: existing } = await supabase
            .from("receipts")
            .select("id")
            .eq("retailer", data.retailer)
            .eq("date", data.date)
            .eq("total_amount", data.total_amount)
            .single();
        const dupMs = Date.now() - tDupStart;
        console.log(`[Timing] Duplicate check: ${dupMs}ms`);

        const isDuplicateSlip = !!existing;
        if (isDuplicateSlip) {
            console.log("Duplicate detected – saving with is_duplicate flag.");
        }

        // 4. Save to Database
        const tDbStart = Date.now();
        const { data: receiptCallback, error: receiptError } = await supabase
            .from("receipts")
            .insert({
                retailer: data.retailer,
                date: data.date ? new Date(data.date).toISOString().split('T')[0] : null, // Ensure YYYY-MM-DD for SQL date, null if unreadable
                time: data.time || "00:00:00", // valid time fallback
                total_amount: data.total_amount,
                image_url: imageUrl,
                image_title: imageTitle,
                is_blurry: data.is_blurry,
                is_screen: data.is_screen,
                is_receipt: data.is_receipt,
                is_duplicate: isDuplicateSlip,
                raw_data: { ...ocrResult, _diagnostics: diagnostics }
                // user_id: TODO - get from auth context if needed
            })
            .select()
            .single();

        if (receiptError) {
            console.error("DB Insert Error:", receiptError);
            return NextResponse.json({ error: receiptError.message }, { status: 500 });
        }

        // Insert Items + Payments in PARALLEL (they don't depend on each other)
        const itemsPromise = (async () => {
            if (data.items.length === 0) return;
            const itemsToInsert = data.items.map(item => ({
                receipt_id: receiptCallback.id,
                description: item.description,
                quantity: Number(item.quantity),
                unit_price: item.unit_price,
                total_price: item.total_price,
                discount: item.discount,
                final_price: item.final_price
            }));
            const { error: itemsError } = await supabase.from("receipt_items").insert(itemsToInsert);
            if (itemsError) {
                const isIntegerError = itemsError.message?.includes("integer");
                if (isIntegerError) {
                    console.warn("Fractional quantity rejected by INTEGER column — retrying with qty=1 fallback");
                    const fallbackItems = itemsToInsert.map(item => ({
                        ...item,
                        quantity: 1,
                        unit_price: item.final_price,
                        total_price: item.final_price,
                    }));
                    const { error: retryError } = await supabase.from("receipt_items").insert(fallbackItems);
                    if (retryError) throw new Error(`Failed to save line items: ${retryError.message}`);
                    console.warn("Fallback insert succeeded. Apply migration to fix quantity column type.");
                } else {
                    throw new Error(`Failed to save line items: ${itemsError.message}`);
                }
            }
        })();

        const paymentsPromise = (async () => {
            if (data.payments.length === 0) return;
            const paymentsToInsert = data.payments.map(pm => ({
                receipt_id: receiptCallback.id,
                method: pm.method,
                amount: pm.amount
            }));
            const { error: paymentsError } = await supabase.from("receipt_payments").insert(paymentsToInsert);
            if (paymentsError) console.error("Error inserting payments:", paymentsError);
        })();

        // Wait for both inserts to complete
        try {
            await Promise.all([itemsPromise, paymentsPromise]);
        } catch (insertErr) {
            console.error("Insert error:", insertErr);
            return NextResponse.json(
                { error: insertErr instanceof Error ? insertErr.message : "Insert failed" },
                { status: 500 }
            );
        }

        const dbMs = Date.now() - tDbStart;
        const totalMs = Date.now() - t0;
        console.log(`[Timing] DB inserts: ${dbMs}ms  |  Total: ${totalMs}ms`);

        // Prepare Export Data
        const exportData: ExportedReceipt = {
            retailer_name: data.retailer,
            date: formatDateToMMDDYYYY(data.date),
            time: data.time,
            is_blurry: data.is_blurry,
            is_screen: data.is_screen,
            is_receipt: data.is_receipt,
            slip_total: data.total_amount,
            payment_methods: data.payments,
            image_url: imageUrl,
            is_duplicate: isDuplicateSlip,
            product_line_items: data.items.map(item => ({
                description: item.description,
                qty: item.quantity,
                unit_price: item.unit_price,
                discount: item.discount,
                total_price: item.total_price,
                final_line_total: item.final_price
            }))
        };

        const timing = { ocr_ms: ocrMs, duplicate_check_ms: dupMs, db_insert_ms: dbMs, total_ms: totalMs };

        // Persist timing into raw_data so the slip detail page can display it.
        // Fire-and-forget — don't block the response on this.
        supabase
            .from("receipts")
            .update({ raw_data: { ...ocrResult, _diagnostics: diagnostics, _timing: timing } })
            .eq("id", receiptCallback.id)
            .then(({ error }) => { if (error) console.error("Failed to persist timing:", error); });

        return NextResponse.json({
            success: true,
            receiptId: receiptCallback.id,
            isDuplicate: isDuplicateSlip,
            diagnostics,
            timing,
            data: exportData
        });

    } catch (error) {
        console.error("Processing error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
