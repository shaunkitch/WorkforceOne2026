"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sendWelcomeEmail } from "@/lib/mail";
import { revalidatePath } from "next/cache";
import { Team, BankDetails } from "@/types/app";
import { logAction } from "@/lib/actions/audit";

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

export async function getTeams(orgId: string): Promise<Team[]> {
    const supabase = createClient();

    const { data: teams } = await supabase
        .from("teams")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });

    return (teams as Team[]) || [];
}

export async function getTeamMembers(teamId: string) {
    const supabase = createClient();
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
    bankDetails?: BankDetails;
}) {
    const supabase = createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) throw new Error("Unauthorized");

    // Check permissions (Only admins/owners can create users)
    const { data: membership } = await supabase
        .from("organization_members")
        .select("role")
        .eq("organization_id", orgId)
        .eq("user_id", currentUser.id)
        .single();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
        throw new Error("Insufficient permissions to create users");
    }

    const adminSupabase = createAdminClient();
    const tempPassword = Math.random().toString(36).slice(-10);

    try {
        // 1. Create User in Auth (Bypassing Email Confirmation)
        const { data: userData, error: authError } = await adminSupabase.auth.admin.createUser({
            email: data.email,
            password: tempPassword,
            email_confirm: true,
            user_metadata: {
                full_name: `${data.firstName} ${data.lastName}`
            }
        });

        if (authError) throw new Error("Auth Error: " + authError.message);
        const newUser = userData.user;

        // 2. Generate Employee Number
        const { data: countData } = await adminSupabase
            .from("organization_members")
            .select("id")
            .eq("organization_id", orgId);

        const empCount = (countData?.length || 0) + 1;
        const employeeNumber = `EMP-${empCount.toString().padStart(4, '0')}`;

        // 3. Profiles table is handled by trigger handle_new_user()
        // But we need to update mobile, hourly rate, and bank details which are not in the trigger
        const { error: profileError } = await adminSupabase
            .from("profiles")
            .update({
                mobile: data.mobile,
                hourly_rate: data.hourlyRate,
                bank_details: data.bankDetails
            })
            .eq("id", newUser.id);

        if (profileError) throw profileError;

        // 4. Link to Organization
        const { error: memberError } = await adminSupabase
            .from("organization_members")
            .insert({
                organization_id: orgId,
                user_id: newUser.id,
                role: data.role,
                employee_number: employeeNumber
            });

        if (memberError) throw memberError;

        // 5. Add to Team if provided
        if (data.teamId && data.teamId !== "none") {
            await adminSupabase
                .from("team_members")
                .insert({
                    team_id: data.teamId,
                    user_id: newUser.id
                });
        }

        // 6. Send Welcome Email
        await sendWelcomeEmail(data.email, `${data.firstName} ${data.lastName}`, tempPassword);

        // 7. Log Action
        await logAction(
            orgId,
            "Created User",
            `${data.firstName} ${data.lastName}`,
            { email: data.email, role: data.role, empNo: employeeNumber },
            { tableName: 'profiles', recordId: newUser.id }
        );

        revalidatePath(`/dashboard/${orgId}/users`);
        return { success: true, tempPassword, employeeNumber };

    } catch (error: any) {
        console.error("Cleanup: failed user creation partially", error);
        // We might want to delete the auth user if the link failed
        throw error;
    }
}

export async function updateUser(orgId: string, userId: string, data: {
    firstName: string;
    lastName: string;
    mobile: string;
    email?: string;
    password?: string;
    role: "admin" | "editor" | "viewer";
    teamId?: string | null;
    hourlyRate?: number;
    bankDetails?: BankDetails;
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

    // Fetch previous state for Audit Log
    const { data: previousProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

    const adminSupabase = createAdminClient();

    // 1. Update Auth (Email/Password)
    const authUpdates: any = { email_confirm: true };
    if (data.email) authUpdates.email = data.email;
    if (data.password) authUpdates.password = data.password;

    if (data.email || data.password) {
        const { error: authError } = await adminSupabase.auth.admin.updateUserById(userId, authUpdates);
        if (authError) throw new Error("Failed to update auth: " + authError.message);
    }

    const { error: profileError } = await adminSupabase
        .from("profiles")
        .update({
            full_name: `${data.firstName} ${data.lastName}`,
            mobile: data.mobile,
            email: data.email,
            hourly_rate: data.hourlyRate,
            bank_details: data.bankDetails
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
    await supabase.from("team_members").delete().eq("user_id", userId);

    if (data.teamId && data.teamId !== "none") {
        await supabase.from("team_members").insert({
            team_id: data.teamId,
            user_id: userId
        });
    }

    // Log the change
    await logAction(
        orgId,
        "Updated User Profile",
        `${data.firstName} ${data.lastName}`,
        { email: data.email, role: data.role, passwordChanged: !!data.password },
        {
            tableName: 'profiles',
            recordId: userId,
            previousData: previousProfile,
            newData: {
                full_name: `${data.firstName} ${data.lastName}`,
                mobile: data.mobile,
                email: data.email,
                hourly_rate: data.hourlyRate,
                bank_details: data.bankDetails
            }
        }
    );

    revalidatePath(`/dashboard/${orgId}/users`);
    return { success: true };
}

export async function bulkCreateUsers(orgId: string, users: any[]) {
    const supabase = createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) throw new Error("Unauthorized");

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

    for (const u of users) {
        try {
            await createUser(orgId, {
                firstName: u.firstName,
                lastName: u.lastName,
                email: u.email,
                mobile: u.mobile || "",
                role: u.role || "viewer",
                teamId: u.teamId
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

    const { data: membership } = await supabase
        .from("organization_members")
        .select("role")
        .eq("organization_id", orgId)
        .eq("user_id", currentUser.id)
        .single();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
        throw new Error("Insufficient permissions to remove users");
    }

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
