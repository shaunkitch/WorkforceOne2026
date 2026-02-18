"use server";

import { createClient } from "@/lib/supabase/server";

export type Patrol = {
    id: string;
    organization_id: string;
    site_id: string;
    user_id: string | null;
    status: 'started' | 'completed' | 'incomplete';
    started_at: string;
    ended_at: string | null;
    notes: string | null;
    created_at: string;
    site?: { name: string };
    user?: { full_name: string | null, email: string };
};

export async function getPatrols(orgId: string) {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("patrols")
        .select(`
            *,
            site:sites(name),
            user:profiles(full_name, email)
        `)
        .eq("organization_id", orgId)
        .order("started_at", { ascending: false })
        .limit(50); // Pagination later

    if (error) {
        console.error("Error fetching patrols:", error);
        return [];
    }

    return data as any as Patrol[]; // Cast due to joined fields
}

export async function getPatrol(patrolId: string) {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("patrols")
        .select(`
            *,
            site:sites(name),
            user:profiles(full_name, email),
            logs:patrol_logs(
                id,
                checkpoint_id,
                formatted_address:location->>'formatted_address',
                status,
                scanned_at,
                checkpoint:checkpoints(name)
            )
        `)
        .eq("id", patrolId)
        .single();

    if (error) {
        console.error("Error fetching patrol details:", error);
        return null;
    }

    return data;
}
