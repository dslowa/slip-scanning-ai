import { createClient } from "@supabase/supabase-js";
import * as xlsx from "xlsx";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey;
const supabase = createClient(supabaseUrl, serviceRoleKey);

export async function generateBatchExportData(batchId: string) {
    // Fetch Batch
    const { data: batch, error: batchError } = await supabase
        .from("batches")
        .select("*")
        .eq("id", batchId)
        .single();

    if (batchError || !batch) throw new Error("Batch not found");

    // Fetch Slips
    const { data: slips, error: slipsError } = await supabase
        .from("batch_slips")
        .select("*")
        .eq("batch_id", batchId)
        .order("created_at", { ascending: true });

    if (slipsError) throw new Error("Failed to fetch slip data");

    // Map to the requested schema
    const rows = slips.map(slip => ({
        // Batch / Identifiers
        "batch_id": batch.id,
        "batch_name": batch.name || "",
        "till_slip_id": slip.id,
        "file_name": slip.file_name,
        "processed_at": slip.processed_at ? new Date(slip.processed_at).toISOString() : "",

        // Gemini
        "gemini_retailer_name": slip.gemini_retailer_name || "",
        "gemini_slip_date": slip.gemini_slip_date || "",
        "gemini_total_incl_vat": slip.gemini_total_incl_vat !== null ? slip.gemini_total_incl_vat : "",
        "gemini_prompt_version": slip.gemini_prompt_version || "",

        // Judge
        "judge_retailer_name": slip.judge_retailer_name || "",
        "judge_slip_date": slip.judge_slip_date || "",
        "judge_total_incl_vat": slip.judge_total_incl_vat !== null ? slip.judge_total_incl_vat : "",
        "judge_conf_retailer": slip.judge_conf_retailer !== null ? slip.judge_conf_retailer : "",
        "judge_conf_date": slip.judge_conf_date !== null ? slip.judge_conf_date : "",
        "judge_conf_total": slip.judge_conf_total !== null ? slip.judge_conf_total : "",
        "judge_notes": slip.judge_notes || "",
        "judge_prompt_version": slip.judge_prompt_version || "",

        // Match Flags
        "retailer_match": slip.retailer_match || "",
        "date_match": slip.date_match || "",
        "total_match": slip.total_match || "",

        // Correct Values (Judge used as “truth proxy”)
        "correct_retailer_name": slip.correct_retailer_name || "",
        "correct_slip_date": slip.correct_slip_date || "",
        "correct_total_incl_vat": slip.correct_total_incl_vat !== null ? slip.correct_total_incl_vat : "",

        // Triage
        "review_required": slip.review_required || "",
        "review_reason": slip.review_reason || ""
    }));

    return { rows, batchName: batch.name || "Batch" };
}

export function exportBatchToCsvBuffer(rows: any[]): Buffer {
    const worksheet = xlsx.utils.json_to_sheet(rows);
    const csvStr = xlsx.utils.sheet_to_csv(worksheet);
    return Buffer.from(csvStr, 'utf-8');
}

export function exportBatchToXlsxBuffer(rows: any[]): Buffer {
    const worksheet = xlsx.utils.json_to_sheet(rows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Batch Results");
    return xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });
}
