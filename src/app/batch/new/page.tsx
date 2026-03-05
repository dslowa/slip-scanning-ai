"use client";

import { useState, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { createBatch, createBatchSlip, finishBatch } from "./actions";

// Initialize supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function BatchNewPage() {
    const [files, setFiles] = useState<File[]>([]);
    const [batchName, setBatchName] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Processing States
    const [isProcessing, setIsProcessing] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const [progress, setProgress] = useState({
        total: 0,
        uploaded: 0,
        processed: 0,
        success: 0,
        failed: 0,
    });

    const [createdBatchId, setCreatedBatchId] = useState<string | null>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const newFiles = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
            setFiles((prev) => [...prev, ...newFiles]);
        }
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files).filter(f => f.type.startsWith("image/"));
            setFiles((prev) => [...prev, ...newFiles]);
        }
    };

    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const startBatch = async () => {
        if (files.length === 0) return;
        setIsProcessing(true);
        setProgress({ total: files.length, uploaded: 0, processed: 0, success: 0, failed: 0 });

        try {
            // 1. Create Batch DB Row
            const batchRes = await createBatch(batchName, files.length);
            if (!batchRes.success || !batchRes.batchId) throw new Error(batchRes.error || "Failed to create batch");

            const batchId = batchRes.batchId;
            setCreatedBatchId(batchId);

            // We need to keep track of slips to process
            const slipIdsToProcess: string[] = [];

            // 2. Upload Files and Create Batch Slips
            for (const file of files) {
                const fileExt = file.name.split('.').pop();
                const safeName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                const path = `batches/${batchId}/${safeName}`;

                const { error: uploadError } = await supabase.storage
                    .from("receipts")
                    .upload(path, file);

                if (uploadError) {
                    console.error("Upload error:", uploadError);
                    setProgress(p => ({ ...p, processed: p.processed + 1, failed: p.failed + 1 }));
                    continue;
                }

                setProgress(p => ({ ...p, uploaded: p.uploaded + 1 }));

                const slipRes = await createBatchSlip(batchId, file.name, path);
                if (slipRes.success && slipRes.slipId) {
                    slipIdsToProcess.push(slipRes.slipId);
                } else {
                    setProgress(p => ({ ...p, processed: p.processed + 1, failed: p.failed + 1 }));
                }
            }

            // 3. Process slips in parallel using a simple concurrency worker loop
            const CONCURRENCY = 5;
            let currentIndex = 0;

            const worker = async () => {
                while (currentIndex < slipIdsToProcess.length) {
                    const slipId = slipIdsToProcess[currentIndex++];
                    try {
                        const res = await fetch("/api/batch/process-slip", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ slipId })
                        });

                        if (res.ok) {
                            const data = await res.json();
                            setProgress(p => ({
                                ...p,
                                processed: p.processed + 1,
                                success: p.success + (data.reviewRequired === "NO" ? 1 : 0),
                                failed: p.failed + (data.reviewRequired === "NO" ? 0 : 1)
                            }));
                        } else {
                            // API threw an internal error
                            setProgress(p => ({ ...p, processed: p.processed + 1, failed: p.failed + 1 }));
                        }
                    } catch {
                        setProgress(p => ({ ...p, processed: p.processed + 1, failed: p.failed + 1 }));
                    }
                }
            };

            const workers = [];
            for (let i = 0; i < Math.min(CONCURRENCY, slipIdsToProcess.length); i++) {
                workers.push(worker());
            }

            await Promise.all(workers);

            // 4. Mark Batch as completed
            await finishBatch(batchId);
            setIsCompleted(true);
            setIsProcessing(false);

        } catch (err) {
            console.error(err);
            alert("A critical error occurred starting the batch.");
            setIsProcessing(false);
        }
    };

    return (
        <div className="max-w-4xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Run New Scale Test Batch</h1>
                <p className="text-muted mt-1">Upload multiple receipts to generate a side-by-side model export.</p>
            </div>

            {!isProcessing && !isCompleted && (
                <div className="bg-card border border-border rounded-xl p-6 space-y-6">
                    <div className="space-y-2">
                        <label htmlFor="batchName" className="text-sm font-medium text-foreground">Batch Name (Optional)</label>
                        <input
                            id="batchName"
                            type="text"
                            value={batchName}
                            onChange={(e) => setBatchName(e.target.value)}
                            placeholder="e.g. Checkers Receipts 2026 Q1"
                            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>

                    <div
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        className="border-2 border-dashed border-border rounded-xl p-10 text-center hover:bg-muted/30 transition-colors"
                    >
                        <div className="flex flex-col items-center justify-center space-y-3">
                            <svg className="w-12 h-12 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <p className="text-sm font-medium text-foreground">
                                Drag and drop your slip images here, or{" "}
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="text-primary hover:underline">browse files</button>
                            </p>
                            <p className="text-xs text-muted">Supports JPG, PNG, WEBP</p>
                        </div>
                        <input
                            type="file"
                            multiple
                            accept="image/*"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                        />
                    </div>

                    {files.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-sm font-medium text-foreground">{files.length} Files Selected</h3>
                                <button type="button" onClick={() => setFiles([])} className="text-xs text-red-500 hover:underline">Clear All</button>
                            </div>
                            <div className="max-h-64 overflow-y-auto border border-border rounded-lg divide-y divide-border">
                                {files.map((file, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-3 text-sm flex-wrap gap-2">
                                        <span className="truncate max-w-[80%]">{file.name}</span>
                                        <button type="button" onClick={() => removeFile(idx)} className="text-red-500 hover:text-red-700">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="pt-4 border-t border-border flex justify-end">
                        <button
                            onClick={startBatch}
                            disabled={files.length === 0}
                            className="px-6 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                            Start Processing {files.length ? `(${files.length})` : ""}
                        </button>
                    </div>
                </div>
            )}

            {(isProcessing || isCompleted) && (
                <div className="bg-card border border-border rounded-xl p-6 space-y-6">
                    <div className="text-center space-y-2">
                        <h2 className="text-xl font-bold text-foreground">
                            {isCompleted ? "Batch Complete!" : "Processing Batch..."}
                        </h2>
                        <p className="text-muted">{progress.processed} of {progress.total} slips finished</p>
                        {isProcessing && <p className="text-xs text-primary animate-pulse mt-2">Uploading and analyzing images. Please do not close this tab.</p>}
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-center mt-6">
                        <div className="p-4 bg-background border border-border rounded-lg">
                            <p className="text-xs text-muted uppercase tracking-wider font-semibold">Total Processed</p>
                            <p className="text-3xl font-bold mt-2 text-primary">{progress.processed}</p>
                        </div>
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-xs text-green-700 uppercase tracking-wider font-semibold">Perfect Matches</p>
                            <p className="text-3xl font-bold mt-2 text-green-700">{progress.success}</p>
                        </div>
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-xs text-red-700 uppercase tracking-wider font-semibold">Requires Review</p>
                            <p className="text-3xl font-bold mt-2 text-red-700">{progress.failed}</p>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-muted/30 rounded-full h-2.5 mt-8 overflow-hidden flex gap-1">
                        <div className="bg-green-500 h-2.5 transition-all duration-300" style={{ width: `${(progress.success / progress.total) * 100}%` }}></div>
                        <div className="bg-red-500 h-2.5 transition-all duration-300" style={{ width: `${(progress.failed / progress.total) * 100}%` }}></div>
                        {isProcessing && <div className="bg-blue-400 h-2.5 transition-all duration-300 w-full animate-pulse flex-1"></div>}
                    </div>

                    {isCompleted && (
                        <div className="pt-8 border-t border-border flex flex-wrap gap-4 items-center justify-center">
                            <a
                                href={`/api/batch/${createdBatchId}/export/csv`}
                                target="_blank"
                                className="px-6 py-2 border-2 border-primary text-primary font-medium rounded-lg hover:bg-primary/5 transition-colors"
                            >
                                Download CSV
                            </a>
                            <a
                                href={`/api/batch/${createdBatchId}/export/xlsx`}
                                target="_blank"
                                className="px-6 py-2 border-2 border-primary text-primary font-medium rounded-lg hover:bg-primary/5 transition-colors"
                            >
                                Download XLSX
                            </a>
                            <a
                                href={`/batch/history`}
                                className="px-6 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors ml-auto"
                            >
                                View History
                            </a>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
