"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { FORM_TEMPLATES } from "@/lib/constants/templates";

const createFormSchema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    template: z.string().optional(),
});

export async function createForm(prevState: any, formData: FormData) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Unauthorized" };
    }

    const rawData = {
        title: formData.get("title"),
        description: formData.get("description"),
        template: formData.get("template"),
    };

    const validatedFields = createFormSchema.safeParse(rawData);

    if (!validatedFields.success) {
        return { errors: validatedFields.error.flatten().fieldErrors };
    }

    const { title, description, template } = validatedFields.data;
    const orgId = formData.get("orgId") as string;

    if (!orgId) {
        return { error: "Organization ID is missing" };
    }

    let formContent: any = [];

    // If a template is selected, generate its content
    if (template && FORM_TEMPLATES[template as keyof typeof FORM_TEMPLATES]) {
        formContent = FORM_TEMPLATES[template as keyof typeof FORM_TEMPLATES].content();
    } else {
        // Default blank
        // If description was provided, we could store it, but for now let's stick to array
        formContent = [];
    }

    const { data: form, error } = await supabase
        .from("forms")
        .insert({
            organization_id: orgId,
            title,
            content: formContent,
            is_published: false,
        })
        .select()
        .single();

    if (error) {
        console.error("Error creating form:", error);
        return { error: "Failed to create form" };
    }

    revalidatePath(`/dashboard/${orgId}/forms`);
    // Redirect to builder instead of 'edit' (assuming builder path is canonical)
    redirect(`/dashboard/${orgId}/forms/${form.id}`);
}
