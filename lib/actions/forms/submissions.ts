"use server";

import { createClient } from "@/lib/supabase/server";

export async function getFormSubmissions(formId: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    console.log("Fetching submissions for form:", formId);
    console.log("User:", user.id);

    const { data: submissions, error } = await supabase
        .from("submissions")
        .select(`
            *,
            profiles (full_name),
            clients (name),
            visits (title)
        `)
        .eq("form_id", formId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching submissions:", error);
    }
    console.log("Submissions found:", submissions?.length);


    return submissions || [];
}

export async function getSubmission(submissionId: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: submission, error } = await supabase
        .from("submissions")
        .select(`
            *,
            profiles (full_name),
            clients (name),
            visits (title),
            forms (content, title)
        `)
        .eq("id", submissionId)
        .single();

    if (error) {
        console.error("Error fetching submission:", error);
        return null;
    }

    if (submission) {
        console.log(`[getSubmission] Found ${submission.id}. UserID: ${submission.user_id}, FormID: ${submission.form_id}`);
    }

    return submission;
}

export async function updateSubmission(submissionId: string, data: any) {
    console.log("updateSubmission started for:", submissionId);

    // Parse data if it's a string (which it likely is from useFormSubmission)
    let parsedData = data;
    if (typeof data === 'string') {
        try {
            parsedData = JSON.parse(data);
        } catch (e) {
            console.warn("Failed to parse submission data JSON", e);
        }
    }

    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (!user || authError) {
        console.error("updateSubmission: Auth error", authError);
        throw new Error("Unauthorized: " + (authError?.message || "No user found"));
    }

    console.log(`[updateSubmission] User ${user.id} update payload parsed:`, JSON.stringify(parsedData, null, 2).substring(0, 200) + "...");

    const { data: updated, error } = await supabase
        .from("submissions")
        .update({ data: parsedData })
        .eq("id", submissionId)
        .select();

    if (error) {
        console.error("Error updating submission:", error);
        throw error;
    }

    if (!updated || updated.length === 0) {
        console.error("Update failed: No rows updated. Possibly RLS restriction or ID mismatch.");
        throw new Error("Update failed: Permission denied or submission not found.");
    }

    console.log(`[updateSubmission] Successfully updated ${updated.length} row(s).`);

    return { success: true };
}
