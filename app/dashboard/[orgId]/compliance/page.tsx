import { createClient } from "@/lib/supabase/server";
import { subDays, format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Table, TableBody, TableCell, TableHead,
    TableHeader, TableRow,
} from "@/components/ui/table";
import { CheckCircle2, AlertTriangle, XCircle, Shield, Clock, FileText } from "lucide-react";

interface PageProps {
    params: { orgId: string };
}

export const metadata = {
    title: "Compliance Report | WorkforceOne",
};

type ComplianceItem = {
    category: string;
    check: string;
    status: "pass" | "warning" | "fail";
    detail: string;
    count?: number;
};

async function getComplianceData(orgId: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const since = subDays(new Date(), 30).toISOString();
    const now = new Date().toISOString();

    // 1. Attendance: missing clock-outs
    const { count: missingClockOuts } = await supabase
        .from("time_entries")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .is("clock_out", null)
        .lt("clock_in", subDays(new Date(), 1).toISOString()); // > 24h old

    // 2. Attendance: late arrivals (clock_in hour >= 10:00)
    const { data: lateEntries } = await supabase
        .from("time_entries")
        .select("id, clock_in, user_id, profiles(full_name, email)")
        .eq("organization_id", orgId)
        .gte("clock_in", since);

    const lateArrivals = (lateEntries || []).filter(e => {
        const h = new Date(e.clock_in).getHours();
        const m = new Date(e.clock_in).getMinutes();
        return h > 9 || (h === 9 && m > 5);
    });

    // 3. Security: unresolved SOS alerts
    let unresolvedSOS = 0;
    try {
        const { count } = await (supabase as any)
            .from("sos_alerts")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", orgId)
            .eq("status", "active");
        unresolvedSOS = count || 0;
    } catch { /* table may not exist yet */ }

    // 4. Security: patrols without completion
    const { count: incompletePatrols } = await supabase
        .from("patrols")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .eq("status", "in_progress")
        .lt("started_at", subDays(new Date(), 1).toISOString());

    // 5. Forms: total submissions last 30 days
    const { count: formSubmissions } = await supabase
        .from("submissions")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .gte("submitted_at", since);

    // 6. Incidents
    const { count: openIncidents } = await (supabase as any)
        .from("incidents")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .neq("status", "closed")
        .gte("created_at", since);

    const checks: ComplianceItem[] = [
        // Attendance
        {
            category: "Attendance",
            check: "Missing Clock-Outs",
            status: (missingClockOuts || 0) === 0 ? "pass" : (missingClockOuts || 0) > 5 ? "fail" : "warning",
            detail: (missingClockOuts || 0) === 0 ? "All shifts closed correctly" : `${missingClockOuts} shift(s) older than 24h have no clock-out`,
            count: missingClockOuts || 0,
        },
        {
            category: "Attendance",
            check: "Late Arrivals (30 days)",
            status: lateArrivals.length === 0 ? "pass" : lateArrivals.length > 10 ? "fail" : "warning",
            detail: lateArrivals.length === 0 ? "No late arrivals" : `${lateArrivals.length} late arrival(s) recorded`,
            count: lateArrivals.length,
        },
        // Security
        {
            category: "Security",
            check: "Unresolved SOS Alerts",
            status: unresolvedSOS === 0 ? "pass" : "fail",
            detail: unresolvedSOS === 0 ? "No active SOS alerts" : `${unresolvedSOS} SOS alert(s) require immediate attention`,
            count: unresolvedSOS,
        },
        {
            category: "Security",
            check: "Incomplete Patrols (>24h)",
            status: (incompletePatrols || 0) === 0 ? "pass" : "warning",
            detail: (incompletePatrols || 0) === 0 ? "All patrols completed" : `${incompletePatrols} patrol(s) in-progress for over 24 hours`,
            count: incompletePatrols || 0,
        },
        {
            category: "Security",
            check: "Open Incidents (30 days)",
            status: (openIncidents || 0) === 0 ? "pass" : (openIncidents || 0) > 3 ? "fail" : "warning",
            detail: (openIncidents || 0) === 0 ? "No open incidents" : `${openIncidents} incident(s) unresolved in last 30 days`,
            count: openIncidents || 0,
        },
        // Data
        {
            category: "Data & Forms",
            check: "Form Submissions (30 days)",
            status: (formSubmissions || 0) > 0 ? "pass" : "warning",
            detail: (formSubmissions || 0) > 0 ? `${formSubmissions} form submission(s) recorded` : "No form submissions in last 30 days — check if forms are being used",
            count: formSubmissions || 0,
        },
    ];

    const passing = checks.filter(c => c.status === "pass").length;
    const warnings = checks.filter(c => c.status === "warning").length;
    const failures = checks.filter(c => c.status === "fail").length;
    const score = Math.round((passing / checks.length) * 100);

    return { checks, passing, warnings, failures, score, generatedAt: new Date().toISOString() };
}

const StatusIcon = ({ status }: { status: "pass" | "warning" | "fail" }) => {
    if (status === "pass") return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    if (status === "warning") return <AlertTriangle className="h-5 w-5 text-amber-500" />;
    return <XCircle className="h-5 w-5 text-red-500" />;
};

export default async function CompliancePage({ params }: PageProps) {
    const { checks, passing, warnings, failures, score, generatedAt } = await getComplianceData(params.orgId);

    const overallStatus = failures > 0 ? "fail" : warnings > 0 ? "warning" : "pass";

    const categoryIcon: Record<string, any> = {
        "Attendance": <Clock className="h-4 w-4" />,
        "Security": <Shield className="h-4 w-4" />,
        "Data & Forms": <FileText className="h-4 w-4" />,
    };

    const categories = Array.from(new Set(checks.map(c => c.category)));

    return (
        <div className="flex-1 space-y-6 p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Compliance Report</h2>
                    <p className="text-muted-foreground">
                        Auto-generated &mdash; {format(new Date(generatedAt), "PPP 'at' p")}
                    </p>
                </div>
                <div className="text-right">
                    <div className={`text-5xl font-black ${score >= 80 ? "text-green-600" : score >= 60 ? "text-amber-600" : "text-red-600"}`}>
                        {score}%
                    </div>
                    <p className="text-sm text-muted-foreground">Compliance Score</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-green-200 bg-green-50">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-green-700 font-medium">Passing</p>
                                <p className="text-3xl font-bold text-green-700">{passing}</p>
                            </div>
                            <CheckCircle2 className="h-10 w-10 text-green-400" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-amber-200 bg-amber-50">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-amber-700 font-medium">Warnings</p>
                                <p className="text-3xl font-bold text-amber-700">{warnings}</p>
                            </div>
                            <AlertTriangle className="h-10 w-10 text-amber-400" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-red-200 bg-red-50">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-red-700 font-medium">Failures</p>
                                <p className="text-3xl font-bold text-red-700">{failures}</p>
                            </div>
                            <XCircle className="h-10 w-10 text-red-400" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Checks by Category */}
            {categories.map(category => (
                <Card key={category}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            {categoryIcon[category] || <Shield className="h-4 w-4" />}
                            {category}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-8">Status</TableHead>
                                    <TableHead>Check</TableHead>
                                    <TableHead>Detail</TableHead>
                                    <TableHead className="text-right">Count</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {checks.filter(c => c.category === category).map((check, i) => (
                                    <TableRow key={i}>
                                        <TableCell><StatusIcon status={check.status} /></TableCell>
                                        <TableCell className="font-medium">{check.check}</TableCell>
                                        <TableCell className="text-muted-foreground text-sm">{check.detail}</TableCell>
                                        <TableCell className="text-right">
                                            {check.count !== undefined && (
                                                <Badge variant={
                                                    check.status === "pass" ? "secondary" :
                                                        check.status === "warning" ? "outline" : "destructive"
                                                }>
                                                    {check.count}
                                                </Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
