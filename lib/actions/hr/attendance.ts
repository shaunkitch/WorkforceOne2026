"use server";

import { createClient } from "@/lib/supabase/server";
import { startOfDay, endOfDay, subDays, format, differenceInMinutes, parseISO } from "date-fns";

export type AttendanceEntry = {
    id: string;
    user_id: string;
    clock_in: string;
    clock_out: string | null;
    duration_minutes: number | null;
    notes: string | null;
    profile: { full_name: string | null; email: string | null } | null;
};

export type AttendanceStats = {
    totalEntries: number;
    avgHoursPerDay: number;
    lateArrivals: number; // arrived after 09:00
    earlyDepartures: number; // left before 17:00
    missingClockOut: number;
    dailyHours: { date: string; hours: number; count: number }[];
    topWorkers: { name: string; hours: number }[];
    lateArrivals30Days: { date: string; userId: string; name: string; minutesLate: number }[];
};

const WORK_START_HOUR = 9;  // 09:00
const WORK_END_HOUR = 17;   // 17:00
const DAYS_BACK = 30;

export async function getOrgAttendanceAnalytics(
    orgId: string,
    daysBack = DAYS_BACK
): Promise<{ entries: AttendanceEntry[]; stats: AttendanceStats }> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const since = subDays(new Date(), daysBack).toISOString();

    const { data, error } = await supabase
        .from("time_entries")
        .select(`
            id, user_id, clock_in, clock_out, duration_minutes, notes,
            profile:profiles(full_name, email)
        `)
        .eq("organization_id", orgId)
        .gte("clock_in", since)
        .order("clock_in", { ascending: false });

    if (error) throw new Error(error.message);
    const entries = (data || []) as unknown as AttendanceEntry[];

    // ── Stats ──────────────────────────────────────────────
    const totalEntries = entries.length;
    const missingClockOut = entries.filter(e => !e.clock_out).length;
    const earlyDepartures = entries.filter(e => {
        if (!e.clock_out) return false;
        const out = parseISO(e.clock_out);
        return out.getHours() < WORK_END_HOUR;
    }).length;

    // Late arrivals — after work start hour
    const lateArrivalsList = entries
        .filter(e => {
            const inTime = parseISO(e.clock_in);
            return inTime.getHours() >= WORK_START_HOUR + 0 &&
                (inTime.getHours() > WORK_START_HOUR ||
                    (inTime.getHours() === WORK_START_HOUR && inTime.getMinutes() > 0));
        })
        .map(e => {
            const inTime = parseISO(e.clock_in);
            const minutesLate = (inTime.getHours() - WORK_START_HOUR) * 60 + inTime.getMinutes();
            const name = (e.profile as any)?.full_name || (e.profile as any)?.email || "Unknown";
            return {
                date: format(inTime, "yyyy-MM-dd"),
                userId: e.user_id,
                name,
                minutesLate,
            };
        })
        .filter(l => l.minutesLate > 5) // tolerance: 5 minutes
        .sort((a, b) => b.minutesLate - a.minutesLate)
        .slice(0, 20);

    // Daily aggregation
    const dailyMap = new Map<string, { hours: number; count: number }>();
    entries.forEach(e => {
        const day = format(parseISO(e.clock_in), "yyyy-MM-dd");
        const hours = e.duration_minutes ? e.duration_minutes / 60 : 0;
        const existing = dailyMap.get(day) || { hours: 0, count: 0 };
        dailyMap.set(day, { hours: existing.hours + hours, count: existing.count + 1 });
    });
    const dailyHours = Array.from(dailyMap.entries())
        .map(([date, v]) => ({ date, hours: v.hours, count: v.count }))
        .sort((a, b) => a.date.localeCompare(b.date));

    // Top workers by total hours
    const workerMap = new Map<string, { name: string; hours: number }>();
    entries.forEach(e => {
        const name = (e.profile as any)?.full_name || (e.profile as any)?.email || "Unknown";
        const hours = e.duration_minutes ? e.duration_minutes / 60 : 0;
        const ex = workerMap.get(e.user_id) || { name, hours: 0 };
        workerMap.set(e.user_id, { name, hours: ex.hours + hours });
    });
    const topWorkers = Array.from(workerMap.values())
        .sort((a, b) => b.hours - a.hours)
        .slice(0, 5);

    const totalHoursAll = entries.reduce((a, e) => a + (e.duration_minutes || 0), 0) / 60;
    const uniqueDays = dailyMap.size || 1;
    const avgHoursPerDay = totalHoursAll / uniqueDays;

    return {
        entries,
        stats: {
            totalEntries,
            avgHoursPerDay,
            lateArrivals: lateArrivalsList.length,
            earlyDepartures,
            missingClockOut,
            dailyHours,
            topWorkers,
            lateArrivals30Days: lateArrivalsList,
        },
    };
}
