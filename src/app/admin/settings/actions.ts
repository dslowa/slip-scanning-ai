"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export async function saveAdminSettings(formData: FormData) {
    try {
        const judgePromptVersion = formData.get("judge_prompt_version") as string;
        const judgePromptText = formData.get("judge_prompt_text") as string;

        const extractorProvider = formData.get("extractor_provider") as string;
        const extractorModel = formData.get("extractor_model") as string;

        const judgeProvider = formData.get("judge_provider") as string;
        const judgeModel = formData.get("judge_model") as string;

        const retailerPath = formData.get("gemini_retailer_path") as string;
        const datePath = formData.get("gemini_date_path") as string;
        const totalPath = formData.get("gemini_total_path") as string;

        // Save judge prompt
        const { error: error1 } = await supabase.from("admin_settings").upsert({
            key: "judge_prompt",
            value: { version: judgePromptVersion || "1.0", text: judgePromptText },
        }, { onConflict: "key" });

        if (error1) throw error1;

        // Save gemini mapping
        const { error: error2 } = await supabase.from("admin_settings").upsert({
            key: "gemini_mapping",
            value: {
                retailer_path: retailerPath || "retailer",
                date_path: datePath || "date",
                total_path: totalPath || "total"
            },
        }, { onConflict: "key" });

        if (error2) throw error2;

        const { error: error3 } = await supabase.from("admin_settings").upsert({
            key: "extractor_config",
            value: {
                provider: extractorProvider || "gemini",
                model: extractorModel || "gemini-1.5-flash"
            },
        }, { onConflict: "key" });

        if (error3) throw error3;

        const { error: error4 } = await supabase.from("admin_settings").upsert({
            key: "judge_config",
            value: {
                provider: judgeProvider || "gemini",
                model: judgeModel || "gemini-1.5-flash"
            },
        }, { onConflict: "key" });

        if (error4) throw error4;

        // Clean up old config if needed (optional)
        await supabase.from("admin_settings").delete().eq("key", "ai_config");

        revalidatePath("/admin/settings");
        revalidatePath("/batch/new");
        return { success: true };
    } catch (error: unknown) {
        console.error("Failed to save settings:", error);
        return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred" };
    }
}
