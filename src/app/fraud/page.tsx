import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function FraudPage() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
        global: {
            fetch: (url: any, options: any) => {
                return fetch(url, { ...options, cache: 'no-store' });
            },
        },
    });

    // Fetch duplicates or suspicious items
    const { data: receipts } = await supabase
        .from('receipts')
        .select('*')
        .eq('is_duplicate', true)
        .order('created_at', { ascending: false });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Fraud Detection</h1>
                <p className="text-muted mt-1">Potential duplicates and suspicious uploads</p>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-red-50 border-b border-red-100">
                        <tr>
                            <th className="p-4 font-medium text-red-900">Detected Issue</th>
                            <th className="p-4 font-medium text-red-900">Retailer</th>
                            <th className="p-4 font-medium text-red-900">Date & Amount</th>
                            <th className="p-4 font-medium text-red-900 text-right">Upload Time</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {!receipts || receipts.length === 0 ? (
                            <tr><td colSpan={4} className="p-8 text-center text-muted">No fraud detected yet.</td></tr>
                        ) : (
                            receipts.map((receipt: any) => (
                                <tr key={receipt.id} className="hover:bg-red-50/50 transition-colors group">
                                    <td className="p-4">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                            Duplicate Receipt
                                        </span>
                                    </td>
                                    <td className="p-4 font-medium">{receipt.retailer}</td>
                                    <td className="p-4 text-muted">{receipt.date} • R{Number(receipt.total_amount).toFixed(2)}</td>
                                    <td className="p-4 text-right text-muted flex justify-end gap-3 items-center">
                                        {new Date(receipt.created_at).toLocaleString()}
                                        <Link href={`/slips/${receipt.id}`} className="opacity-0 group-hover:opacity-100 text-primary text-xs font-bold underline ml-2">
                                            VIEW
                                        </Link>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
