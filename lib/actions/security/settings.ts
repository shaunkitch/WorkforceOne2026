"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type SecurityUser = {
    id: string; // member id
    user_id: string;
    role: string;
    metadata: {
        is_security_guard?: boolean;
        [key: string]: any;
    };
    profile: {
        full_name: string | null;
        email: string;
    };
};

export async function getSecurityUsers(orgId: string) {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("organization_members")
        .select(`
            id,
            user_id,
            role,
            metadata,
            profile:profiles(full_name, email)
        `)
        .eq("organization_id", orgId);

    if (error) {
        console.error("Error fetching security users:", error);
        return [];
    }

    return data as any as SecurityUser[];
}

export async function toggleSecurityAccess(memberId: string, isGuard: boolean, orgId: string) {
    const supabase = createClient();

    // Fetch current metadata first to preserve other keys
    const { data: member, error: fetchError } = await supabase
        .from("organization_members")
        .select("metadata")
        .eq("id", memberId)
        .single();

    if (fetchError) throw new Error(fetchError.message);

    const newMetadata = {
        ...member.metadata,
        is_security_guard: isGuard
    };

    const { error } = await supabase
        .from("organization_members")
        .update({ metadata: newMetadata })
        .eq("id", memberId);

    if (error) {
        throw new Error(error.message);
    }

    revalidatePath(`/dashboard/${orgId}/security/settings`);
}
