import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

export default async function ReviewPage() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
        global: {
            fetch: (url: RequestInfo | URL, options?: RequestInit) => {
                return fetch(url, { ...options, cache: 'no-store' });
            },
        },
    });

    // Fetch items needing review (e.g. blurry, or missing data)
    // For now just fetch blurry ones as a proxy for "Review"
    const { data: receipts } = await supabase
        .from('receipts')
        .select('*')
        .or('is_blurry.eq.true,is_screen.eq.true')
        .order('created_at', { ascending: false });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Manual Review</h1>
                    <p className="text-muted mt-1">Receipts flagged for quality issues</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {!receipts || receipts.length === 0 ? (
                    <div className="col-span-full text-center p-12 text-muted bg-card rounded-xl border border-border">
                        No items currently pending manual review.
                    </div>
                ) : (
                    receipts.map((receipt) => (
                        <div key={receipt.id} className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
                            <div className="h-48 bg-gray-100 relative overflow-hidden group">
                                {/* Use img tag for simplicity or Next Image if domain allowlisted */}
                                <img src={receipt.image_url} alt="Receipt" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                <div className="absolute top-2 right-2 flex gap-1">
                                    {receipt.is_blurry && <span className="px-2 py-1 bg-yellow-500/90 text-white text-xs rounded font-bold">BLURRY</span>}
                                    {receipt.is_screen && <span className="px-2 py-1 bg-blue-500/90 text-white text-xs rounded font-bold">SCREEN</span>}
                                </div>
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Link href={`/slips/${receipt.id}`} className="bg-white text-black px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-100">
                                        Inspect
                                    </Link>
                                </div>
                            </div>
                            <div className="p-4 flex-1">
                                <h3 className="font-bold text-lg">{receipt.retailer}</h3>
                                <p className="text-muted text-sm">{receipt.date || "No Date"} • R{Number(receipt.total_amount).toFixed(2)}</p>
                            </div>
                            <div className="p-4 border-t border-border flex gap-2">
                                <button className="flex-1 bg-success hover:bg-success/90 text-white py-2 rounded text-sm font-medium">Approve</button>
                                <button className="flex-1 bg-danger hover:bg-danger/90 text-white py-2 rounded text-sm font-medium">Reject</button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
