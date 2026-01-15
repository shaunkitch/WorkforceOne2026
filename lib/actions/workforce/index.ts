"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWelcomeEmail } from "@/lib/mail";
import { revalidatePath } from "next/cache";

export async function createTeam(orgId: string, name: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    await supabase.from("teams").insert({
        organization_id: orgId,
        name: name
    });

    revalidatePath(`/dashboard/${orgId}/users/teams`);
}

export async function getTeams(orgId: string) {
    const supabase = createClient();

    const { data: teams } = await supabase
        .from("teams")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });

    return teams || [];
}

export async function getTeamMembers(teamId: string) {
    const supabase = createClient();
    // Assuming we can join profiles through user_id
    const { data: members } = await supabase
        .from("team_members")
        .select("*, profiles(*)")
        .eq("team_id", teamId);

    return members || [];
}

// Extended User Creation
export async function createUser(orgId: string, data: {
    firstName: string;
    lastName: string;
    email: string;
    mobile: string;
    role: "admin" | "editor" | "viewer";
    teamId?: string;
    hourlyRate?: number;
}) {
    const supabase = createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) throw new Error("Unauthorized");

    // 1. Create Auth User using Admin Client
    const adminSupabase = createAdminClient();

    // Check if user exists first to avoid error? 
    // createUser logic in Supabase admin handles "already exists" by throwing usually but we can try invite or create.
    // We'll use createUser with a temporary password or auto-confirm.
    // Since we don't have a password input, we'll Generate a random one and maybe email it?
    // OR we use inviteUserByEmail which sends an invite link.
    // The user asked to "Create users... not let them register first".
    // Usually that means "I set the password" or "I send them an invite".
    // Let's use inviteUserByEmail as it's cleaner for "onboarding".

    // But wait, if we use inviteUserByEmail, they DO register (set their own password).
    // If the requirement is "not let them register first", maybe they mean "I want to Provision the account".
    // Let's generate a temporary password.
    const tempPassword = "TempPassword123!" + Math.random().toString(36).slice(-4);

    const { data: authUser, error: createError } = await adminSupabase.auth.admin.createUser({
        email: data.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
            full_name: `${data.firstName} ${data.lastName}`,
            first_name: data.firstName,
            last_name: data.lastName,
            mobile: data.mobile,
            avatar_url: ""
        }
    });

    if (createError) {
        throw new Error(createError.message);
    }

    if (!authUser.user) throw new Error("Failed to create user");

    // Send Welcome Email
    try {
        await sendWelcomeEmail(data.email, `${data.firstName} ${data.lastName}`, tempPassword);
    } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);
    }

    // 2. Profile Creation is handled by Trigger usually?
    // Our schema has a trigger `on_auth_user_created`.
    // So profile should exist. We might want to ensure it's updated or wait for propagation?
    // Triggers are synchronous in Postgres usually.

    // We can update the profile just in case extra fields were missed or trigger didn't fire with metadata right.
    // Actually our trigger uses metadata, so we might be good. 
    // Let's fetch the profile to be sure we have the right ID (it matches auth ID).

    const profileId = authUser.user.id;

    // 2.5 Update extended profile fields
    await adminSupabase.from("profiles").update({
        hourly_rate: data.hourlyRate || 0,
        mobile: data.mobile
    }).eq("id", profileId);

    // 3. Add to Organization
    const { error: orgError } = await supabase.from("organization_members").insert({
        organization_id: orgId,
        user_id: profileId,
        role: data.role
    });

    if (orgError && !orgError.message.includes("duplicate")) {
        // If org add fails, maybe we should cleanup the user? 
        // For MVP, we'll explicitly throw.
        throw orgError;
    }

    // 4. Add to Team (if selected)
    if (data.teamId) {
        await supabase.from("team_members").insert({
            team_id: data.teamId,
            user_id: profileId
        });
    }

    revalidatePath(`/dashboard/${orgId}/users`);
    return { success: true, tempPassword };
}

export async function updateUser(orgId: string, userId: string, data: {
    firstName: string;
    lastName: string;
    mobile: string;
    role: "admin" | "editor" | "viewer";
    teamId?: string | null;
    hourlyRate?: number;
}) {
    const supabase = createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) throw new Error("Unauthorized");

    // Check permissions (Only admins/owners can edit users)
    const { data: membership } = await supabase
        .from("organization_members")
        .select("role")
        .eq("organization_id", orgId)
        .eq("user_id", currentUser.id)
        .single();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
        throw new Error("Insufficient permissions to update users");
    }

    // 1. Update Profile (Mobile, Name)
    // Note: updating full_name in metadata is harder without admin client, but profile table is accessible via RLS (usually users can edit own, admins can edit all? Check policies).
    // Policy "Users can update their own profile" exists.
    // We need "Admins can update any profile" or at least "Admins can update organization members profiles"?
    // Let's check RLS. If RLS blocks, we need admin client.
    // Admin client is safer for "Admin editing another user".
    const adminSupabase = createAdminClient();

    const { error: profileError } = await adminSupabase
        .from("profiles")
        .update({
            full_name: `${data.firstName} ${data.lastName}`,
            mobile: data.mobile,
            hourly_rate: data.hourlyRate
        })
        .eq("id", userId);

    if (profileError) throw new Error("Failed to update profile: " + profileError.message);

    // 2. Update Org Role
    const { error: roleError } = await supabase
        .from("organization_members")
        .update({ role: data.role })
        .eq("organization_id", orgId)
        .eq("user_id", userId);

    if (roleError) throw new Error("Failed to update role: " + roleError.message);

    // 3. Update Team
    // Remove from existing team(s) - assuming single team for now
    await supabase.from("team_members").delete().eq("user_id", userId);

    if (data.teamId && data.teamId !== "none") {
        await supabase.from("team_members").insert({
            team_id: data.teamId,
            user_id: userId
        });
    }

    revalidatePath(`/dashboard/${orgId}/users`);
    return { success: true };
}

export async function bulkCreateUsers(orgId: string, users: any[]) {
    // Validate permission once
    const supabase = createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) throw new Error("Unauthorized");

    // Check permissions
    const { data: membership } = await supabase
        .from("organization_members")
        .select("role")
        .eq("organization_id", orgId)
        .eq("user_id", currentUser.id)
        .single();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
        throw new Error("Insufficient permissions to import users");
    }

    const results = {
        success: 0,
        failed: 0,
        errors: [] as string[]
    };

    // Process sequentially to avoid rate limits
    for (const u of users) {
        try {
            await createUser(orgId, {
                firstName: u.firstName,
                lastName: u.lastName,
                email: u.email,
                mobile: u.mobile || "",
                role: u.role || "viewer",
                teamId: u.teamId // Optional
            });
            results.success++;
        } catch (e: any) {
            console.error(`Failed to import ${u.email}:`, e);
            results.failed++;
            results.errors.push(`${u.email}: ${e.message}`);
        }
    }

    revalidatePath(`/dashboard/${orgId}/users`);
    return results;
}

export async function removeUser(orgId: string, userId: string) {
    const supabase = createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) throw new Error("Unauthorized");

    // Check permissions (Only admins/owners/editors?) - Usually admins/owners
    const { data: membership } = await supabase
        .from("organization_members")
        .select("role")
        .eq("organization_id", orgId)
        .eq("user_id", currentUser.id)
        .single();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
        throw new Error("Insufficient permissions to remove users");
    }

    // Prevent removing self?
    if (currentUser.id === userId) {
        // Check if they are the only owner?
        // For now, allow leaving, but UI might warn.
        // Actually, if I remove myself, I lose access. Safe enough.
    }

    // Delete from organziation_members
    const { error } = await supabase
        .from("organization_members")
        .delete()
        .eq("organization_id", orgId)
        .eq("user_id", userId);

    if (error) {
        throw new Error("Failed to remove user: " + error.message);
    }

    revalidatePath(`/dashboard/${orgId}/users`);
}
