'use server'

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type Visit = {
    id: string;
    organization_id: string;
    client_id: string;
    user_id: string | null;
    title: string;
    description: string | null;
    scheduled_at: string;
    completed_at: string | null;
    status: string;
    location: any;
    clients?: { name: string; address: string } | null;
    profiles?: { full_name: string } | null;
}

export async function getVisits(orgId: string, filters?: { clientId?: string }) {
    const supabase = createClient();

    let user = null;
    try {
        const { data } = await supabase.auth.getUser();
        user = data.user;
    } catch (error) {
        console.error("[getVisits] Auth/Network Error:", error);
        return [];
    }

    if (!user) {
        console.warn("[getVisits] No user found via getUser");
        throw new Error("Unauthorized");
    }

    let query = supabase
        .from("visits")
        .select(`
            *,
            clients (name, address),
            profiles (full_name)
        `)
        .eq("organization_id", orgId);

    if (filters?.clientId) {
        query = query.eq("client_id", filters.clientId);
    }

    const { data: visits, error } = await query.order("scheduled_at", { ascending: false });

    if (error) throw new Error(error.message);

    return visits as Visit[];
}


export async function createVisit(orgId: string, data: { clientId: string; title: string; description?: string; scheduledAt: string; userId?: string; recurrence?: string }) {
    const supabase = createClient();

    // Validate
    if (!data.clientId || !data.title || !data.scheduledAt) {
        throw new Error("Missing required fields");
    }

    const visitsToCreate = [];
    const baseDate = new Date(data.scheduledAt);
    const count = data.recurrence && data.recurrence !== 'none' ? 6 : 1; // Default to 6 occurrences for recurring

    for (let i = 0; i < count; i++) {
        const date = new Date(baseDate);
        if (data.recurrence === 'weekly') {
            date.setDate(baseDate.getDate() + (i * 7));
        } else if (data.recurrence === 'bi-weekly') {
            date.setDate(baseDate.getDate() + (i * 14));
        } else if (data.recurrence === 'monthly') {
            date.setMonth(baseDate.getMonth() + i);
        }

        visitsToCreate.push({
            organization_id: orgId,
            client_id: data.clientId,
            title: data.title,
            description: data.description,
            scheduled_at: date.toISOString(),
            user_id: data.userId || null,
            status: 'scheduled'
        });
    }

    const { error } = await supabase
        .from("visits")
        .insert(visitsToCreate);

    if (error) throw new Error("Failed to create visit(s): " + error.message);

    revalidatePath(`/dashboard/${orgId}/visits`);
}

export async function updateVisit(orgId: string, visitId: string, data: { clientId?: string; title?: string; description?: string; scheduledAt?: string; userId?: string; recurrence?: string }) {
    const supabase = createClient();

    const updates: any = {};
    if (data.clientId) updates.client_id = data.clientId;
    if (data.title) updates.title = data.title;
    if (data.description !== undefined) updates.description = data.description; // Allow clearing
    if (data.scheduledAt) updates.scheduled_at = data.scheduledAt;
    if (data.userId !== undefined) updates.user_id = data.userId || null; // Allow unassigning

    // Recurrence update logic is complex. 
    // Option 1: Only update this specific visit. (Simple, standard for "Edit Occurrence")
    // Option 2: Update future visits. (Complex)
    // For MVP, we'll stick to updating THIS visit. Recurrence field in DB isn't strictly tracked per visit series yet, 
    // we just generated them. So we ignore re-triggering recurrence for now unless requested.

    const { error } = await supabase
        .from("visits")
        .update(updates)
        .eq("id", visitId)
        .eq("organization_id", orgId);

    if (error) throw new Error("Failed to update visit: " + error.message);

    revalidatePath(`/dashboard/${orgId}/visits`);
}

export async function updateVisitStatus(orgId: string, visitId: string, status: string) {
    const supabase = createClient();

    const updates: any = { status };
    if (status === 'completed') {
        updates.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
        .from("visits")
        .update(updates)
        .eq("id", visitId)
        .eq("organization_id", orgId);

    if (error) throw new Error("Failed to update visit: " + error.message);

    revalidatePath(`/dashboard/${orgId}/visits`);
}

export async function deleteVisit(orgId: string, visitId: string) {
    const supabase = createClient();

    const { error } = await supabase
        .from("visits")
        .delete()
        .eq("id", visitId)
        .eq("organization_id", orgId);

    if (error) throw new Error("Failed to delete visit: " + error.message);

    revalidatePath(`/dashboard/${orgId}/visits`);
}
