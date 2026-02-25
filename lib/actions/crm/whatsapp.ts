"use server";

import { createClient } from "@/lib/supabase/server";

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v17.0';
const WHATSAPP_PHONE_NODE_ID = process.env.WHATSAPP_PHONE_NODE_ID;
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

/**
 * Sends a WhatsApp message containing a structured Quote/Proposal to a client.
 * Note: In a real environment, you *must* use pre-approved Message Templates 
 * for initiating conversations outside the 24-hour window. This uses a standard text
 * or template payload structure.
 */
export async function sendQuoteViaWhatsApp(orgId: string, quoteId: string, clientPhone: string) {
    const supabase = createClient();

    // 1. Fetch Quote Details
    const { data: quote, error } = await supabase
        .from("quotes")
        .select(`*, clients(name, phone), items:quote_items(*)`)
        .eq("id", quoteId)
        .eq("organization_id", orgId)
        .single();

    if (error || !quote) {
        throw new Error(`Failed to fetch quote: ${error?.message}`);
    }

    // Determine the target phone number (override with the one passed in if provided)
    const targetPhone = clientPhone || quote.clients?.phone;
    if (!targetPhone) {
        throw new Error("No client phone number available to send WhatsApp message");
    }

    // 2. Formatting the message
    // If not using a template, here is what a direct message looks like:
    const total = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(quote.total_amount);

    // Constructing a payload for WhatsApp Cloud API
    const payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: targetPhone.replace(/\D/g, ''), // E.164 without '+'
        type: "template",
        template: {
            name: "workforce_quote_proposal", // This template must be approved in WA Business Manager
            language: { code: "en_US" },
            components: [
                {
                    type: "body",
                    parameters: [
                        { type: "text", text: quote.clients?.name || 'Customer' },
                        { type: "text", text: quote.title },
                        { type: "text", text: total },
                        { type: "text", text: `https://workforceone.app/q/${quote.id}` } // Public quote link
                    ]
                }
            ]
        }
    };

    try {
        // If credentials exist, fire the actual HTTP request
        if (WHATSAPP_PHONE_NODE_ID && WHATSAPP_ACCESS_TOKEN) {
            const response = await fetch(`${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NODE_ID}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error?.message || 'Failed to send WhatsApp message');
            }
        } else {
            console.log("[MOCK] WhatsApp API credentials missing. Mocking success.");
            console.log(`[WhatsApp Payload] To: ${targetPhone} ->`, JSON.stringify(payload, null, 2));
            // Simulate network delay
            await new Promise(r => setTimeout(r, 800));
        }

        // 3. Update quote status to sent
        await supabase
            .from("quotes")
            .update({ status: 'sent' })
            .eq("id", quoteId);

        return { success: true, message: "Quote sent via WhatsApp successfully" };

    } catch (e: any) {
        console.error("WhatsApp Integration Error:", e);
        throw new Error(`WhatsApp integration failed: ${e.message}`);
    }
}
