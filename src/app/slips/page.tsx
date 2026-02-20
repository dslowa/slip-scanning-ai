import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import ReceiptDataTable from "@/components/ReceiptDataTable";

export const dynamic = 'force-dynamic';

export default async function SlipsPage() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
        global: {
            fetch: (url: RequestInfo | URL, options?: RequestInit) => {
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

            <ReceiptDataTable initialReceipts={receipts || []} />
        </div>
    );
}
