'use server'

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type Client = {
    id: string;
    organization_id: string;
    client_number: number;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    status: string;
    created_at: string;
}

export async function getClients(orgId: string) {
    const supabase = createClient();

    let user = null;
    try {
        const { data } = await supabase.auth.getUser();
        user = data.user;
    } catch (error) {
        console.error("[getClients] Auth/Network Error:", error);
        return [];
    }

    if (!user) {
        console.warn("[getClients] No user found via getUser");
        throw new Error("Unauthorized");
    }

    const { data: clients, error } = await supabase
        .from("clients")
        .select("*")
        .eq("organization_id", orgId)
        .order("name", { ascending: true });

    if (error) throw new Error(error.message);

    return clients as Client[];
}

export async function getClient(orgId: string, clientId: string) {
    const supabase = createClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: client, error } = await supabase
        .from("clients")
        .select("*")
        .eq("organization_id", orgId)
        .eq("id", clientId)
        .single();

    if (error) return null;

    return client as Client;
}

export async function createClientAction(orgId: string, data: { name: string; email?: string; phone?: string; address?: string; latitude?: number; longitude?: number }) {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: client, error } = await supabase
        .from("clients")
        .insert({
            organization_id: orgId,
            name: data.name,
            email: data.email,
            phone: data.phone,
            address: data.address,
            latitude: data.latitude,
            longitude: data.longitude,
            status: 'active'
        })
        .select()
        .single();

    if (error) throw new Error("Failed to create client: " + error.message);

    revalidatePath(`/dashboard/${orgId}/clients`);
    return client;
}

export async function deleteClient(orgId: string, clientId: string) {
    const supabase = createClient();

    const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", clientId)
        .eq("organization_id", orgId);

    if (error) throw new Error("Failed to delete client: " + error.message);

    revalidatePath(`/dashboard/${orgId}/clients`);
}
