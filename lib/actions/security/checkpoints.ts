"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type Checkpoint = {
    id: string;
    organization_id: string;
    site_id: string;
    name: string;
    description: string | null;
    qr_code: string;
    order: number;
    is_active: boolean;
    created_at: string;
};

export async function getCheckpoints(siteId: string) {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("checkpoints")
        .select("*")
        .eq("site_id", siteId)
        .order("order", { ascending: true });

    if (error) {
        console.error("Error fetching checkpoints:", error);
        return [];
    }

    return data as Checkpoint[];
}

export async function createCheckpoint(data: {
    siteId: string;
    organizationId: string;
    name: string;
    description?: string;
    qrCode: string;
}) {
    const supabase = createClient();

    const { data: newCheckpoint, error } = await supabase
        .from("checkpoints")
        .insert({
            site_id: data.siteId,
            organization_id: data.organizationId,
            name: data.name,
            description: data.description,
            qr_code: data.qrCode,
            order: 0, // Default to 0 or calculate max + 1
            is_active: true
        })
        .select()
        .single();

    if (error) {
        throw new Error(error.message);
    }

    revalidatePath(`/dashboard/${data.organizationId}/security/checkpoints`);
    return newCheckpoint;
}

export async function deleteCheckpoint(checkpointId: string, orgId: string) {
    const supabase = createClient();

    const { error } = await supabase
        .from("checkpoints")
        .delete()
        .eq("id", checkpointId);

    if (error) {
        throw new Error(error.message);
    }

    revalidatePath(`/dashboard/${orgId}/security/checkpoints`);
}
