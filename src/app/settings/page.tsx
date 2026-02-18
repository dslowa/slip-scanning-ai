export const dynamic = 'force-dynamic';

export default function SettingsPage() {
    const isGeminiEnabled = !!process.env.GEMINI_API_KEY;

    return (
        <div className="max-w-2xl space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Settings</h1>
                <p className="text-muted mt-1">Manage system preferences</p>
            </div>

            <div className="space-y-6">
                {/* OCR Settings */}
                <div className="bg-card border border-border rounded-xl p-6">
                    <h2 className="text-lg font-semibold mb-4">OCR Configuration</h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">OCR Provider</p>
                                <p className="text-sm text-muted">
                                    {isGeminiEnabled ? "Using Gemini Flash (Latest)" : "Using Mock Service (Dev)"}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`w-3 h-3 rounded-full ${isGeminiEnabled ? "bg-green-500 animate-pulse" : "bg-yellow-500"}`}></span>
                                <span className="text-sm font-medium">
                                    {isGeminiEnabled ? "Active" : "Mock Mode"}
                                </span>
                            </div>
                        </div>

                        {!isGeminiEnabled && (
                            <div className="bg-yellow-50/10 border border-yellow-200/20 text-yellow-600 p-3 rounded-lg text-sm">
                                ⚠️ No API Key detected. Using mock data. Add <code>GEMINI_API_KEY</code> to env to go live.
                            </div>
                        )}

                        {isGeminiEnabled && (
                            <div className="bg-green-50/10 border border-green-200/20 text-green-600 p-3 rounded-lg text-sm">
                                ✅ Connected to Google Gemini. Real extraction enabled.
                            </div>
                        )}
                    </div>
                </div>

                {/* Validation */}
                <div className="bg-card border border-border rounded-xl p-6">
                    <h2 className="text-lg font-semibold mb-4">Validation Rules</h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Fraud Detection Strictness</p>
                                <p className="text-sm text-muted">Adjust duplicate detection sensitivity</p>
                            </div>
                            <select className="border rounded-lg bg-background px-3 py-2 text-sm">
                                <option>High</option>
                                <option>Medium</option>
                                <option>Low</option>
                            </select>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-border">
                            <div>
                                <p className="font-medium">Block Blurry Images</p>
                                <p className="text-sm text-muted">Automatically reject unreadable scans</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
