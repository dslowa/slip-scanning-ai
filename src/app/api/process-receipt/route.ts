import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { processReceiptWithOCR } from "@/lib/ocrService";
import { parseReceipt } from "@/lib/receiptParams";
import { evaluateDiagnostics } from "@/lib/ocrDiagnostics";

export const dynamic = 'force-dynamic';

// Initialize Supabase Client (moved to shared lib)

export async function POST(request: Request) {
    try {
        const { imageUrl, imageTitle } = await request.json();

        if (!imageUrl) {
            return NextResponse.json({ error: "Missing imageUrl" }, { status: 400 });
        }

        // 1. Create Initial Record (Status: Processing)
        // This allows the UI to return immediately
        const { data: receiptPending, error: initialError } = await supabase
            .from("receipts")
            .insert({
                image_url: imageUrl,
                image_title: imageTitle,
                retailer: "Scanning...", // Placeholder
                is_receipt: true, // Default
                raw_data: { status: "processing" }
            })
            .select()
            .single();

        if (initialError) {
            console.error("Initial DB Insert Error:", initialError);
            return NextResponse.json({ error: initialError.message }, { status: 500 });
        }

        // 2. Start Background Processing (Non-blocking)
        // We do NOT await this. It fires into the background.
        (async () => {
            const t0 = Date.now();
            try {
                console.log(`[Background] Starting OCR for: ${receiptPending.id}`);
                const ocrResult = await processReceiptWithOCR(imageUrl);
                const data = parseReceipt(ocrResult);
                const diagnostics = evaluateDiagnostics(ocrResult, data);

                // Duplicate Check
                const { data: existing } = await supabase
                    .from("receipts")
                    .select("id")
                    .eq("retailer", data.retailer)
                    .eq("date", data.date)
                    .eq("total_amount", data.total_amount)
                    .neq("id", receiptPending.id) // Don't match self
                    .limit(1);

                const isDuplicateSlip = !!existing;

                // Update Main Record
                const { error: updateError } = await supabase
                    .from("receipts")
                    .update({
                        retailer: data.retailer,
                        date: data.date ? new Date(data.date).toISOString().split('T')[0] : null,
                        time: data.time || "00:00:00",
                        total_amount: data.total_amount,
                        is_blurry: data.is_blurry,
                        is_screen: data.is_screen,
                        is_receipt: data.is_receipt,
                        is_duplicate: isDuplicateSlip,
                        raw_data: { ...ocrResult, _diagnostics: diagnostics, _timing: { total_ms: Date.now() - t0 } }
                    })
                    .eq("id", receiptPending.id);

                if (updateError) throw updateError;

                // Insert Items
                if (data.items.length > 0) {
                    const itemsToInsert = data.items.map(item => ({
                        receipt_id: receiptPending.id,
                        description: item.description,
                        quantity: Number(item.quantity),
                        unit_price: item.unit_price,
                        total_price: item.total_price,
                        discount: item.discount,
                        final_price: item.final_price
                    }));
                    await supabase.from("receipt_items").insert(itemsToInsert);
                }

                // Insert Payments
                if (data.payments.length > 0) {
                    const paymentsToInsert = data.payments.map(pm => ({
                        receipt_id: receiptPending.id,
                        method: pm.method,
                        amount: pm.amount
                    }));
                    await supabase.from("receipt_payments").insert(paymentsToInsert);
                }

                console.log(`[Background] Finished processing: ${receiptPending.id} in ${Date.now() - t0}ms`);

            } catch (err) {
                console.error(`[Background] Failed processing: ${receiptPending.id}`, err);
                await supabase
                    .from("receipts")
                    .update({
                        retailer: "ERROR",
                        raw_data: { status: "error", error: err instanceof Error ? err.message : "Internal Error" }
                    })
                    .eq("id", receiptPending.id);
            }
        })();

        // 3. Return Receipt ID immediately
        return NextResponse.json({
            success: true,
            receiptId: receiptPending.id,
            status: "processing"
        });

    } catch (error) {
        console.error("Endpoint Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
