"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function assignForm(formId: string, userId: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Verify creator permissions
    const { data: form } = await supabase.from("forms").select("organization_id").eq("id", formId).single();
    if (!form) throw new Error("Form not found");

    console.log(`[assignForm] Assigning form ${formId} to user ${userId}`);

    // Check if assignment already exists
    const { data: existing } = await supabase
        .from("form_assignments")
        .select("id")
        .eq("form_id", formId)
        .eq("user_id", userId)
        .single();

    if (existing) {
        console.log("[assignForm] Assignment already exists");
        return; // Already assigned
    }

    const { error } = await supabase.from("form_assignments").insert({
        form_id: formId,
        user_id: userId,
        status: "pending"
    });

    if (error) {
        console.error("[assignForm] Assignment failed:", error);
        throw new Error("Assignment failed: " + error.message);
    }

    console.log("[assignForm] Assignment successful");
    revalidatePath(`/dashboard/${form.organization_id}/forms/${formId}/assignments`);
}

export async function getFormAssignments(formId: string) {
    const supabase = createClient();
    console.log(`[getFormAssignments] Fetching for formId: ${formId}`);

    // Fetch assignments with profile data
    const { data: assignments, error } = await supabase
        .from("form_assignments")
        .select("*, profiles(full_name)")
        .eq("form_id", formId);

    if (error) {
        console.error("[getFormAssignments] Error:", error);
    } else {
        console.log(`[getFormAssignments] Found ${assignments?.length} assignments`);
        if (assignments && assignments.length > 0) {
            console.log(`[getFormAssignments] Sample:`, assignments[0]);
        }
    }

    return assignments || [];
}

import { getTeamMembers } from "@/lib/actions/workforce";

export async function getUserAssignments() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: assignments } = await supabase
        .from("form_assignments")
        .select("*, forms(id, title)") // Join to get form details
        .eq("user_id", user.id)
        .eq("status", "pending"); // Only show pending tasks usually? Or all.

    return assignments || [];
}

export async function assignFormToGroup(formId: string, groupId: string) {
    console.log(`[assignFormToGroup] Assigning form ${formId} to group ${groupId}`);
    const members = await getTeamMembers(groupId);
    console.log(`[assignFormToGroup] Found ${members?.length} members in group`);

    if (!members || members.length === 0) {
        throw new Error("No members in this group. Please ensure you have added users to this Team via the Users page.");
    }

    const supabase = createClient();

    // Get form info for revalidation
    const { data: form } = await supabase.from("forms").select("organization_id").eq("id", formId).single();
    if (!form) throw new Error("Form not found");

    // Prepare batch insert
    // First, get existing assignments for this form to avoid duplicates
    const { data: existing } = await supabase
        .from("form_assignments")
        .select("user_id")
        .eq("form_id", formId);

    const existingUserIds = new Set(existing?.map(e => e.user_id));

    const newAssignments = members
        .filter(m => !existingUserIds.has(m.user_id))
        .map(m => ({
            form_id: formId,
            user_id: m.user_id,
            status: "pending"
        }));

    console.log(`[assignFormToGroup] Creating ${newAssignments.length} new assignments`);

    if (newAssignments.length > 0) {
        const { error } = await supabase.from("form_assignments").insert(newAssignments);
        if (error) {
            console.error("[assignFormToGroup] Batch insert failed:", error);
            throw new Error("Batch assignment failed: " + error.message);
        }
    }

    revalidatePath(`/dashboard/${form.organization_id}/forms/${formId}/assignments`);
    return { assignedCount: newAssignments.length };
}

export async function removeAssignment(assignmentId: string) {
    const supabase = createClient();
    console.log(`[removeAssignment] Removing assignment ${assignmentId}`);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // We need to know the formId/orgId to revalidate path. 
    // Fetch the assignment first to get form linkage
    const { data: assignment } = await supabase
        .from("form_assignments")
        .select("form_id, forms(organization_id)")
        .eq("id", assignmentId)
        .single();

    if (!assignment) {
        console.log("Assignment not found or already deleted");
        return;
    }

    const { error } = await supabase
        .from("form_assignments")
        .delete()
        .eq("id", assignmentId);

    if (error) {
        console.error("Failed to remove assignment:", error);
        throw new Error(error.message);
    }

    // @ts-ignore - Supabase type for joined table might be tricky, usually returns array or object.
    const orgId = assignment.forms?.organization_id;
    if (orgId) {
        revalidatePath(`/dashboard/${orgId}/forms/${assignment.form_id}/assignments`);
    }
}
