// Migration script: change receipt_items.quantity from INTEGER to DECIMAL(10,4)
// Uses Supabase anon key — relies on the fact that ALTER TABLE doesn't need RLS

const SUPABASE_URL = 'https://irhhdmovygyotxygoiky.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlyaGhkbW92eWd5b3R4eWdvaWt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMjIzMjksImV4cCI6MjA4Njg5ODMyOX0.mKtUjoyWFFs4Tqx_iU8eVMhISlGm1BKM01PoO2NU-t4';

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
    console.log('Connected to Supabase:', SUPABASE_URL);

    // Test a known fractional insert to see if the column already accepts decimals
    console.log('\nTesting decimal quantity insert...');
    const { data: testReceipt } = await supabase
        .from('receipts')
        .select('id')
        .limit(1)
        .single();

    if (!testReceipt) {
        console.log('No receipts found to test against.');
        return;
    }

    const { error: testError } = await supabase
        .from('receipt_items')
        .insert({
            receipt_id: testReceipt.id,
            description: '__migration_test__',
            quantity: 0.196,
            unit_price: 149.99,
            total_price: 29.38,
            discount: 0,
            final_price: 29.38
        });

    if (testError) {
        console.log('❌ Decimal insert FAILED:', testError.message);
        console.log('\nThe column is still INTEGER. You need to run this SQL in the Supabase dashboard:');
        console.log('\n  ALTER TABLE receipt_items ALTER COLUMN quantity TYPE DECIMAL(10, 4);\n');
        console.log('Go to: https://supabase.com/dashboard/project/irhhdmovygyotxygoiky/editor');
    } else {
        console.log('✅ Decimal insert SUCCEEDED - column already accepts decimals or was already fixed!');
        // Clean up test row
        await supabase
            .from('receipt_items')
            .delete()
            .eq('description', '__migration_test__')
            .eq('receipt_id', testReceipt.id);
        console.log('Cleaned up test row.');
    }
}

run().catch(e => { console.error('Script error:', e.message); process.exit(1); });
