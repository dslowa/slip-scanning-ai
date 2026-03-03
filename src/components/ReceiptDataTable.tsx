/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import Link from "next/link";
import { Receipt } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { exportToJSON, exportToCSV, exportToExcel } from "@/lib/exportUtils";

interface ReceiptDataTableProps {
    initialReceipts: Receipt[];
}

export default function ReceiptDataTable({ initialReceipts }: ReceiptDataTableProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [receipts, setReceipts] = useState<Receipt[]>(initialReceipts);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);

    const filteredReceipts = receipts.filter((receipt) => {
        const query = searchQuery.toLowerCase();
        return (
            (receipt.retailer?.toLowerCase() || "").includes(query) ||
            (receipt.image_title?.toLowerCase() || "").includes(query) ||
            (receipt.date?.toLowerCase() || "").includes(query) ||
            (receipt.total_amount?.toString() ?? "").includes(query) ||
            new Date(receipt.created_at).toLocaleDateString().includes(query)
        );
    });

    const handleExport = async (format: 'json' | 'csv' | 'excel') => {
        setIsExporting(true);
        try {
            const receiptIds = filteredReceipts.map(r => r.id);
            if (receiptIds.length === 0) {
                alert("No receipts to export.");
                return;
            }

            const { data, error } = await supabase
                .from('receipts')
                .select(`
                    *,
                    receipt_items(*),
                    receipt_payments(*)
                `)
                .in('id', receiptIds);

            if (error) throw error;

            const exportData = data.map(receipt => ({
                file_name: receipt.image_title,
                id: receipt.id,
                retailer_name: receipt.retailer,
                date: receipt.date,
                time: receipt.time,
                is_blurry: receipt.is_blurry,
                is_screen: receipt.is_screen,
                is_receipt: receipt.is_receipt,
                slip_total: receipt.total_amount,
                payment_methods: receipt.receipt_payments?.map((p: any) => ({ method: p.method, amount: p.amount })) || [],
                image_url: receipt.image_url,
                is_duplicate: receipt.is_duplicate,
                product_line_items: receipt.receipt_items?.map((i: any) => ({
                    description: i.description,
                    qty: i.quantity,
                    unit_price: i.unit_price,
                    discount: i.discount,
                    total_price: i.total_price,
                    final_line_total: i.final_price
                })) || []
            }));

            const filename = `receipts-export-${new Date().toISOString().split('T')[0]}`;
            if (format === 'json') exportToJSON(exportData, filename);
            if (format === 'csv') exportToCSV(exportData, filename);
            if (format === 'excel') exportToExcel(exportData, filename, "Receipts");
        } catch (error) {
            console.error("Export failed:", error);
            alert("Failed to export data. Please try again.");
        } finally {
            setIsExporting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this receipt? This action cannot be undone.")) return;

        setIsDeleting(id);
        try {
            const { error } = await supabase.from("receipts").delete().eq("id", id);

            if (error) throw error;

            // Remove from local state
            setReceipts((prev) => prev.filter((r) => r.id !== id));
        } catch (error) {
            console.error("Failed to delete receipt:", error);
            alert("Failed to delete receipt. Please try again.");
        } finally {
            setIsDeleting(null);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Search by retailer, filename, date, or price..."
                        className="block w-full pl-10 pr-3 py-2 border border-border rounded-lg bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary sm:text-sm transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => handleExport('json')}
                        disabled={isExporting}
                        className="px-3 py-1.5 text-xs font-medium bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors border border-border disabled:opacity-50 flex items-center gap-1"
                    >
                        {isExporting ? <span className="animate-pulse">...</span> : null}
                        Export JSON
                    </button>
                    <button
                        onClick={() => handleExport('csv')}
                        disabled={isExporting}
                        className="px-3 py-1.5 text-xs font-medium bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors border border-border disabled:opacity-50 flex items-center gap-1"
                    >
                        {isExporting ? <span className="animate-pulse">...</span> : null}
                        Export CSV
                    </button>
                    <button
                        onClick={() => handleExport('excel')}
                        disabled={isExporting}
                        className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1"
                    >
                        {isExporting ? <span className="animate-pulse">...</span> : null}
                        Export Excel
                    </button>
                </div>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-muted/50 border-b border-border">
                            <tr>
                                <th className="p-4 font-medium text-muted-foreground w-12 text-center">#</th>
                                <th className="p-4 font-medium text-muted-foreground">Retailer</th>
                                <th className="p-4 font-medium text-muted-foreground">Slip Date</th>
                                <th className="p-4 font-medium text-muted-foreground text-right">Total</th>
                                <th className="p-4 font-medium text-muted-foreground">Uploaded</th>
                                <th className="p-4 font-medium text-muted-foreground">Image Title</th>
                                <th className="p-4 font-medium text-muted-foreground text-center">Status</th>
                                <th className="p-4 font-medium text-muted-foreground text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredReceipts.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-muted">
                                        No receipts found.
                                    </td>
                                </tr>
                            ) : (
                                filteredReceipts.map((receipt, i) => (
                                    <tr key={receipt.id} className="hover:bg-muted/50 transition-colors">
                                        <td className="p-4 text-muted text-center">{i + 1}</td>
                                        <td className="p-4 font-medium">{receipt.retailer || "Unknown"}</td>
                                        <td className="p-4 text-muted">{receipt.date || "N/A"}</td>
                                        <td className="p-4 text-right font-medium">R{receipt.total_amount}</td>
                                        <td className="p-4 text-muted whitespace-nowrap">
                                            {new Date(receipt.created_at).toLocaleDateString("en-GB", {
                                                day: "2-digit",
                                                month: "2-digit",
                                                year: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit"
                                            })}
                                        </td>
                                        <td className="p-4 text-muted truncate max-w-[150px]" title={receipt.image_title}>
                                            {receipt.image_title || "N/A"}
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${receipt.is_duplicate ? "bg-red-100 text-red-800" :
                                                    receipt.is_blurry ? "bg-yellow-100 text-yellow-800" :
                                                        "bg-green-100 text-green-800"
                                                    }`}>
                                                    {receipt.is_duplicate ? "Duplicate" :
                                                        receipt.is_blurry ? "Blurry" : "Processed"}
                                                </span>
                                                {receipt.is_verified && (
                                                    <span className="text-green-600 font-bold text-xs" title="Verified Correct">
                                                        ✓ Correct
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4 text-right font-medium flex justify-end gap-3 items-center">
                                            <Link
                                                href={`/slips/${receipt.id}`}
                                                className="text-primary hover:text-primary/80 hover:underline"
                                            >
                                                View
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(receipt.id)}
                                                disabled={isDeleting === receipt.id}
                                                className={`text-red-500 hover:text-red-700 hover:underline transition-colors ${isDeleting === receipt.id ? "opacity-50 cursor-not-allowed" : ""}`}
                                            >
                                                {isDeleting === receipt.id ? "Deleting..." : "Delete"}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="text-xs text-muted-foreground px-1">
                Showing {filteredReceipts.length} of {receipts.length} receipts
            </div>
        </div>
    );
}
