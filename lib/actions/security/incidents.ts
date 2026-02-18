"use server";

import { createClient } from "@/lib/supabase/server";

export type Incident = {
    id: string;
    organization_id: string;
    patrol_id: string | null;
    user_id: string | null;
    title: string;
    description: string | null;
    priority: 'low' | 'medium' | 'high' | 'critical';
    status: 'open' | 'investigating' | 'resolved' | 'closed';
    photos: string[] | null;
    location: any; // jsonb
    created_at: string;
    updated_at: string;
    user?: { full_name: string | null, email: string };
    patrol?: { site_id: string, site?: { name: string } };
};

export async function getIncidents(orgId: string) {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("incidents")
        .select(`
            *,
            user:profiles(full_name, email),
            patrol:patrols(
                site_id,
                site:sites(name)
            )
        `)
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(50);

    if (error) {
        console.error("Error fetching incidents:", error);
        return [];
    }

    return data as any as Incident[];
}

export async function getIncident(incidentId: string) {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("incidents")
        .select(`
            *,
            user:profiles(full_name, email),
            patrol:patrols(
                site_id,
                site:sites(name)
            )
        `)
        .eq("id", incidentId)
        .single();

    if (error) {
        console.error("Error fetching incident details:", error);
        return null;
    }

    return data as any as Incident;
}

export async function updateIncidentStatus(incidentId: string, status: Incident['status']) {
    const supabase = createClient();

    // Check permission? Assuming admin for now via RLS/middleware or just RLS owner/admin check
    const { error } = await supabase
        .from("incidents")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", incidentId);

    if (error) {
        throw new Error(error.message);
    }
}
