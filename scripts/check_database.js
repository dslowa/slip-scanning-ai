const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function checkDB() {
    try {
        const envPath = path.join(process.cwd(), ".env.local");
        const envContent = fs.readFileSync(envPath, "utf8");

        const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
        const keyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

        if (!urlMatch || !keyMatch) {
            console.error("Missing Supabase credentials in .env.local");
            return;
        }

        const supabaseUrl = urlMatch[1].trim();
        const supabaseKey = keyMatch[1].trim();

        console.log("Connecting to:", supabaseUrl);
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data, error } = await supabase
            .from('receipts')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Supabase Error:", error);
        } else {
            console.log(`Found ${data.length} receipts.`);
            data.forEach(r => {
                console.log(`- [${r.id}] ${r.retailer} (R${r.total_amount}) - ${r.date}`);
            });
        }

    } catch (e) {
        console.error("Script Error:", e);
    }
}

checkDB();
