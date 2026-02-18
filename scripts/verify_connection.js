const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://irhhdmovygyotxygoiky.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlyaGhkbW92eWd5b3R4eWdvaWt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMjIzMjksImV4cCI6MjA4Njg5ODMyOX0.mKtUjoyWFFs4Tqx_iU8eVMhISlGm1BKM01PoO2NU-t4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConnection() {
    console.log(`Checking connection to ${supabaseUrl}...`);
    try {
        // Try to select from a non-existent table just to check connection/auth
        // Or just check health if possible. 
        // Usually selecting from a system table or just an empty select is enough.
        const { data, error } = await supabase.from('receipts').select('count', { count: 'exact', head: true });

        if (error) {
            console.log('Connection established, but encountered error (expected if table missing):', error.message);
            if (error.code === 'PGRST116') {
                console.log('Project is likely PAUSED or does not exist (REST API not responding correctly).');
            } else if (error.code === '42P01') {
                console.log('Table does not exist, but connection to API worked!');
            } else {
                console.log('API responded. Error details:', error);
            }
        } else {
            console.log('Connection SUCCESSFUL! API is up.');
        }
    } catch (err) {
        console.error('Network/Client Error:', err.message);
    }
}

checkConnection();
