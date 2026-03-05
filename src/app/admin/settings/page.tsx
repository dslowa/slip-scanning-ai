import { createClient } from "@supabase/supabase-js";
import ClientAdminSettings from "./ClientAdminSettings";

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
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
        // Fetch all admin settings from the database
        const { data: settings, error } = await supabase
            .from("admin_settings")
            .select("key, value");

        // If there is an error (e.g., table doesn't exist yet), we catch it below.
        if (error) throw error;

        // Parse values into expected types
        const judgePromptSetting = settings?.find(s => s.key === "judge_prompt");
        const judgePrompt = judgePromptSetting?.value || { version: "1.0", text: "You are a rigorous receipt judge. Extract retailer_name, slip_date (YYYY-MM-DD), and total_incl_vat. Return strict JSON. Do not guess." };

        const mapSetting = settings?.find(s => s.key === "gemini_mapping");
        const geminiMapping = mapSetting?.value || { retailer_path: "retailer", date_path: "date", total_path: "total" };

        const extractorConfigSetting = settings?.find(s => s.key === "extractor_config");
        const extractorConfig = extractorConfigSetting?.value || { provider: "gemini", model: "gemini-1.5-flash" };

        const judgeConfigSetting = settings?.find(s => s.key === "judge_config");
        const judgeConfig = judgeConfigSetting?.value || { provider: "gemini", model: "gemini-1.5-flash" };

        return (
            <ClientAdminSettings
                judgePrompt={judgePrompt}
                geminiMapping={geminiMapping}
                extractorConfig={extractorConfig}
                judgeConfig={judgeConfig}
            />
        );

    } catch (error: unknown) {
        const err = error as { code?: string; message?: string };
        // If the table does not exist, show a helpful message
        if (err.code === '42P01') {
            return (
                <div className="max-w-4xl space-y-6">
                    <div className="p-6 bg-red-50 border border-red-200 rounded-xl space-y-4">
                        <h2 className="text-xl font-bold text-red-800">Database Migration Required</h2>
                        <p className="text-red-700">
                            The <strong>admin_settings</strong> table does not exist in your Supabase database yet.
                        </p>
                        <p className="text-red-700">
                            Please apply the recent database migrations to your Supabase project:
                        </p>
                        <pre className="p-4 bg-red-900 text-red-50 rounded-lg overflow-x-auto text-sm">
                            npx supabase db push
                        </pre>
                        <p className="text-red-700 text-sm">
                            If you are not using the CLI linked to your project, you can copy the SQL from <code className="bg-red-200 px-1 py-0.5 rounded">supabase/migrations/</code> and run it in the Supabase Dashboard SQL Editor.
                        </p>
                    </div>
                </div>
            );
        }

        // Generic error
        return (
            <div className="max-w-4xl space-y-6">
                <div className="p-6 bg-red-50 border border-red-200 rounded-xl">
                    <h2 className="text-xl font-bold text-red-800">Error Loading Settings</h2>
                    <p className="text-red-700 mt-2">{err.message || "An unknown error occurred."}</p>
                </div>
            </div>
        );
    }
}
