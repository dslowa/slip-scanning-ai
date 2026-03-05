"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
// Using service role to bypass policies in backend actions
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey;

const supabase = createClient(supabaseUrl, serviceRoleKey);

export async function createBatch(batchName: string, fileCount: number) {
    try {
        const finalName = batchName.trim() || `Batch ${new Date().toLocaleString()}`;
        const { data, error } = await supabase.from("batches").insert({
            name: finalName,
            status: "processing",
            total_count: fileCount,
            success_count: 0,
            error_count: 0
        }).select("id").single();

        if (error) throw error;
        return { success: true, batchId: data.id };
    } catch (err) {
        console.error("Failed to create batch:", err);
        return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
}

export async function createBatchSlip(batchId: string, fileName: string, storagePath: string) {
    try {
        const { data, error } = await supabase.from("batch_slips").insert({
            batch_id: batchId,
            file_name: fileName,
            storage_path: storagePath,
            status: "pending"
        }).select("id").single();

        if (error) throw error;
        return { success: true, slipId: data.id };
    } catch (err) {
        console.error("Failed to create batch slip:", err);
        return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
}

export async function finishBatch(batchId: string) {
    try {
        const { data: slips } = await supabase.from("batch_slips").select("status, review_required").eq("batch_id", batchId);

        let success = 0;
        let errorC = 0;

        console.log(`[FinishBatch] Batch: ${batchId}, Slips found: ${slips?.length || 0}`);

        slips?.forEach(s => {
            // A slip is only a "Perfect Match" if it's completed AND review_required is exactly "NO"
            if (s.status === "completed" && s.review_required === "NO") {
                success++;
            } else {
                // Anything else (error, processing-stuck, pending, or review_required="YES") is an error/review
                errorC++;
            }
        });

        console.log(`[FinishBatch] Counts - Success: ${success}, Error/Review: ${errorC}`);

        console.log(`[FinishBatch] Final Counts - Success: ${success}, Error: ${errorC}`);

        const { error } = await supabase.from("batches").update({
            status: "completed",
            success_count: success,
            error_count: errorC,
            completed_at: new Date().toISOString()
        }).eq("id", batchId);

        if (error) throw error;
        revalidatePath("/batch/history");
        return { success: true };
    } catch (err) {
        console.error("Failed to finish batch:", err);
        return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
}
