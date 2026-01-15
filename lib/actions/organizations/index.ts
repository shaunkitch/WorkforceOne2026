'use server'

import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/database";

export async function getOrganization(orgId: string) {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("Unauthorized");
    }

    // Get organization details
    const { data: org, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", orgId)
        .single();

    if (error) {
        throw new Error(error.message);
    }

    // Verify membership
    const { data: membership, error: membershipError } = await supabase
        .from("organization_members")
        .select("role")
        .eq("organization_id", orgId)
        .eq("user_id", user.id)
        .single();

    if (membershipError || !membership) {
        throw new Error("Unauthorized access to organization");
    }

    return { ...org, role: membership.role };
}

export async function getOrganizationMembers(orgId: string) {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Verify requester membership
    const { data: membership } = await supabase
        .from("organization_members")
        .select("role")
        .eq("organization_id", orgId)
        .eq("user_id", user.id)
        .single();

    if (!membership) throw new Error("Unauthorized");

    const { data: members, error } = await supabase
        .from("organization_members")
        .select(`
      *,
      profiles:user_id (
        full_name,
        email,
        mobile,
        avatar_url,
        hourly_rate
      )
    `) // Note: This assumes a relation to auth.users or a public profiles table which might differ. 
        // Based on schema in claude.md: user_id REFERENCES profiles. 
        // We might need to adjust based on actual table structure for profiles.
        .eq("organization_id", orgId);

    if (error) {
        throw new Error(error.message);
    }

    return members || [];
}

import { revalidatePath } from "next/cache";

export async function updateOrganization(orgId: string, data: { name?: string; brandColor?: string; logoUrl?: string; faviconUrl?: string; currency?: string }) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Check permissions (Owner/Admin) - RLS handles 'owner' update usually, but let's be safe
    // The policy "Owners can update their organization" might be strict. Let's see.
    // Assuming policy is correct.

    console.log("Updating organization settings:", { orgId, data });

    const { data: updated, error } = await supabase.from("organizations").update({
        name: data.name,
        brand_color: data.brandColor,
        logo_url: data.logoUrl,
        favicon_url: data.faviconUrl,
        currency: data.currency
    }).eq("id", orgId).select();

    if (error) {
        console.error("Error updating organization settings:", error);
        throw new Error("Failed to update settings: " + error.message);
    }

    if (!updated || updated.length === 0) {
        console.error("Update failed: No rows updated. Check RLS or Invalid ID.");
        throw new Error("No changes saved. You might not have permission (Owner required).");
    }

    console.log("Organization settings updated successfully. ID:", updated[0].id);

    revalidatePath(`/dashboard/${orgId}/settings`);
    revalidatePath(`/dashboard/${orgId}`);
}

export async function getOrganizationUsage(orgId: string) {
    const supabase = createClient();

    // Get organization limits
    const { data: org } = await supabase.from("organizations").select("limits_forms, limits_submissions, storage_used").eq("id", orgId).single();

    if (!org) return null;

    // Get current counts
    const { count: formsCount } = await supabase.from("forms").select("*", { count: 'exact', head: true }).eq("organization_id", orgId);
    const { count: membersCount } = await supabase.from("organization_members").select("*", { count: 'exact', head: true }).eq("organization_id", orgId);

    // For storage, we use the stored value or calculate it if we had file uploads (mocked for now)

    return {
        forms: { used: formsCount || 0, limit: org.limits_forms },
        submissions: { used: 0, limit: org.limits_submissions }, // We need to aggregate submissions, expensive operation usually.
        storage: { used: org.storage_used || 0, limit: 104857600 }, // Mock 100MB limit
        members: { used: membersCount || 0, limit: 50 }, // Mock 50 member limit
    };
}


