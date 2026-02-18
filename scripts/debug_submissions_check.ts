
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load env from project root manually
const envPath = path.resolve(__dirname, '../.env.local');
let envContent = '';
try {
    envContent = fs.readFileSync(envPath, 'utf-8');
} catch (e) {
    console.error("Could not read .env.local");
    process.exit(1);
}

const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim().replace(/"/g, '');
        env[key] = value;
    }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testSubmitBatch() {
    const formId = '38692b0c-65bb-47d8-98e0-1aa4355684ef';

    console.log("Fetching a valid user...");
    const { data: users, error: userError } = await supabase.from('profiles').select('id').limit(1);
    if (userError || !users || users.length === 0) {
        console.error("Could not find any user to test with.", userError);
        return;
    }
    const testUserId = users[0].id;
    console.log("Using user:", testUserId);

    const dummySubmission = {
        id: crypto.randomUUID(),
        form_id: formId,
        user_id: testUserId,
        data: { "test_field": "rpc_fix_test_value" },
        location: { "lat": 1.23, "lng": 4.56 },
        submitted_at: new Date().toISOString(),
        status: 'submitted'
    };

    console.log("Calling submit_batch with:", JSON.stringify([dummySubmission], null, 2));

    // Note: client side we send ARRAY of objects.
    // RPC expects `submissions jsonb`. 
    // Supabase JS client handles this mapping?
    // If I send an array `[obj1, obj2]`, supabase sends it as JSON body.
    // The RPC argument `submissions` of type `jsonb` will receive that array as a JSON array.
    // This is what we want.
    const { data, error } = await supabase.rpc('submit_batch', { submissions: [dummySubmission] });

    if (error) {
        console.error("RPC Error:", error);
    } else {
        console.log("RPC Success:", JSON.stringify(data, null, 2));
    }
}

testSubmitBatch();
