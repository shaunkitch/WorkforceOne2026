"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// --- SITES ---

export async function getSites(orgId: string) {
    const supabase = createClient();
    const { data } = await supabase
        .from("sites")
        .select("*, checkpoints(*)")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });

    return data || [];
}

export async function createSite(orgId: string, data: { name: string, address?: string, lat?: number, lng?: number, radius?: number }) {
    const supabase = createClient();
    const { error } = await supabase.from("sites").insert({
        organization_id: orgId,
        name: data.name,
        address: data.address,
        latitude: data.lat,
        longitude: data.lng,
        radius: data.radius || 100
    });

    if (error) throw new Error(error.message);
    revalidatePath(`/dashboard/${orgId}/sites`);
}

export async function deleteSite(orgId: string, siteId: string) {
    const supabase = createClient();
    const { error } = await supabase.from("sites").delete().eq("id", siteId);
    if (error) throw new Error(error.message);
    revalidatePath(`/dashboard/${orgId}/sites`);
}

// --- CHECKPOINTS ---

export async function getCheckpoints(siteId: string) {
    const supabase = createClient();
    const { data } = await supabase
        .from("checkpoints")
        .select("*")
        .eq("site_id", siteId)
        .order("created_at", { ascending: false });
    return data || [];
}

export async function createCheckpoint(orgId: string, siteId: string, data: { name: string, qrCode?: string }) {
    const supabase = createClient();

    // Generate a unique ID for the QR code if not provided
    const qrValue = data.qrCode || `CP-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const { error } = await supabase.from("checkpoints").insert({
        site_id: siteId,
        name: data.name,
        qr_code: qrValue
    });

    if (error) throw new Error(error.message);
    revalidatePath(`/dashboard/${orgId}/sites`);
}

export async function deleteCheckpoint(orgId: string, checkpointId: string) {
    const supabase = createClient();
    const { error } = await supabase.from("checkpoints").delete().eq("id", checkpointId);
    if (error) throw new Error(error.message);
    revalidatePath(`/dashboard/${orgId}/sites`);
}
