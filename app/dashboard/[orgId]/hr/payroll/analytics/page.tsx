import { getPayrollRuns } from "@/lib/actions/hr/payroll";
import { createClient } from "@/lib/supabase/server";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Table, TableBody, TableCell, TableHead,
    TableHeader, TableRow,
} from "@/components/ui/table";
import { TrendingUp, Banknote, Award, Users } from "lucide-react";

interface PageProps {
    params: { orgId: string };
}

export const metadata = {
    title: "Payslip Analytics | WorkforceOne",
};

async function getPayrollAnalytics(orgId: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Fetch all runs with their items + employee names
    const { data: runs } = await supabase
        .from("payroll_runs")
        .select("*")
        .eq("organization_id", orgId)
        .order("period_start", { ascending: true });

    const runIds = (runs || []).map(r => r.id);

    const { data: items } = runIds.length
        ? await supabase
            .from("payroll_items")
            .select("*, profiles(full_name, email)")
            .in("payroll_run_id", runIds)
        : { data: [] };

    return { runs: runs || [], items: items || [] };
}

export default async function PayrollAnalyticsPage({ params }: PageProps) {
    const { runs, items } = await getPayrollAnalytics(params.orgId);

    const totalGross = items.reduce((a: number, i: any) => a + (i.gross_pay || 0), 0);
    const totalBonuses = items.reduce((a: number, i: any) => a + (i.bonuses || 0), 0);
    const totalNet = items.reduce((a: number, i: any) => a + (i.net_pay || 0), 0);
    const totalHours = items.reduce((a: number, i: any) => a + (i.total_hours || 0), 0);

    const fmtCurrency = (n: number) =>
        new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

    // Per-employee totals
    const employeeMap = new Map<string, { name: string; gross: number; bonuses: number; net: number; hours: number }>();
    (items as any[]).forEach(item => {
        const name = item.profiles?.full_name || item.profiles?.email || "Unknown";
        const ex = employeeMap.get(item.user_id) || { name, gross: 0, bonuses: 0, net: 0, hours: 0 };
        employeeMap.set(item.user_id, {
            name,
            gross: ex.gross + (item.gross_pay || 0),
            bonuses: ex.bonuses + (item.bonuses || 0),
            net: ex.net + (item.net_pay || 0),
            hours: ex.hours + (item.total_hours || 0),
        });
    });
    const employees = Array.from(employeeMap.values()).sort((a, b) => b.net - a.net);

    // Run trend data
    const runTrend = runs.map(r => ({
        label: format(parseISO(r.period_start), "MMM yy"),
        amount: r.total_amount || 0,
    }));
    const maxTrend = Math.max(...runTrend.map(r => r.amount), 1);

    return (
        <div className="flex-1 space-y-6 p-8 pt-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Payslip Analytics</h2>
                <p className="text-muted-foreground">
                    {runs.length} payroll run{runs.length !== 1 ? "s" : ""} &mdash; all time
                </p>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Gross Pay</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{fmtCurrency(totalGross)}</div>
                        <p className="text-xs text-muted-foreground">Before bonuses</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Bonuses</CardTitle>
                        <Award className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">{fmtCurrency(totalBonuses)}</div>
                        <p className="text-xs text-muted-foreground">Compliance & performance</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Net Pay</CardTitle>
                        <Banknote className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{fmtCurrency(totalNet)}</div>
                        <p className="text-xs text-muted-foreground">Gross + bonuses</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Hours Paid</CardTitle>
                        <Users className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalHours.toFixed(1)} hrs</div>
                        <p className="text-xs text-muted-foreground">Across {employees.length} employees</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Spend Trend */}
                <Card>
                    <CardHeader>
                        <CardTitle>Payroll Spend by Run</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {runTrend.length === 0 ? (
                            <p className="text-muted-foreground text-sm">No payroll runs yet.</p>
                        ) : (
                            <div className="space-y-2">
                                {runTrend.map((r, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <span className="w-16 text-xs text-muted-foreground shrink-0">{r.label}</span>
                                        <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                                            <div
                                                className="h-full bg-blue-500 rounded-full flex items-center justify-end pr-2"
                                                style={{ width: `${Math.round((r.amount / maxTrend) * 100)}%` }}
                                            >
                                                {r.amount > 0 && (
                                                    <span className="text-[10px] text-white font-bold">
                                                        {fmtCurrency(r.amount)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Pay Breakdown Donut Summary */}
                <Card>
                    <CardHeader>
                        <CardTitle>Pay Composition</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {[
                                { label: "Base Pay (Gross)", amount: totalGross, color: "bg-blue-500", pct: totalNet > 0 ? (totalGross / totalNet) * 100 : 0 },
                                { label: "Bonuses", amount: totalBonuses, color: "bg-amber-500", pct: totalNet > 0 ? (totalBonuses / totalNet) * 100 : 0 },
                            ].map(item => (
                                <div key={item.label}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="font-medium">{item.label}</span>
                                        <span className="text-muted-foreground">
                                            {fmtCurrency(item.amount)} ({item.pct.toFixed(1)}%)
                                        </span>
                                    </div>
                                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${item.color} rounded-full`}
                                            style={{ width: `${item.pct}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                            <div className="pt-2 border-t">
                                <div className="flex justify-between text-sm font-bold">
                                    <span>Total Net Pay</span>
                                    <span>{fmtCurrency(totalNet)}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Employee Earnings Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Employee Earnings Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>#</TableHead>
                                <TableHead>Employee</TableHead>
                                <TableHead>Hours</TableHead>
                                <TableHead>Gross Pay</TableHead>
                                <TableHead>Bonuses</TableHead>
                                <TableHead>Net Pay</TableHead>
                                <TableHead>Share</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {employees.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        No payroll data available yet.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                employees.map((emp, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                                        <TableCell className="font-medium">{emp.name}</TableCell>
                                        <TableCell>{emp.hours.toFixed(1)} hrs</TableCell>
                                        <TableCell>{fmtCurrency(emp.gross)}</TableCell>
                                        <TableCell>
                                            {emp.bonuses > 0 ? (
                                                <span className="text-amber-600 font-semibold">+{fmtCurrency(emp.bonuses)}</span>
                                            ) : "-"}
                                        </TableCell>
                                        <TableCell className="font-bold">{fmtCurrency(emp.net)}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="w-16 bg-slate-100 rounded-full h-2">
                                                    <div
                                                        className="h-full bg-blue-500 rounded-full"
                                                        style={{ width: `${totalNet > 0 ? (emp.net / totalNet) * 100 : 0}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-muted-foreground">
                                                    {totalNet > 0 ? ((emp.net / totalNet) * 100).toFixed(1) : 0}%
                                                </span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Runs History */}
            <Card>
                <CardHeader><CardTitle>All Payroll Runs</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Period</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Total Paid</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {runs.length === 0 ? (
                                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No runs yet.</TableCell></TableRow>
                            ) : runs.map((run: any) => (
                                <TableRow key={run.id}>
                                    <TableCell className="font-medium">{run.title}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {format(parseISO(run.period_start), "MMM d")} – {format(parseISO(run.period_end), "MMM d, yyyy")}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={run.status === "paid" ? "secondary" : "outline"}>{run.status}</Badge>
                                    </TableCell>
                                    <TableCell className="font-bold">{fmtCurrency(run.total_amount || 0)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
