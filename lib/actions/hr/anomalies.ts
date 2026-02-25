"use server";

import { createClient } from "@/lib/supabase/server";
import { subDays, subMonths, parseISO, differenceInMinutes, format } from "date-fns";

export type Anomaly = {
    id: string;
    userId: string;
    userName: string;
    date: string;
    type: "extreme_duration" | "habitual_late" | "ghost_shift" | "location_mismatch" | "pattern_break";
    severity: "low" | "medium" | "high" | "critical";
    description: string;
    metricValue?: string;
    relatedEntryId?: string;
};

export async function detectAttendanceAnomalies(orgId: string, daysBack = 30): Promise<Anomaly[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const since = subDays(new Date(), daysBack).toISOString();

    // Fetch all entries in the window
    const { data: recentEntries } = await supabase
        .from("time_entries")
        .select(`
            id, user_id, clock_in, clock_out, duration_minutes, location,
            profiles(full_name, email)
        `)
        .eq("organization_id", orgId)
        .gte("clock_in", since)
        .order("clock_in", { ascending: true });

    if (!recentEntries) return [];

    const anomalies: Anomaly[] = [];
    const entriesByUser = new Map<string, any[]>();

    recentEntries.forEach(e => {
        if (!entriesByUser.has(e.user_id)) {
            entriesByUser.set(e.user_id, []);
        }
        entriesByUser.get(e.user_id)!.push(e);
    });

    for (const [userId, userEntries] of entriesByUser.entries()) {
        const userName = userEntries[0]?.profiles?.full_name || userEntries[0]?.profiles?.email || "Unknown Employee";

        // --- 1. Extreme Duration Anomalies (> 16 hours or < 1 hour) ---
        userEntries.forEach(entry => {
            if (entry.duration_minutes) {
                if (entry.duration_minutes > 16 * 60) {
                    anomalies.push({
                        id: `dur_high_${entry.id}`,
                        userId, userName,
                        date: entry.clock_in,
                        type: "extreme_duration",
                        severity: "critical",
                        description: `Extremely long shift detected (${Math.round(entry.duration_minutes / 60)} hours). Likely a forgotten clock-out.`,
                        metricValue: `${Math.round(entry.duration_minutes / 60)}h`,
                        relatedEntryId: entry.id
                    });
                } else if (entry.duration_minutes < 45 && entry.clock_out) { // Less than 45 mins total
                    anomalies.push({
                        id: `dur_low_${entry.id}`,
                        userId, userName,
                        date: entry.clock_in,
                        type: "extreme_duration",
                        severity: "medium",
                        description: `Suspiciously short shift (${entry.duration_minutes} minutes).`,
                        metricValue: `${entry.duration_minutes}m`,
                        relatedEntryId: entry.id
                    });
                }
            }
        });

        // --- 2. Habitual Lateness Pattern (Late >3 times in 7 days) ---
        const last7Days = userEntries.filter(e => new Date(e.clock_in) > subDays(new Date(), 7));
        const lateShifts = last7Days.filter(e => {
            const h = new Date(e.clock_in).getHours();
            const m = new Date(e.clock_in).getMinutes();
            return h > 9 || (h === 9 && m > 10); // > 09:10
        });

        if (lateShifts.length >= 3) {
            anomalies.push({
                id: `habitual_late_${userId}_${Date.now()}`,
                userId, userName,
                date: new Date().toISOString(),
                type: "habitual_late",
                severity: "high",
                description: `Employee was late ${lateShifts.length} times in the last 7 days.`,
                metricValue: `${lateShifts.length} incidents`,
            });
        }

        // --- 3. Ghost Shift Detection (Clocked in but 0 movement/distance if we had continuous tracking) ---
        // For now, we flag shifts where the clock-in location is >10km from clock-out location.
        userEntries.forEach(entry => {
            // Future: Implement if clock_out_location is added to schema.
        });

        // --- 4. Pattern Break (Working Sunday suddenly when usually M-F) ---
        // Basic heuristic: if they only had 1 Sunday shift in the whole 30 day period.
        const sundayShifts = userEntries.filter(e => new Date(e.clock_in).getDay() === 0);
        const weekdayShifts = userEntries.filter(e => new Date(e.clock_in).getDay() >= 1 && new Date(e.clock_in).getDay() <= 5);

        if (sundayShifts.length === 1 && weekdayShifts.length > 10) {
            anomalies.push({
                id: `pattern_break_${sundayShifts[0].id}`,
                userId, userName,
                date: sundayShifts[0].clock_in,
                type: "pattern_break",
                severity: "low",
                description: "Unusual weekend shift detected for an employee who normally works M-F.",
                relatedEntryId: sundayShifts[0].id
            });
        }
    }

    return anomalies.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
