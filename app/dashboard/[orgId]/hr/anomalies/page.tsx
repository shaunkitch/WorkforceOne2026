import { detectAttendanceAnomalies } from "@/lib/actions/hr/anomalies";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Table, TableBody, TableCell, TableHead,
    TableHeader, TableRow,
} from "@/components/ui/table";
import { AlertCircle, Clock, UserX, AlertTriangle, Activity } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface PageProps {
    params: { orgId: string };
}

export const metadata = {
    title: "Anomaly Detection | WorkforceOne",
};

export default async function AnomaliesPage({ params }: PageProps) {
    const anomalies = await detectAttendanceAnomalies(params.orgId, 30);

    const severityColors = {
        low: "bg-blue-100 text-blue-700 hover:bg-blue-100",
        medium: "bg-amber-100 text-amber-700 hover:bg-amber-100",
        high: "bg-orange-100 text-orange-700 hover:bg-orange-100",
        critical: "bg-red-100 text-red-700 hover:bg-red-100"
    };

    const typeLabels = {
        extreme_duration: "Extreme Shift Duration",
        habitual_late: "Habitual Lateness",
        ghost_shift: "Suspected Ghost Shift",
        location_mismatch: "Location Mismatch",
        pattern_break: "Unusual Schedule"
    };

    const typeIcons = {
        extreme_duration: <Clock className="h-4 w-4 text-slate-500" />,
        habitual_late: <UserX className="h-4 w-4 text-orange-500" />,
        pattern_break: <Activity className="h-4 w-4 text-blue-500" />,
        ghost_shift: <AlertTriangle className="h-4 w-4 text-red-500" />,
        location_mismatch: <AlertCircle className="h-4 w-4 text-amber-500" />,
    } as Record<string, JSX.Element>;

    return (
        <div className="flex-1 space-y-6 p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Anomaly Detection</h2>
                    <p className="text-muted-foreground flex items-center gap-2 mt-1">
                        <Activity className="h-4 w-4" />
                        AI-powered attendance pattern analysis (Last 30 days)
                    </p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
                        <AlertCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {anomalies.filter(a => a.severity === "critical").length}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">High Severity</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">
                            {anomalies.filter(a => a.severity === "high").length}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Warnings (Med/Low)</CardTitle>
                        <Activity className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">
                            {anomalies.filter(a => a.severity === "medium" || a.severity === "low").length}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Anomalies</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-800">
                            {anomalies.length}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Anomalies Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Detected Issues</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date Detected</TableHead>
                                <TableHead>Employee</TableHead>
                                <TableHead>Anomaly Type</TableHead>
                                <TableHead>Severity</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {anomalies.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        No anomalies detected in the last 30 days. Perfect compliance!
                                    </TableCell>
                                </TableRow>
                            ) : (
                                anomalies.map((anomaly) => (
                                    <TableRow key={anomaly.id}>
                                        <TableCell className="whitespace-nowrap">
                                            {format(parseISO(anomaly.date), "MMM d, yyyy")}
                                            <div className="text-xs text-muted-foreground">
                                                {format(parseISO(anomaly.date), "HH:mm")}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-medium">{anomaly.userName}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {typeIcons[anomaly.type] || <AlertCircle className="h-4 w-4" />}
                                                <span className="font-semibold text-sm">
                                                    {typeLabels[anomaly.type as keyof typeof typeLabels] || anomaly.type}
                                                </span>
                                            </div>
                                            {anomaly.metricValue && (
                                                <div className="text-xs text-muted-foreground mt-0.5 ml-6">
                                                    {anomaly.metricValue}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={`uppercase text-[10px] tracking-wider ${severityColors[anomaly.severity]}`}>
                                                {anomaly.severity}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="max-w-md">
                                            <p className="text-sm text-slate-600 truncate" title={anomaly.description}>
                                                {anomaly.description}
                                            </p>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {anomaly.type === 'extreme_duration' ? (
                                                <Button variant="outline" size="sm" asChild>
                                                    <Link href={`/dashboard/${params.orgId}/hr/attendance?user_id=${anomaly.userId}`}>
                                                        Review Entry
                                                    </Link>
                                                </Button>
                                            ) : (
                                                <Button variant="ghost" size="sm" asChild>
                                                    <Link href={`/dashboard/${params.orgId}/users/${anomaly.userId}`}>
                                                        View Profile
                                                    </Link>
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
