import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function SlipsPage() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
        global: {
            fetch: (url: any, options: any) => {
                return fetch(url, { ...options, cache: 'no-store' });
            },
        },
    });

    const { data: receipts } = await supabase
        .from('receipts')
        .select('*')
        .order('created_at', { ascending: false });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Slips Queue</h1>
                    <p className="text-muted mt-1">Manage and review uploaded receipts</p>
                </div>
                <Link
                    href="/scan"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-colors"
                >
                    Scan New
                </Link>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-muted/50 border-b border-border">
                        <tr>
                            <th className="p-4 font-medium text-muted-foreground w-12">#</th>
                            <th className="p-4 font-medium text-muted-foreground">Retailer</th>
                            <th className="p-4 font-medium text-muted-foreground">Date</th>
                            <th className="p-4 font-medium text-muted-foreground text-right">Total</th>
                            <th className="p-4 font-medium text-muted-foreground text-center">Status</th>
                            <th className="p-4 font-medium text-muted-foreground text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {!receipts || receipts.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-muted">
                                    No receipts found.
                                </td>
                            </tr>
                        ) : (
                            receipts.map((receipt: any, i: number) => (
                                <tr key={receipt.id} className="hover:bg-muted/50 transition-colors">
                                    <td className="p-4 text-muted">{i + 1}</td>
                                    <td className="p-4 font-medium">{receipt.retailer || "Unknown"}</td>
                                    <td className="p-4 text-muted">{receipt.date || "N/A"}</td>
                                    <td className="p-4 text-right font-medium">R{receipt.total_amount}</td>
                                    <td className="p-4 text-center">
                                        <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${receipt.is_duplicate ? "bg-red-100 text-red-800" :
                                            receipt.is_blurry ? "bg-yellow-100 text-yellow-800" :
                                                "bg-green-100 text-green-800"
                                            }`}>
                                            {receipt.is_duplicate ? "Duplicate" :
                                                receipt.is_blurry ? "Blurry" : "Processed"}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right text-primary cursor-pointer hover:underline">
                                        <Link href={`/slips/${receipt.id}`}>View</Link>
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
