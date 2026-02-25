"use server";

import { createClient } from "@/lib/supabase/server";

export type AICategoryResult = {
    category: string; // e.g., 'Travel', 'Meals', 'Office Supplies', 'Software'
    confidence: number; // 0.0 to 1.0
    merchant_normalized: string;
};

// In a real production app, this would call an LLM API (OpenAI/Anthropic)
// For this implementation, we use a sophisticated heuristic/mock that an LLM would replace
async function categorizeExpenseWithAI(merchant: string, description: string): Promise<AICategoryResult> {
    const text = `${merchant} ${description}`.toLowerCase();

    // Simple heuristic map (mocking AI behavior)
    const keywords: Record<string, string[]> = {
        'Travel': ['uber', 'lyft', 'taxi', 'flight', 'delta', 'united', 'hotel', 'marriott', 'train', 'parking', 'fuel', 'shell', 'bp'],
        'Meals & Entertainment': ['restaurant', 'cafe', 'starbucks', 'mcdonalds', 'dinner', 'lunch', 'pizza', 'doordash', 'ubereats'],
        'Software Subscriptions': ['aws', 'github', 'vercel', 'supabase', 'adobe', 'slack', 'zoom', 'software', 'subscription'],
        'Office Supplies': ['staples', 'amazon', 'paper', 'ink', 'desk', 'chair', 'hardware', 'apple'],
        'Utilities': ['electric', 'water', 'internet', 'comcast', 'verizon', 'att']
    };

    let bestMatch = 'Uncategorized';
    let maxMatchCount = 0;

    for (const [category, words] of Object.entries(keywords)) {
        const matchCount = words.filter(w => text.includes(w)).length;
        if (matchCount > maxMatchCount) {
            maxMatchCount = matchCount;
            bestMatch = category;
        }
    }

    // Assign a mock confidence based on match strength
    const confidence = maxMatchCount > 1 ? 0.95 : maxMatchCount === 1 ? 0.75 : 0.40;

    // Simulate LLM processing delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Normalize merchant name (e.g., "Uber Eats 1234" -> "Uber Eats")
    let merchant_normalized = merchant.trim();
    if (bestMatch !== 'Uncategorized' && maxMatchCount > 0) {
        // attempt to find the root brand name for mock cleanliness
        for (const w of keywords[bestMatch]) {
            if (merchant_normalized.toLowerCase().includes(w)) {
                merchant_normalized = w.charAt(0).toUpperCase() + w.slice(1);
                break;
            }
        }
    }

    return {
        category: bestMatch,
        confidence,
        merchant_normalized: merchant_normalized.length > 2 ? merchant_normalized : merchant
    };
}

export async function submitExpense(orgId: string, data: { amount: number; merchant: string; date: string; description: string; receiptUrl?: string; currency?: string }) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // 1. Run AI Categorization
    const aiResult = await categorizeExpenseWithAI(data.merchant, data.description);

    // 2. Insert into database
    const { data: expense, error } = await supabase.from('expenses').insert({
        organization_id: orgId,
        user_id: user.id,
        amount: data.amount,
        currency: data.currency || 'USD',
        merchant: aiResult.merchant_normalized, // use AI cleaned name
        date: data.date,
        description: data.description,
        receipt_url: data.receiptUrl,
        category: aiResult.category,
        confidence_score: aiResult.confidence,
        status: aiResult.confidence > 0.9 ? 'approved' : 'pending' // Auto-approve highly confident categorizations
    }).select().single();

    if (error) throw new Error(`Failed to submit expense: ${error.message}`);

    return expense;
}

export async function getExpenses(orgId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('expenses')
        .select('*, profiles(full_name, email)')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch expenses: ${error.message}`);
    return data;
}

export async function updateExpenseStatus(orgId: string, expenseId: string, status: 'approved' | 'rejected', category?: string) {
    const supabase = createClient();

    const updateData: any = { status, updated_at: new Date().toISOString() };
    if (category) {
        updateData.category = category;
        // If human corrects it, we log 100% confidence in the manual override
        updateData.confidence_score = 1.0;
    }

    const { error } = await supabase
        .from('expenses')
        .update(updateData)
        .eq('id', expenseId)
        .eq('organization_id', orgId);

    if (error) throw new Error(`Failed to update expense: ${error.message}`);
}
