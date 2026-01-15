'use server'

import { createClient } from "@/lib/supabase/server";
import { Database, Json } from "@/types/database";
import { revalidatePath } from "next/cache";

export async function createForm(orgId: string, title: string, content?: Json) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Verify permissions (assuming owner/admin/editor can create)
    const { data: membership } = await supabase
        .from("organization_members")
        .select("role")
        .eq("organization_id", orgId)
        .eq("user_id", user.id)
        .single();

    if (!membership || !["owner", "admin", "editor"].includes(membership.role)) {
        throw new Error("Insufficient permissions to create forms");
    }

    const { data, error } = await supabase
        .from("forms")
        .insert({
            organization_id: orgId,
            title: title,
            content: content || [], // Use template content if provided
            is_published: false
        })
        .select()
        .single();

    if (error) throw new Error(error.message);

    revalidatePath(`/dashboard/${orgId}/forms`);
    return data;
}

export async function getForms(orgId: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // RLS will handle filtering, but we pass orgId for index usage usually, 
    // though here we just query by orgId.
    // We should ideally verify membership first to avoid unnecessary queries if not member,
    // but RLS is the safety net.

    const { data, error } = await supabase
        .from("forms")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return data;
}

export async function getForm(formId: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data, error } = await supabase
        .from("forms")
        .select("*")
        .eq("id", formId)
        .single();

    if (error) throw new Error(error.message);

    return data;
}

export async function updateForm(formId: string, updates: { title?: string; content?: Json; is_published?: boolean }) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Fetch form to get orgId (to check permissions)
    const { data: form } = await supabase
        .from("forms")
        .select("organization_id")
        .eq("id", formId)
        .single();

    if (!form) throw new Error("Form not found");

    const { data: membership } = await supabase
        .from("organization_members")
        .select("role")
        .eq("organization_id", form.organization_id)
        .eq("user_id", user.id)
        .single();

    if (!membership || !["owner", "admin", "editor"].includes(membership.role)) {
        throw new Error("Insufficient permissions to update form");
    }

    const { data, error } = await supabase
        .from("forms")
        .update(updates)
        .eq("id", formId)
        .select()
        .single();

    if (error) throw new Error(error.message);

    revalidatePath(`/dashboard/${form.organization_id}/builder/${formId}`);
    revalidatePath(`/dashboard/${form.organization_id}/forms`);

    return data;
}

export async function publishForm(formId: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: form } = await supabase
        .from("forms")
        .select("organization_id")
        .eq("id", formId)
        .single();

    if (!form) throw new Error("Form not found");

    const { data: membership } = await supabase
        .from("organization_members")
        .select("role")
        .eq("organization_id", form.organization_id)
        .eq("user_id", user.id)
        .single();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
        throw new Error("Insufficient permissions to publish form");
    }

    const { data, error } = await supabase
        .from("forms")
        .update({ is_published: true })
        .eq("id", formId)
        .select()
        .single();

    if (error) throw new Error(error.message);

    revalidatePath(`/dashboard/${form.organization_id}/builder/${formId}`);

    return data;
}

export async function submitForm(formUrl: string, content: string) {
    const supabase = createClient();
    const { data: form } = await supabase.from("forms").select("id, is_published").eq("id", formUrl).single();

    if (!form || !form.is_published) {
        throw new Error("Form not found or not published");
    }

    const parsedContent = JSON.parse(content);

    // Attempt to extract metadata if fields exist. 
    // We don't know the exact keys for signature/location here without the form definition, 
    // but usually we store them by element ID.
    // For now, valid JSON data is the priority.

    const { data: submission } = await supabase.from("submissions").insert({
        form_id: form.id,
        data: parsedContent,
    }).select().single();

    // Trigger Automations (Fire and Forget)
    // We don't await this to keep submission fast, or we do await if critical.
    // For Server Actions, awaiting is safer to ensure it runs before lambda freezes?
    // Actually next.js server actions: better to await or use `waitUntil` (if available on vercel edge, but here standard node).
    // Let's await to be safe.
    try {
        const { getAutomations, executeAutomations } = await import("@/lib/actions/automations");
        const autos = await getAutomations(form.id);
        if (autos.length > 0) {
            await executeAutomations(autos, submission);
        }
    } catch (error) {
        console.error("Automation Trigger Failed:", error);
    }

    return { success: true };
}

export async function deleteForm(formId: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: form } = await supabase
        .from("forms")
        .select("organization_id")
        .eq("id", formId)
        .single();

    if (!form) throw new Error("Form not found");

    const { data: membership } = await supabase
        .from("organization_members")
        .select("role")
        .eq("organization_id", form.organization_id)
        .eq("user_id", user.id)
        .single();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
        throw new Error("Insufficient permissions to delete form");
    }

    const { error } = await supabase
        .from("forms")
        .delete()
        .eq("id", formId);

    if (error) throw new Error(error.message);

    revalidatePath(`/dashboard/${form.organization_id}/forms`);
    return { success: true };
}
