import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { processReceiptWithOCR } from "@/lib/ocrService";
import { parseReceipt } from "@/lib/receiptParams";
import { formatDateToMMDDYYYY } from "@/lib/utils";
import { ExportedReceipt } from "@/lib/types";

export const dynamic = 'force-dynamic';

// Initialize Supabase Client (moved to shared lib)

export async function POST(request: Request) {
    try {
        const { imageUrl } = await request.json();

        if (!imageUrl) {
            return NextResponse.json(
                { error: "Missing imageUrl" },
                { status: 400 }
            );
        }

        console.log(`Processing receipt: ${imageUrl}`);

        // 1. Process with OCR (Mock or Real)
        const ocrResult = await processReceiptWithOCR(imageUrl);

        // 2. Parse and Standardize
        const data = parseReceipt(ocrResult);

        // 3. Duplicate Check
        // Create a fingerprint based on specific fields
        // (Retailer + Date + Total) is a good start
        const { data: existing } = await supabase
            .from("receipts")
            .select("id")
            .eq("retailer", data.retailer)
            .eq("date", data.date)
            .eq("total_amount", data.total_amount)
            .single();

        let isDuplicate = false;
        if (existing) {
            console.log("Duplicate detected!");
            isDuplicate = true;
        }

        // 4. Save to Database
        // Insert Receipt
        const { data: receiptCallback, error: receiptError } = await supabase
            .from("receipts")
            .insert({
                retailer: data.retailer,
                date: new Date(data.date).toISOString().split('T')[0], // Ensure YYYY-MM-DD for SQL date
                time: data.time || "00:00:00", // valid time fallback
                total_amount: data.total_amount,
                image_url: imageUrl,
                is_blurry: data.is_blurry,
                is_screen: data.is_screen,
                is_receipt: data.is_receipt,
                is_duplicate: isDuplicate,
                raw_data: ocrResult
                // user_id: TODO - get from auth context if needed
            })
            .select()
            .single();

        if (receiptError) {
            console.error("DB Insert Error:", receiptError);
            return NextResponse.json({ error: receiptError.message }, { status: 500 });
        }

        // Insert Items
        if (data.items.length > 0) {
            const itemsToInsert = data.items.map(item => ({
                receipt_id: receiptCallback.id,
                description: item.description,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total_price: item.total_price,
                discount: item.discount,
                final_price: item.final_price
            }));

            const { error: itemsError } = await supabase
                .from("receipt_items")
                .insert(itemsToInsert);

            if (itemsError) console.error("Error inserting items:", itemsError);
        }

        // Insert Payments
        if (data.payments.length > 0) {
            const paymentsToInsert = data.payments.map(pm => ({
                receipt_id: receiptCallback.id,
                method: pm.method,
                amount: pm.amount
            }));

            const { error: paymentsError } = await supabase
                .from("receipt_payments")
                .insert(paymentsToInsert);

            if (paymentsError) console.error("Error inserting payments:", paymentsError);
        }

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
            is_duplicate: isDuplicate,
            product_line_items: data.items.map(item => ({
                description: item.description,
                qty: item.quantity,
                unit_price: item.unit_price,
                discount: item.discount,
                total_price: item.total_price,
                final_line_total: item.final_price
            }))
        };

        return NextResponse.json({
            success: true,
            receiptId: receiptCallback.id,
            isDuplicate,
            data: exportData
        });

    } catch (error) {
        console.error("Processing error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
