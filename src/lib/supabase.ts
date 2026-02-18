import { createClient } from '@supabase/supabase-js';

// Use empty fallbacks if environment variables are missing during build
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    if (process.env.NODE_ENV === 'production') {
        console.warn("Supabase credentials missing. Building for production...");
    }
}

export const supabase = createClient(supabaseUrl, supabaseKey);
