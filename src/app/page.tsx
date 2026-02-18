import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: {
      fetch: (url: RequestInfo | URL, options?: RequestInit) => {
        return fetch(url, { ...options, cache: 'no-store' });
      },
    },
  });

  // Fetch Stats
  const { count: totalCount } = await supabase.from('receipts').select('id', { count: 'exact', head: true });

  // Fetch Duplicate Count (Auto Rejected)
  const { count: duplicateCount } = await supabase
    .from('receipts')
    .select('id', { count: 'exact', head: true })
    .eq('is_duplicate', true);

  // Fetch Recent Receipts
  const { data: recentReceipts } = await supabase
    .from('receipts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  const safeTotal = totalCount || 0;
  const safeDuplicates = duplicateCount || 0;
  const safeApproved = safeTotal - safeDuplicates;

  const stats = [
    { label: "Pending Review", value: "0", color: "text-warning" }, // Placeholder
    { label: "Auto Approved", value: safeApproved.toString(), color: "text-success" },
    { label: "Auto Rejected", value: safeDuplicates.toString(), color: "text-danger" },
    { label: "Total Processed", value: safeTotal.toString(), color: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted mt-1">Overview of slip scanning activity</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-card border border-border rounded-xl p-5"
          >
            <p className="text-sm text-muted">{stat.label}</p>
            <p className={`text-3xl font-bold mt-2 ${stat.color}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-6 border-b border-border flex justify-between items-center">
          <h2 className="text-lg font-semibold text-foreground">
            Recent Receipts
          </h2>
          <Link href="/scan" className="text-sm text-primary hover:underline">
            Scan New
          </Link>
        </div>

        {(!recentReceipts || recentReceipts.length === 0) ? (
          <div className="p-6 text-muted text-sm text-center">
            No receipts found. <Link href="/scan" className="text-primary">Scan some receipts</Link> to get started.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recentReceipts.map((receipt) => (
              <div key={receipt.id} className="p-4 hover:bg-muted/50 transition-colors flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <Link href={`/slips/${receipt.id}`} className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary hover:bg-primary/20 transition-colors">
                    🧾
                  </Link>
                  <div>
                    <Link href={`/slips/${receipt.id}`} className="font-medium text-foreground hover:underline">
                      {receipt.retailer || "Unknown Retailer"}
                    </Link>
                    <p className="text-xs text-muted">
                      {receipt.date} • {new Date(receipt.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-foreground">
                    {receipt.total_amount ? `R${Number(receipt.total_amount).toFixed(2)}` : "—"}
                  </p>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    Processed
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
