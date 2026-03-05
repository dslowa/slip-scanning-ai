import { NextResponse } from "next/server";
import { generateBatchExportData, exportBatchToCsvBuffer } from "@/lib/batchExport";

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const batchId = params.id;
        if (!batchId) return new NextResponse("Missing batch ID", { status: 400 });

        const { rows, batchName } = await generateBatchExportData(batchId);
        if (!rows || rows.length === 0) {
            return new NextResponse("No completed slips found for this batch", { status: 404 });
        }

        const csvBuffer = exportBatchToCsvBuffer(rows);

        // Create a safe filename
        const safeName = batchName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const filename = `batch_export_${safeName}_${batchId.split('-')[0]}.csv`;

        return new NextResponse(csvBuffer, {
            status: 200,
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        });

    } catch (error: any) {
        console.error("CSV Export error:", error);
        return new NextResponse(error.message || "Failed to generate CSV export", { status: 500 });
    }
}
