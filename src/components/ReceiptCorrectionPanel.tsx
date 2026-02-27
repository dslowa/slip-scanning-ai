"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

interface ReceiptCorrectionPanelProps {
    receiptId: string;
    initialData: unknown;
    isVerified: boolean;
    correctedData: unknown;
}

export default function ReceiptCorrectionPanel({
    receiptId,
    initialData,
    isVerified: initialIsVerified,
    correctedData: initialCorrectedData
}: ReceiptCorrectionPanelProps) {
    const router = useRouter();
    const [isVerified, setIsVerified] = useState(initialIsVerified);
    const [jsonInput, setJsonInput] = useState(() => {
        try {
            return JSON.stringify(initialCorrectedData || initialData || {}, null, 2);
        } catch (e) {
            console.error("Failed to stringify receipt data:", e);
            return "{}";
        }
    });

    // Reference for the last saved version to track "dirty" state
    const [lastSavedJson, setLastSavedJson] = useState(jsonInput);
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const hasUnsavedChanges = jsonInput !== lastSavedJson;

    // Synchronize with server if props change (e.g. after router.refresh)
    React.useEffect(() => {
        setIsVerified(initialIsVerified);
        const currentDataString = JSON.stringify(initialCorrectedData || initialData || {}, null, 2);
        setJsonInput(currentDataString);
        setLastSavedJson(currentDataString);
    }, [initialIsVerified, initialCorrectedData, initialData]);

    const handleSave = async (verifiedStatus?: boolean) => {
        setIsSaving(true);
        setError(null);
        setShowSuccess(false);

        try {
            let parsedJson = null;
            try {
                parsedJson = JSON.parse(jsonInput);
            } catch {
                throw new Error("Invalid JSON format. Please check your edits.");
            }

            const statusToSave = verifiedStatus !== undefined ? verifiedStatus : isVerified;

            const response = await fetch(`/api/receipts/${receiptId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    is_verified: statusToSave,
                    corrected_data: parsedJson
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to save changes");
            }

            // Sync local dirty state tracker
            setLastSavedJson(jsonInput);
            if (verifiedStatus !== undefined) setIsVerified(verifiedStatus);

            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);

            // Refresh page to show updated server state
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleVerified = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newStatus = e.target.checked;
        setIsVerified(newStatus);
        handleSave(newStatus);
    };

    return (
        <div className={`bg-card border rounded-xl p-6 space-y-4 transition-colors ${isVerified ? "border-green-500 shadow-sm shadow-green-100" : "border-border"}`}>
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold">Verification & Corrections</h2>
                    <p className="text-xs text-muted">Manually verify or correct the slip details</p>
                </div>
                <div className="flex items-center gap-3 bg-muted/50 px-3 py-2 rounded-lg border border-border">
                    <input
                        type="checkbox"
                        id="is_verified"
                        checked={isVerified}
                        onChange={handleToggleVerified}
                        disabled={isSaving}
                        className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
                    />
                    <label htmlFor="is_verified" className={`text-sm font-bold cursor-pointer select-none ${isVerified ? "text-green-700" : "text-foreground"}`}>
                        {isVerified ? "✓ All details correct" : "Mark as correct"}
                    </label>
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex justify-between items-end">
                    <label className="text-sm text-muted block font-medium">Corrected JSON (Structured Export Format)</label>
                    {!!initialCorrectedData && !hasUnsavedChanges && (
                        <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100 font-bold uppercase">
                            Manual Correction Active
                        </span>
                    )}
                </div>
                <div className="relative group">
                    <textarea
                        value={jsonInput}
                        onChange={(e) => setJsonInput(e.target.value)}
                        className={`w-full h-96 p-4 font-mono text-xs rounded-lg border transition-all resize-none outline-none ${hasUnsavedChanges
                            ? "bg-amber-50/30 border-amber-200 focus:ring-amber-500 focus:border-amber-500 shadow-inner"
                            : "bg-muted text-foreground border-border focus:ring-primary focus:border-primary"
                            }`}
                        placeholder="Paste or edit the structured JSON here..."
                    />
                </div>

                {error && <p className="text-xs text-red-500 font-medium bg-red-50 p-2 rounded border border-red-100">{error}</p>}

                <div className="flex justify-between items-center pt-2">
                    <div className="flex items-center gap-2">
                        {showSuccess && (
                            <span className="text-xs font-bold text-green-600 animate-in fade-in slide-in-from-left-2 transition-all">
                                ✓ Progress Saved Successfully
                            </span>
                        )}
                        {hasUnsavedChanges && !isSaving && (
                            <span className="text-xs font-medium text-amber-600">
                                Unsaved changes...
                            </span>
                        )}
                    </div>

                    <button
                        onClick={() => handleSave()}
                        disabled={isSaving || (!hasUnsavedChanges && !!initialCorrectedData)}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${hasUnsavedChanges
                            ? "bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-100 translate-y-[-1px]"
                            : !!initialCorrectedData
                                ? "bg-muted text-muted-foreground border border-border cursor-not-allowed"
                                : "bg-primary hover:bg-primary/90 text-primary-foreground"
                            }`}
                    >
                        {isSaving ? (
                            <>
                                <span className="animate-spin text-xs">🌀</span> Saving...
                            </>
                        ) : hasUnsavedChanges ? (
                            "Save Corrections"
                        ) : initialCorrectedData ? (
                            "✓ Corrected & Saved"
                        ) : (
                            "Save Initial Correction"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
