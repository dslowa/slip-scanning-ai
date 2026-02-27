
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

async function checkSchema() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error("Missing Supabase URL or Key in .env");
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Checking connection to:", supabaseUrl);

    // Try to select one record and check keys
    const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error fetching from receipts table:", error.message);
        if (error.message.includes("does not exist")) {
            console.log("HINT: The receipts table itself might be missing or wrongly named.");
        }
        return;
    }

    if (!data || data.length === 0) {
        console.log("No data in receipts table, but connection successful.");
        // Try to check table info via RPC or just assume it's there
        return;
    }

    const record = data[0];
    const columns = Object.keys(record);

    console.log("Available columns in 'receipts' table:", columns.join(", "));

    const requiredColumns = ['is_verified', 'corrected_data'];
    const missing = requiredColumns.filter(col => !columns.includes(col));

    if (missing.length > 0) {
        console.warn("\nCRITICAL MISSING COLUMNS:", missing.join(", "));
        console.log("Please run the migration: supabase/migrations/20260227_add_verification_fields.sql");
    } else {
        console.log("\nAll required columns exist.");
    }
}

checkSchema();
