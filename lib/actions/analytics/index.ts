"use server";

import { createClient } from "@/lib/supabase/server";
import { startOfMonth, subMonths, format } from "date-fns";

export async function getOrgStats(orgId: string) {
    const supabase = createClient();

    // 1. Total Submissions Count
    // Join forms to ensure they belong to org
    const { count: totalSubmissions } = await supabase
        .from("submissions")
        .select("id, forms!inner(organization_id)", { count: "exact", head: true })
        .eq("forms.organization_id", orgId);

    // 2. Active Forms Count (Forms with at least one submission?)
    // Or just Total Forms
    const { count: totalForms } = await supabase
        .from("forms")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId);

    // 3. Recent Activity (Last 30 days) for Chart
    // This is heavier, we might need to limit or use a different strategy for big data.
    // For MVP, fetch recent submissions and aggregate in JS.
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentSubmissions } = await supabase
        .from("submissions")
        .select("created_at, forms!inner(organization_id)")
        .eq("forms.organization_id", orgId)
        .gte("created_at", thirtyDaysAgo.toISOString());

    // Aggregate by date
    const dailySubmissions: Record<string, number> = {};
    recentSubmissions?.forEach(sub => {
        const date = format(new Date(sub.created_at), "yyyy-MM-dd");
        dailySubmissions[date] = (dailySubmissions[date] || 0) + 1;
    });

    const chartData = Object.entries(dailySubmissions).map(([date, count]) => ({
        date,
        submissions: count
    })).sort((a, b) => a.date.localeCompare(b.date));

    // Fill in gaps? Optional.

    return {
        totalSubmissions: totalSubmissions || 0,
        totalForms: totalForms || 0,
        chartData
    };
}

export async function getFormAnalyticsStats(formId: string) {
    const supabase = createClient();

    // 1. Total Submissions
    const { count } = await supabase
        .from("submissions")
        .select("*", { count: "exact", head: true })
        .eq("form_id", formId);

    // 2. Chart Data (Last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: submissions } = await supabase
        .from("submissions")
        .select("created_at")
        .eq("form_id", formId)
        .gte("created_at", thirtyDaysAgo.toISOString());

    const dailySubmissions: Record<string, number> = {};
    submissions?.forEach(sub => {
        const date = format(new Date(sub.created_at), "yyyy-MM-dd");
        dailySubmissions[date] = (dailySubmissions[date] || 0) + 1;
    });

    const chartData = Object.entries(dailySubmissions).map(([date, count]) => ({
        date,
        submissions: count
    })).sort((a, b) => a.date.localeCompare(b.date));

    // 3. Assignment Stats
    const { data: assignments } = await supabase
        .from("form_assignments")
        .select("status")
        .eq("form_id", formId);

    const totalAssignments = assignments?.length || 0;
    const completedAssignments = assignments?.filter(a => a.status === 'completed').length || 0;
    const pendingAssignments = totalAssignments - completedAssignments;
    const completionRate = totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0;

    // 4. Recent Submissions
    // Try to join with profiles via user_id
    const { data: recent } = await supabase
        .from("submissions")
        .select("id, created_at, user_id, profiles(full_name)")
        .eq("form_id", formId)
        .order("created_at", { ascending: false })
        .limit(5);

    return {
        totalSubmissions: count || 0,
        chartData,
        assignments: {
            total: totalAssignments,
            completed: completedAssignments,
            pending: pendingAssignments,
            completionRate
        },
        recentSubmissions: recent || []
    };
}
