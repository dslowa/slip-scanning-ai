import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDateToMMDDYYYY } from "@/lib/utils";

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

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <Link href="/slips" className="text-muted hover:text-foreground">
                        ← Back
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">{receipt.retailer}</h1>
                        <p className="text-muted mt-1">{formatDateToMMDDYYYY(receipt.date)} • {receipt.time}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${receipt.is_duplicate ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
                        }`}>
                        {receipt.is_duplicate ? "Duplicate" : "Valid Receipt"}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column: Image */}
                <div className="space-y-4">
                    <div className="bg-card border border-border rounded-xl overflow-hidden h-[80vh] sticky top-6">
                        <img
                            src={receipt.image_url}
                            alt="Receipt"
                            className="w-full h-full object-contain bg-gray-900"
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
                                <span className="font-medium">{formatDateToMMDDYYYY(receipt.date)}</span>
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

                    {/* JSON Export View */}
                    <div className="bg-card border border-border rounded-xl p-6">
                        <h2 className="text-lg font-semibold mb-3">JSON Export</h2>
                        <div className="bg-muted p-4 rounded-lg overflow-x-auto">
                            <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap">
                                {JSON.stringify(exportData, null, 2)}
                            </pre>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
