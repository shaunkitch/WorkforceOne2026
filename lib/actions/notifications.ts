"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function sendNotification(
    organizationId: string,
    userId: string,
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info'
) {
    const supabase = createClient();

    try {
        const { error } = await supabase
            .from('notifications')
            .insert({
                organization_id: organizationId,
                user_id: userId,
                title,
                message,
                type,
                is_read: false,
            });

        if (error) throw error;

        // We don't necessarily need to revalidate a specific path since notifications are polled,
        // but if we had a server-rendered list, we would.
        return { success: true };
    } catch (error: any) {
        console.error("Error sending notification:", error);
        return { success: false, error: error.message };
    }
}

export async function sendNotificationToAll(
    organizationId: string,
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info'
) {
    const supabase = createClient();

    try {
        // 1. Get all profiles in the organization
        const { data: members, error: membersError } = await supabase
            .from('organization_members')
            .select('user_id')
            .eq('organization_id', organizationId);

        if (membersError) throw membersError;
        if (!members || members.length === 0) return { success: true, count: 0 };

        // 2. Prepare bulk insert data
        const notifications = members.map(member => ({
            organization_id: organizationId,
            user_id: member.user_id,
            title,
            message,
            type,
            is_read: false,
        }));

        // 3. Bulk insert
        const { error: insertError } = await supabase
            .from('notifications')
            .insert(notifications);

        if (insertError) throw insertError;

        return { success: true, count: members.length };
    } catch (error: any) {
        console.error("Error sending bulk notifications:", error);
        return { success: false, error: error.message };
    }
}
