"use client";

import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type UploadStatus = "idle" | "uploading" | "processing" | "done" | "error";

interface FileItem {
    id: string;
    file: File;
    status: UploadStatus;
    progress: number; // 0-100
    resultId?: string;
    error?: string;
    data?: {
        retailer: string;
        date: string;
        total: number;
        itemCount: number;
    };
}

export default function ScanPage() {
    const [queue, setQueue] = useState<FileItem[]>([]);
    const [processing, setProcessing] = useState(false);
    const [concurrency, setConcurrency] = useState(3);

    const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files).map((file) => ({
                id: Math.random().toString(36).substring(7),
                file,
                status: "idle" as UploadStatus,
                progress: 0,
            }));
            setQueue((prev) => [...prev, ...newFiles]);
        }
    };

    const processQueue = useCallback(async () => {
        if (processing) return;
        setProcessing(true);

        const processItem = async (item: FileItem) => {
            // 1. Upload to Storage
            setQueue(q => q.map(i => i.id === item.id ? { ...i, status: "uploading", progress: 10 } : i));

            try {
                const fileExt = item.file.name.split('.').pop();
                const fileName = `${Math.random()}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('receipts')
                    .upload(filePath, item.file);

                if (uploadError) throw uploadError;

                setQueue(q => q.map(i => i.id === item.id ? { ...i, status: "processing", progress: 50 } : i));

                // Get Public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('receipts')
                    .getPublicUrl(filePath);

                // 2. Call API
                const response = await fetch("/api/process-receipt", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ imageUrl: publicUrl }),
                });

                const result = await response.json();

                if (!response.ok) throw new Error(result.error || "Processing failed");

                setQueue(q => q.map(i => i.id === item.id ? { ...i, status: "done", progress: 100, resultId: result.receiptId } : i));

            } catch (err: any) {
                console.error(err);
                setQueue(q => q.map(i => i.id === item.id ? { ...i, status: "error", error: err.message } : i));
            }
        };

        // Simple customized worker queue
        // We loop until all items are done, respecting concurrency
        // Since we are in a react component, a recursive function or a simpler loop with promise limiting is best.
        // For simplicity in this demo, let's use a chunky processing loop or just a "find next idle" effect.

        // Better Approach: A recursive runner that maintains `concurrency` active workers.

    }, [queue, processing]);

    // Effect to manage queue processing
    useEffect(() => {
        if (!processing && queue.some(i => i.status === "idle")) {
            // Start processing if not already
            // But wait, the user might want to click "Start".
            // Let's make it manual start or auto start? Manual is safer for bulk.
        }
    }, [queue, processing]);

    // Actual worker effect
    useEffect(() => {
        if (!processing) return;

        const activeCount = queue.filter(i => i.status === "uploading" || i.status === "processing").length;
        const nextItem = queue.find(i => i.status === "idle");

        if (activeCount < concurrency && nextItem) {
            // Start processing next item
            const processItem = async (item: FileItem) => {
                // Update status to uploading immediately to prevent double picking
                setQueue(q => q.map(i => i.id === item.id ? { ...i, status: "uploading", progress: 5 } : i));

                try {
                    // Upload
                    const fileExt = item.file.name.split('.').pop();
                    const fileName = `${Math.random().toString(36).substring(7)}_${Date.now()}.${fileExt}`;

                    const { error: uploadError } = await supabase.storage
                        .from('receipts')
                        .upload(fileName, item.file);

                    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

                    setQueue(q => q.map(i => i.id === item.id ? { ...i, status: "processing", progress: 50 } : i));

                    // Get URL
                    const { data: { publicUrl } } = supabase.storage
                        .from('receipts')
                        .getPublicUrl(fileName);

                    // API Call
                    const res = await fetch("/api/process-receipt", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ imageUrl: publicUrl }),
                    });

                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || "API error");

                    setQueue(q => q.map(i => i.id === item.id ? {
                        ...i,
                        status: "done",
                        progress: 100,
                        resultId: data.receiptId,
                        data: data.data
                    } : i));

                } catch (e: any) {
                    setQueue(q => q.map(i => i.id === item.id ? { ...i, status: "error", error: e.message } : i));
                }
            };

            processItem(nextItem);
        } else if (activeCount === 0 && !nextItem) {
            // All done
            setProcessing(false);
        }
    }, [queue, processing, concurrency]);


    const stats = {
        total: queue.length,
        done: queue.filter(i => i.status === "done").length,
        error: queue.filter(i => i.status === "error").length,
        pending: queue.filter(i => i.status === "idle").length
    };

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8">
            <header className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800">Bulk Receipt Scanner</h1>
                <div className="space-x-4">
                    <label className="text-sm font-medium text-gray-400">Concurrency:
                        <select
                            value={concurrency}
                            onChange={e => setConcurrency(Number(e.target.value))}
                            className="ml-2 border rounded p-1"
                        >
                            <option value="1">1</option>
                            <option value="3">3</option>
                            <option value="5">5</option>
                            <option value="10">10</option>
                        </select>
                    </label>
                </div>
            </header>

            {/* Upload Area */}
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-blue-500 transition-colors bg-gray-50">
                <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFiles}
                    className="hidden"
                    id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                    <span className="text-4xl mb-4">📄</span>
                    <span className="text-xl font-medium text-gray-700">Drop receipts here or click to upload</span>
                    <span className="text-sm text-gray-500 mt-2">Supports multiple files (Bulk Upload)</span>
                </label>
            </div>

            {/* Controls */}
            {queue.length > 0 && (
                <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border">
                    <div className="flex gap-4 text-sm">
                        <span className="font-bold text-gray-700">Total: {stats.total}</span>
                        <span className="text-green-600">Done: {stats.done}</span>
                        <span className="text-red-600">Errors: {stats.error}</span>
                        <span className="text-gray-400">Pending: {stats.pending}</span>
                    </div>
                    <div className="space-x-2">
                        <button
                            onClick={() => setQueue([])}
                            disabled={processing}
                            className="px-4 py-2 text-gray-600 hover:text-red-400 disabled:opacity-50"
                        >
                            Clear All
                        </button>
                        <button
                            onClick={() => setProcessing(!processing)}
                            className={`px-6 py-2 rounded-lg font-bold text-white transition-colors ${processing ? "bg-red-500 hover:bg-red-600" : "bg-blue-600 hover:bg-blue-700"
                                }`}
                        >
                            {processing ? "Pause Processing" : "Start Processing"}
                        </button>
                    </div>
                </div>
            )}

            {/* List */}
            <div className="space-y-2">
                {queue.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-white rounded-lg border shadow-sm">
                        <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-500">
                                {item.file.name.slice(0, 3)}
                            </div>
                            <div>
                                <p className="font-medium text-gray-800 truncate max-w-md">{item.file.name}</p>
                                <p className="text-xs text-gray-500">
                                    {(item.file.size / 1024).toFixed(1)} KB • {item.status.toUpperCase()}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-4 w-1/3 justify-end">
                            {/* Status Indicator */}
                            {item.status === "done" && item.data ? (
                                <div className="flex flex-col items-end text-xs mr-2">
                                    <span className="font-bold text-gray-700">{item.data.retailer}</span>
                                    <span className="text-gray-500">R{item.data.total} • {item.data.itemCount} items</span>
                                </div>
                            ) : (
                                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden w-full max-w-[100px]">
                                    <div
                                        className={`h-full transition-all duration-300 ${item.status === "error" ? "bg-red-500" :
                                            item.status === "done" ? "bg-green-500" : "bg-blue-500"
                                            }`}
                                        style={{ width: `${item.progress}%` }}
                                    />
                                </div>
                            )}

                            {item.status === "error" && (
                                <span className="text-xs text-red-500 max-w-[100px] truncate" title={item.error}>
                                    {item.error}
                                </span>
                            )}

                            {item.status === "done" && item.resultId && (
                                <Link
                                    href={`/slips/${item.resultId}`}
                                    className="ml-2 px-3 py-1 bg-primary text-primary-foreground text-xs rounded-md hover:bg-primary/90 transition-colors"
                                    target="_blank"
                                >
                                    View Data
                                </Link>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
