"use client";

import { useState } from "react";
import { saveAdminSettings } from "./actions";

type Props = {
    judgePrompt: { version: string; text: string };
    geminiMapping: { retailer_path: string; date_path: string; total_path: string };
    extractorConfig: { provider: string; model: string };
    judgeConfig: { provider: string; model: string };
};

const providers = ["gemini", "claude"] as const;
const models = {
    gemini: [
        // Gemini 3
        "gemini-3.1-pro-preview",
        "gemini-3-flash-preview",
        // Gemini 2.5
        "gemini-2.5-pro",
        "gemini-2.5-flash",
        "gemini-2.5-flash-lite",
        // Gemini 2.0
        "gemini-2.0-flash",
        "gemini-2.0-flash-001",
        // Gemini 1.5
        "gemini-1.5-pro",
        "gemini-1.5-flash",
        "gemini-1.5-flash-8b",
    ],
    claude: ["claude-sonnet-4-6", "claude-opus-4-6", "claude-haiku-4-5-20251001", "claude-3-5-sonnet-latest", "claude-3-5-sonnet-20241022", "claude-3-5-haiku-latest", "claude-3-opus-latest"]
};

export default function ClientAdminSettings({ judgePrompt, geminiMapping, extractorConfig, judgeConfig }: Props) {
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

    const [extProvider, setExtProvider] = useState<string>(extractorConfig?.provider || "gemini");
    const [extModel, setExtModel] = useState<string>(extractorConfig?.model || models.gemini[0]);
    const [jdgProvider, setJdgProvider] = useState<string>(judgeConfig?.provider || "gemini");
    const [jdgModel, setJdgModel] = useState<string>(judgeConfig?.model || models.gemini[0]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSaving(true);
        setSaveStatus(null);

        const formData = new FormData(e.currentTarget);
        const result = await saveAdminSettings(formData);

        setIsSaving(false);
        if (result.success) {
            setSaveStatus({ type: "success", msg: "Settings saved successfully." });
        } else {
            setSaveStatus({ type: "error", msg: result.error || "Failed to save settings." });
        }
    };

    return (
        <div className="max-w-4xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Admin Settings</h1>
                <p className="text-muted mt-1">Configure Prompts and Paths for the Batch Testing Harness</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Extractor Configuration Section */}
                <div className="p-6 bg-card border border-border rounded-xl space-y-4 shadow-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-6 bg-primary rounded-full" />
                        <h2 className="text-lg font-semibold text-foreground">Extractor AI Configuration</h2>
                    </div>
                    <p className="text-sm text-muted">Primary model used for deep data extraction from receipts.</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="extractor_provider" className="text-sm font-medium text-foreground">Provider</label>
                            <select
                                id="extractor_provider"
                                name="extractor_provider"
                                value={extProvider}
                                onChange={(e) => {
                                    const p = e.target.value;
                                    setExtProvider(p);
                                    setExtModel(models[p as keyof typeof models]?.[0] || "");
                                }}
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                required
                            >
                                {providers.map(p => (
                                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="extractor_model" className="text-sm font-medium text-foreground">Model</label>
                            <select
                                id="extractor_model"
                                name="extractor_model"
                                value={extModel}
                                onChange={(e) => setExtModel(e.target.value)}
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                required
                            >
                                {models[extProvider as keyof typeof models]?.map(m => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Judge Configuration Section */}
                <div className="p-6 bg-card border border-border rounded-xl space-y-4 shadow-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-6 bg-amber-500 rounded-full" />
                        <h2 className="text-lg font-semibold text-foreground">Judge AI Configuration</h2>
                    </div>
                    <p className="text-sm text-muted">Secondary model used for verification and truth-proxy comparison.</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="judge_provider" className="text-sm font-medium text-foreground">Provider</label>
                            <select
                                id="judge_provider"
                                name="judge_provider"
                                value={jdgProvider}
                                onChange={(e) => {
                                    const p = e.target.value;
                                    setJdgProvider(p);
                                    setJdgModel(models[p as keyof typeof models]?.[0] || "");
                                }}
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                required
                            >
                                {providers.map(p => (
                                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="judge_model" className="text-sm font-medium text-foreground">Model</label>
                            <select
                                id="judge_model"
                                name="judge_model"
                                value={jdgModel}
                                onChange={(e) => setJdgModel(e.target.value)}
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                required
                            >
                                {models[jdgProvider as keyof typeof models]?.map(m => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Judge Prompt Section */}
                <div className="p-6 bg-card border border-border rounded-xl space-y-4 shadow-sm">
                    <h2 className="text-lg font-semibold text-foreground">Judge Prompt Logic</h2>
                    <p className="text-sm text-muted">The instruction set used by the Judge model to perform independent verification.</p>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-1 space-y-2">
                            <label htmlFor="judge_prompt_version" className="text-sm font-medium text-foreground">Version</label>
                            <input
                                id="judge_prompt_version"
                                name="judge_prompt_version"
                                type="text"
                                defaultValue={judgePrompt?.version || "1.0"}
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="e.g. 1.0"
                                required
                            />
                        </div>

                        <div className="md:col-span-3 space-y-2">
                            <label htmlFor="judge_prompt_text" className="text-sm font-medium text-foreground">Prompt Text</label>
                            <textarea
                                id="judge_prompt_text"
                                name="judge_prompt_text"
                                rows={6}
                                defaultValue={judgePrompt?.text || "You are a rigorous receipt judge. Extract retailer_name, slip_date (YYYY-MM-DD), and total_incl_vat. Return strict JSON. Do not guess."}
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                required
                            />
                        </div>
                    </div>
                </div>

                {/* Gemini Extractor Mapping Section */}
                <div className="p-6 bg-card border border-border rounded-xl space-y-4 shadow-sm">
                    <h2 className="text-lg font-semibold text-foreground">JSON Key Mapping</h2>
                    <p className="text-sm text-muted">Field paths for the primary extractor&apos;s JSON output.</p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="gemini_retailer_path" className="text-sm font-medium text-foreground">Retailer Path</label>
                            <input
                                id="gemini_retailer_path"
                                name="gemini_retailer_path"
                                type="text"
                                defaultValue={geminiMapping?.retailer_path || "retailer"}
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="gemini_date_path" className="text-sm font-medium text-foreground">Date Path</label>
                            <input
                                id="gemini_date_path"
                                name="gemini_date_path"
                                type="text"
                                defaultValue={geminiMapping?.date_path || "date"}
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="gemini_total_path" className="text-sm font-medium text-foreground">Total Path</label>
                            <input
                                id="gemini_total_path"
                                name="gemini_total_path"
                                type="text"
                                defaultValue={geminiMapping?.total_path || "total"}
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                required
                            />
                        </div>
                    </div>
                </div>

                {saveStatus && (
                    <div className={`p-4 rounded-lg text-sm ${saveStatus.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
                        {saveStatus.msg}
                    </div>
                )}

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="px-8 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all shadow-md active:scale-95 disabled:opacity-50"
                    >
                        {isSaving ? "Saving..." : "Save Configuration"}
                    </button>
                </div>
            </form>
        </div>
    );
}
