import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

export default async function ActivityPage() {
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
        .select('id, retailer, total_amount, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Activity Log</h1>
                <p className="text-muted mt-1">System events and processing history</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 space-y-6">
                <div className="relative border-l-2 border-muted/30 ml-3 space-y-8">
                    {!receipts || receipts.length === 0 ? (
                        <p className="text-muted pl-6">No activity recorded.</p>
                    ) : (
                        receipts.map((r: any) => (
                            <div key={r.id} className="relative pl-6">
                                <span className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-background bg-primary"></span>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-sm font-medium text-foreground">
                                            Processed receipt from <span className="font-bold">{r.retailer}</span>
                                        </p>
                                        <p className="text-xs text-muted mt-0.5">
                                            Total amount extracted: R{Number(r.total_amount).toFixed(2)}
                                        </p>
                                    </div>
                                    <span className="text-xs text-muted whitespace-nowrap">
                                        {new Date(r.created_at).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
