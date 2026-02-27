import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const body = await request.json();
        const { is_verified, corrected_data } = body;

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const updateData: { is_verified?: boolean; corrected_data?: Record<string, unknown> } = {};
        if (typeof is_verified === "boolean") updateData.is_verified = is_verified;
        if (corrected_data !== undefined) updateData.corrected_data = corrected_data;

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: "No update data provided" }, { status: 400 });
        }

        const { data, error } = await supabase
            .from("receipts")
            .update(updateData)
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error("Failed to update receipt:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
