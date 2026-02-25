import { getOrgAttendanceAnalytics } from "@/lib/actions/hr/attendance";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Clock, UserX, AlertTriangle, TrendingUp } from "lucide-react";

interface PageProps {
    params: { orgId: string };
}

export const metadata = {
    title: "Attendance Analytics | WorkforceOne",
    description: "View attendance patterns, late arrivals, and absenteeism data for your organisation.",
};

export default async function AttendanceAnalyticsPage({ params }: PageProps) {
    const { entries, stats } = await getOrgAttendanceAnalytics(params.orgId, 30);

    const formatHours = (h: number) => {
        const hrs = Math.floor(h);
        const mins = Math.round((h - hrs) * 60);
        return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
    };

    return (
        <div className="flex-1 space-y-6 p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Attendance Analytics</h2>
                    <p className="text-muted-foreground">
                        Last 30 days &mdash; {stats.totalEntries} clock-in records across {entries.length > 0 ? new Set(entries.map(e => e.user_id)).size : 0} employees
                    </p>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg. Hours / Day</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatHours(stats.avgHoursPerDay)}</div>
                        <p className="text-xs text-muted-foreground">Across all employees</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Late Arrivals</CardTitle>
                        <Clock className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">{stats.lateArrivals}</div>
                        <p className="text-xs text-muted-foreground">&gt;5 min after 09:00</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Early Departures</CardTitle>
                        <UserX className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{stats.earlyDepartures}</div>
                        <p className="text-xs text-muted-foreground">Left before 17:00</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Missing Clock-Out</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{stats.missingClockOut}</div>
                        <p className="text-xs text-muted-foreground">Still active / not closed</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Daily Hours Bar Chart (CSS-only) */}
                <Card>
                    <CardHeader>
                        <CardTitle>Daily Team Hours</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {stats.dailyHours.length === 0 ? (
                            <p className="text-muted-foreground text-sm">No data for this period.</p>
                        ) : (
                            <div className="space-y-2">
                                {stats.dailyHours.slice(-14).map(day => {
                                    const maxH = Math.max(...stats.dailyHours.map(d => d.hours), 1);
                                    const pct = Math.round((day.hours / maxH) * 100);
                                    return (
                                        <div key={day.date} className="flex items-center gap-3">
                                            <span className="w-20 text-xs text-muted-foreground shrink-0">
                                                {format(parseISO(day.date), "MMM d")}
                                            </span>
                                            <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                                                <div
                                                    className="h-full bg-blue-500 rounded-full transition-all"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                            <span className="w-16 text-xs text-right text-slate-600 shrink-0">
                                                {formatHours(day.hours)} ({day.count})
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Top Workers */}
                <Card>
                    <CardHeader>
                        <CardTitle>Top Workers by Hours</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {stats.topWorkers.length === 0 ? (
                            <p className="text-muted-foreground text-sm">No data for this period.</p>
                        ) : (
                            <div className="space-y-3">
                                {stats.topWorkers.map((worker, i) => {
                                    const maxH = stats.topWorkers[0]?.hours || 1;
                                    const pct = Math.round((worker.hours / maxH) * 100);
                                    return (
                                        <div key={i} className="flex items-center gap-3">
                                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">
                                                {i + 1}
                                            </div>
                                            <span className="w-32 text-sm font-medium truncate shrink-0">
                                                {worker.name}
                                            </span>
                                            <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                                                <div
                                                    className="h-full bg-emerald-500 rounded-full"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                            <span className="w-12 text-xs text-right text-slate-600 shrink-0">
                                                {formatHours(worker.hours)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Late Arrivals Detail Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Late Arrivals (Last 30 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Employee</TableHead>
                                <TableHead>Minutes Late</TableHead>
                                <TableHead>Severity</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {stats.lateArrivals30Days.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                                        ✅ No late arrivals in the last 30 days.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                stats.lateArrivals30Days.map((late, i) => (
                                    <TableRow key={i}>
                                        <TableCell>{format(parseISO(late.date), "PPP")}</TableCell>
                                        <TableCell className="font-medium">{late.name}</TableCell>
                                        <TableCell>{late.minutesLate} min</TableCell>
                                        <TableCell>
                                            <Badge variant={
                                                late.minutesLate > 60 ? "destructive" :
                                                    late.minutesLate > 30 ? "default" : "secondary"
                                            }>
                                                {late.minutesLate > 60 ? "Critical" :
                                                    late.minutesLate > 30 ? "High" : "Low"}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* All Entries Table */}
            <Card>
                <CardHeader>
                    <CardTitle>All Time Entries</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Employee</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Clock In</TableHead>
                                <TableHead>Clock Out</TableHead>
                                <TableHead>Duration</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {entries.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        No time entries in the last 30 days.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                entries.map((entry) => {
                                    const isLate = (() => {
                                        const h = parseISO(entry.clock_in).getHours();
                                        const m = parseISO(entry.clock_in).getMinutes();
                                        return h > 9 || (h === 9 && m > 5);
                                    })();
                                    return (
                                        <TableRow key={entry.id}>
                                            <TableCell className="font-medium">
                                                {(entry.profile as any)?.full_name || (entry.profile as any)?.email || "Unknown"}
                                            </TableCell>
                                            <TableCell>{format(parseISO(entry.clock_in), "MMM d, yyyy")}</TableCell>
                                            <TableCell>
                                                <span className={isLate ? "text-amber-600 font-semibold" : ""}>
                                                    {format(parseISO(entry.clock_in), "HH:mm")}
                                                    {isLate && " ⚠️"}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                {entry.clock_out ? format(parseISO(entry.clock_out), "HH:mm") : (
                                                    <span className="text-red-500 text-xs">Missing</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {entry.duration_minutes
                                                    ? `${Math.floor(entry.duration_minutes / 60)}h ${entry.duration_minutes % 60}m`
                                                    : entry.clock_out ? "0m" : (
                                                        <Badge variant="default" className="bg-green-600 text-xs">Active</Badge>
                                                    )}
                                            </TableCell>
                                            <TableCell>
                                                {entry.clock_out ? (
                                                    <Badge variant="secondary">Completed</Badge>
                                                ) : (
                                                    <Badge variant="default" className="bg-green-600">Active</Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
