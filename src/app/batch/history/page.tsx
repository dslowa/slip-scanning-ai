import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

export default async function BatchHistoryPage() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
        global: {
            fetch: (url: RequestInfo | URL, options?: RequestInit) => {
                return fetch(url, { ...options, cache: 'no-store' });
            },
        },
    });

    try {
        const { data: batches, error } = await supabase
            .from("batches")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw error;

        return (
            <div className="space-y-6 max-w-6xl">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Batch History</h1>
                        <p className="text-muted mt-1">Review past scale test runs and download the raw output data.</p>
                    </div>
                    <Link
                        href="/batch/new"
                        className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
                    >
                        Run New Batch
                    </Link>
                </div>

                <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                    {!batches || batches.length === 0 ? (
                        <div className="p-8 text-center text-muted">
                            <p>No batches have been run yet.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto border-x-0 border-b-0 border border-border">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead>
                                    <tr className="bg-muted/30 text-muted uppercase tracking-wide text-xs">
                                        <th className="px-6 py-4 border-b border-border font-medium">Batch Name</th>
                                        <th className="px-6 py-4 border-b border-border font-medium">Date Created</th>
                                        <th className="px-6 py-4 border-b border-border font-medium">Status / Progress</th>
                                        <th className="px-6 py-4 border-b border-border font-medium text-center">Results</th>
                                        <th className="px-6 py-4 border-b border-border font-medium text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border text-foreground">
                                    {batches.map((b) => {
                                        const total = b.total_count || 0;
                                        const success = b.success_count || 0;
                                        const failed = b.error_count || 0;
                                        const processed = success + failed;

                                        return (
                                            <tr key={b.id} className="hover:bg-muted/10 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <p className="font-semibold">{b.name}</p>
                                                    <p className="text-xs text-muted font-mono">{b.id.split('-')[0]}</p>
                                                </td>
                                                <td className="px-6 py-4 text-muted whitespace-nowrap">
                                                    {new Date(b.created_at).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1">
                                                        <span className={`inline-flex items-center w-fit px-2 py-0.5 rounded text-xs font-medium 
                              ${b.status === 'completed' ? 'bg-green-100 text-green-800 border bg-green-200'
                                                                : b.status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                                                            {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                                                        </span>
                                                        <span className="text-xs text-muted">
                                                            {processed} / {total} Slips
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <span className="text-green-600 font-medium text-xs" title="Perfect Output matches">{success}</span>
                                                        <span className="text-muted text-xs">|</span>
                                                        <span className="text-red-600 font-medium text-xs" title="Requires Review">{failed}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-3 opacity-80 group-hover:opacity-100 transition-opacity">
                                                        {b.status === 'completed' ? (
                                                            <>
                                                                <a
                                                                    href={`/api/batch/${b.id}/export/csv`}
                                                                    target="_blank"
                                                                    className="text-xs text-primary font-medium hover:underline"
                                                                >
                                                                    CSV
                                                                </a>
                                                                <span className="text-border">|</span>
                                                                <a
                                                                    href={`/api/batch/${b.id}/export/xlsx`}
                                                                    target="_blank"
                                                                    className="text-xs text-primary font-medium hover:underline"
                                                                >
                                                                    XLSX
                                                                </a>
                                                            </>
                                                        ) : (
                                                            <span className="text-xs text-muted italic">Processing...</span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        );
    } catch (err: unknown) {
        if (err.code === '42P01') {
            return (
                <div className="p-6 bg-amber-50 rounded border border-amber-200">
                    <p className="text-amber-800 font-bold">Database Migration Missing</p>
                    <p className="text-sm text-amber-700 mt-2">The Batches table has not been created in Supabase yet. Run the migrations to view this page.</p>
                </div>
            );
        }
        return (
            <div className="p-6 bg-red-50 text-red-800">
                <p>Failed to load Batch History: {err.message}</p>
            </div>
        )
    }
}
