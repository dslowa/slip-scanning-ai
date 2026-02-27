import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDateToMMDDYYYY, formatDateToDDMMYYYY } from "@/lib/utils";
import ExportButtons from "@/components/ExportButtons";
import ReceiptImage from "@/components/ReceiptImage";
import ReceiptCorrectionPanel from "@/components/ReceiptCorrectionPanel";

export const dynamic = 'force-dynamic';

export default async function ReceiptDetailsPage({ params }: { params: { id: string } }) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch Receipt
    const { data: receipt } = await supabase
        .from('receipts')
        .select('*')
        .eq('id', params.id)
        .single();

    if (!receipt) {
        return notFound();
    }

    // Fetch Items
    const { data: items } = await supabase
        .from('receipt_items')
        .select('*')
        .eq('receipt_id', params.id);

    // Fetch Payments
    const { data: payments } = await supabase
        .from('receipt_payments')
        .select('*')
        .eq('receipt_id', params.id);

    // Construct Export Format for Display
    const exportData = {
        file_name: receipt.image_title,
        retailer_name: receipt.retailer,
        date: formatDateToMMDDYYYY(receipt.date),
        time: receipt.time,
        is_blurry: receipt.is_blurry,
        is_screen: receipt.is_screen,
        is_receipt: receipt.is_receipt,
        slip_total: receipt.total_amount,
        payment_methods: payments?.map(p => ({ method: p.method, amount: p.amount })) || [],
        image_url: receipt.image_url,
        is_duplicate: receipt.is_duplicate,
        product_line_items: items?.map(i => ({
            description: i.description,
            qty: i.quantity,
            unit_price: i.unit_price,
            discount: i.discount,
            total_price: i.total_price,
            final_line_total: i.final_price
        })) || []
    };

    // Extract diagnostics and timing from raw_data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawData = receipt.raw_data as any;
    const diagnostics = rawData?._diagnostics ?? null;
    const timing = rawData?._timing ?? null;
    const usage = rawData?.usage ?? null;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <Link href="/slips" className="text-muted hover:text-foreground">
                        ← Back
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">{receipt.retailer}</h1>
                        <p className="text-muted mt-1">{formatDateToDDMMYYYY(receipt.date)} • {receipt.time}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <ExportButtons data={exportData} filename={`receipt-${receipt.id}`} />
                    <div className="flex flex-col items-end gap-1">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${receipt.is_duplicate ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
                            }`}>
                            {receipt.is_duplicate ? "Duplicate" : "Valid Receipt"}
                        </span>
                        {receipt.is_verified && (
                            <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                                <span>✓</span> Verified Correct
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column: Image */}
                <div className="space-y-4">
                    <div className="bg-card border border-border rounded-xl overflow-hidden h-[80vh] sticky top-6">
                        <ReceiptImage
                            src={receipt.image_url}
                            alt="Receipt"
                        />
                    </div>
                </div>

                {/* Right Column: Data */}
                <div className="space-y-6">

                    {/* Extracted Data Section */}
                    <div className="bg-card border border-border rounded-xl p-6">
                        <h2 className="text-lg font-semibold mb-4">Extracted Data</h2>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-muted block">Retailer</span>
                                <span className="font-medium">{receipt.retailer}</span>
                            </div>
                            <div>
                                <span className="text-muted block">Total</span>
                                <span className="font-medium text-lg text-primary">R{receipt.total_amount}</span>
                            </div>
                            <div>
                                <span className="text-muted block">Date</span>
                                <span className="font-medium">{formatDateToDDMMYYYY(receipt.date)}</span>
                            </div>
                            <div>
                                <span className="text-muted block">Time</span>
                                <span className="font-medium">{receipt.time}</span>
                            </div>
                        </div>
                    </div>

                    {/* Line Items */}
                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-border">
                            <h2 className="text-lg font-semibold">Product Line Items</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                                    <tr>
                                        <th className="p-3">Qty</th>
                                        <th className="p-3">Description</th>
                                        <th className="p-3 text-right">Unit</th>
                                        <th className="p-3 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {items && items.map((item) => (
                                        <tr key={item.id} className="hover:bg-muted/50">
                                            <td className="p-3 w-16">{item.quantity}</td>
                                            <td className="p-3">{item.description}</td>
                                            <td className="p-3 text-right">R{item.unit_price}</td>
                                            <td className="p-3 text-right font-medium">R{item.final_price}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Payment Methods */}
                    <div className="bg-card border border-border rounded-xl p-6">
                        <h2 className="text-lg font-semibold mb-3">Payment Methods</h2>
                        <ul className="space-y-2">
                            {payments && payments.map((p, i) => (
                                <li key={i} className="flex justify-between text-sm border-b border-border last:border-0 pb-2 last:pb-0">
                                    <span>{p.method}</span>
                                    <span className="font-medium">R{p.amount}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Verification & Manual Correction Section */}
                    <ReceiptCorrectionPanel
                        receiptId={receipt.id}
                        initialData={exportData}
                        isVerified={receipt.is_verified || false}
                        correctedData={receipt.corrected_data}
                    />

                    {/* Original JSON Export View (Collapsed) */}
                    <details className="bg-card border border-border rounded-xl p-4 overflow-hidden">
                        <summary className="text-sm font-medium cursor-pointer text-muted-foreground hover:text-foreground">
                            View Original AI JSON Export
                        </summary>
                        <div className="mt-3 bg-muted p-4 rounded-lg overflow-x-auto">
                            <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap">
                                {JSON.stringify(exportData, null, 2)}
                            </pre>
                        </div>
                    </details>

                    {/* OCR Diagnostics */}
                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-border flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold">OCR Diagnostics</h2>
                                {diagnostics && (
                                    <p className="text-xs text-muted mt-0.5">
                                        Gemini returned <strong>{diagnostics.raw_item_count}</strong> item(s)&nbsp;·&nbsp;<strong>{diagnostics.saved_item_count}</strong> saved to DB
                                    </p>
                                )}
                            </div>
                            {diagnostics && (
                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${diagnostics.rules.every((r: { passed: boolean }) => r.passed)
                                    ? "bg-green-100 text-green-800"
                                    : "bg-yellow-100 text-yellow-800"
                                    }`}>
                                    {diagnostics.rules.filter((r: { passed: boolean }) => !r.passed).length === 0
                                        ? "All checks passed"
                                        : `${diagnostics.rules.filter((r: { passed: boolean }) => !r.passed).length} check(s) failed`}
                                </span>
                            )}
                        </div>

                        {/* Timing bar */}
                        {timing && (
                            <div className="px-4 py-3 border-b border-border bg-muted/30 grid grid-cols-4 gap-2 text-center">
                                {[
                                    { label: "OCR", ms: timing.ocr_ms },
                                    { label: "Dup check", ms: timing.duplicate_check_ms },
                                    { label: "DB inserts", ms: timing.db_insert_ms },
                                    { label: "Total", ms: timing.total_ms },
                                ].map(({ label, ms }) => (
                                    <div key={label}>
                                        <p className="text-xs text-muted">{label}</p>
                                        <p className={`text-sm font-semibold ${label === "Total"
                                            ? ms < 5000 ? "text-green-600" : ms < 8000 ? "text-yellow-600" : "text-red-600"
                                            : "text-foreground"
                                            }`}>
                                            {ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Token usage and estimated cost */}
                        {usage && (
                            <div className="px-4 py-3 border-b border-border bg-blue-50/20 grid grid-cols-5 gap-2 text-center">
                                <div>
                                    <p className="text-[9px] text-muted uppercase font-bold tracking-tight">Text (In)</p>
                                    <p className="text-sm font-semibold">{usage.prompt_tokens.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] text-muted uppercase font-bold tracking-tight">Image (In)</p>
                                    <p className="text-sm font-semibold">{(usage.total_tokens - (usage.prompt_tokens + usage.candidates_tokens)).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] text-muted uppercase font-bold tracking-tight">Output</p>
                                    <p className="text-sm font-semibold">{usage.candidates_tokens.toLocaleString()}</p>
                                </div>
                                <div className="border-l border-blue-200">
                                    <p className="text-[9px] text-muted uppercase font-bold tracking-tight">Total</p>
                                    <p className="text-sm font-bold">{usage.total_tokens.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] text-muted uppercase font-bold tracking-tight">Est. Cost</p>
                                    <p className="text-sm font-bold text-blue-600">
                                        R{(((usage.total_tokens - usage.candidates_tokens) / 1000000 * 0.075 + usage.candidates_tokens / 1000000 * 0.30) * 19).toFixed(4)}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="p-4 space-y-4">
                            {!diagnostics ? (
                                <p className="text-sm text-muted italic">
                                    No diagnostics available. Re-upload this slip to generate diagnostics.
                                </p>
                            ) : (
                                <>
                                    {/* Warnings */}
                                    {diagnostics.warnings.length > 0 && (
                                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 space-y-1">
                                            <p className="text-xs font-semibold text-yellow-800 uppercase tracking-wide mb-1">⚠️ Warnings</p>
                                            {diagnostics.warnings.map((w: string, i: number) => (
                                                <p key={i} className="text-xs text-yellow-700">{w}</p>
                                            ))}
                                        </div>
                                    )}

                                    {/* Rule checks table */}
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                                                    <th className="pb-2 pr-3 w-8">Status</th>
                                                    <th className="pb-2 pr-4">Check</th>
                                                    <th className="pb-2">Detail</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {diagnostics.rules.map((rule: { rule: string; passed: boolean; detail: string }, i: number) => (
                                                    <tr key={i} className={!rule.passed ? "bg-red-50/60" : ""}>
                                                        <td className="py-2.5 pr-3 text-center">{rule.passed ? "✅" : "❌"}</td>
                                                        <td className="py-2.5 pr-4 font-medium text-xs whitespace-nowrap">{rule.rule}</td>
                                                        <td className="py-2.5 text-xs text-muted">{rule.detail}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Raw Gemini response */}
                                    {diagnostics.gemini_raw_response && (
                                        <details className="mt-2">
                                            <summary className="text-xs text-muted cursor-pointer hover:text-foreground select-none">
                                                Show raw Gemini response
                                            </summary>
                                            <div className="mt-2 bg-muted rounded-lg p-3 overflow-x-auto">
                                                <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap break-all">
                                                    {diagnostics.gemini_raw_response}
                                                </pre>
                                            </div>
                                        </details>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
