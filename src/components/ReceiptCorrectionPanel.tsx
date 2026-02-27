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
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async (verifiedStatus?: boolean) => {
        setIsSaving(true);
        setError(null);

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

            // Sync state
            if (verifiedStatus !== undefined) setIsVerified(verifiedStatus);

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
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Verification & Corrections</h2>
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="is_verified"
                        checked={isVerified}
                        onChange={handleToggleVerified}
                        disabled={isSaving}
                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary h-5 w-5 cursor-pointer"
                    />
                    <label htmlFor="is_verified" className="text-sm font-medium cursor-pointer select-none">
                        All details correct
                    </label>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm text-muted block font-medium">Corrected JSON (Structured Export Format)</label>
                <div className="relative group">
                    <textarea
                        value={jsonInput}
                        onChange={(e) => setJsonInput(e.target.value)}
                        className="w-full h-96 p-4 bg-muted text-foreground font-mono text-xs rounded-lg border border-border focus:ring-1 focus:ring-primary focus:border-primary resize-none outline-none"
                        placeholder="Paste or edit the structured JSON here..."
                    />
                </div>
                {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
                <div className="flex justify-end pt-2">
                    <button
                        onClick={() => handleSave()}
                        disabled={isSaving}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                        {isSaving ? "Saving..." : "Save Corrected JSON"}
                    </button>
                </div>
            </div>
        </div>
    );
}
