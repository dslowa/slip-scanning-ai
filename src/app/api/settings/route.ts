import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = 'force-dynamic';

const DEFAULT_MODEL = "gemini-2.0-flash";

export async function GET() {
    try {
        const { data, error } = await supabase
            .from("app_settings")
            .select("value")
            .eq("key", "gemini_model")
            .single();

        if (error || !data) {
            return NextResponse.json({ gemini_model: DEFAULT_MODEL });
        }

        return NextResponse.json({ gemini_model: data.value });
    } catch (err) {
        console.error("Settings GET error:", err);
        return NextResponse.json({ gemini_model: DEFAULT_MODEL });
    }
}

export async function POST(request: Request) {
    try {
        const { gemini_model } = await request.json();

        if (!gemini_model || typeof gemini_model !== "string") {
            return NextResponse.json({ error: "Invalid model value" }, { status: 400 });
        }

        const { error } = await supabase
            .from("app_settings")
            .upsert({ key: "gemini_model", value: gemini_model, updated_at: new Date().toISOString() });

        if (error) {
            console.error("Settings POST error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, gemini_model });
    } catch (err) {
        console.error("Settings POST error:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
