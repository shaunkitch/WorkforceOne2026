"use client";

import { useTransition, useEffect, useState } from "react";
import { getFormAnalyticsStats } from "@/lib/actions/analytics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Loader2 } from "lucide-react";

export default function FormAnalyticsPage({ params }: { params: { orgId: string, formId: string } }) {
    const [loading, startTransition] = useTransition();
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        startTransition(async () => {
            const data = await getFormAnalyticsStats(params.formId);
            setStats(data);
        });
    }, [params.formId]);

    if (loading || !stats) {
        return (
            <div className="flex w-full h-full justify-center items-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h1 className="text-2xl font-bold">Form Statistics</h1>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalSubmissions}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Assignments</CardTitle>
                        <ListChecks className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-1">
                            <span className="text-2xl font-bold">{stats.assignments.total}</span>
                            <span className="text-xs text-muted-foreground"> Total assigned</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">{stats.assignments.pending}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{stats.assignments.completionRate}%</div>
                        <progress className="progress progress-success w-full h-2 mt-2" value={stats.assignments.completionRate} max="100"></progress>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Submission Trend</CardTitle>
                        <CardDescription>Daily submissions for the last 30 days.</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={stats.chartData} >
                                <XAxis
                                    dataKey="date"
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value: any) => `${value}`}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }}
                                    cursor={{ fill: 'hsl(var(--muted))' }}
                                />
                                <Bar dataKey="submissions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Recent Submissions</CardTitle>
                        <CardDescription>Latest form entries.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-8">
                            {stats.recentSubmissions.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No submissions yet.</p>
                            ) : (
                                stats.recentSubmissions.map((sub: any) => (
                                    <div key={sub.id} className="flex items-center">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium leading-none">
                                                {sub.profiles?.full_name || "Anonymous / Unknown"}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {formatDistance(new Date(sub.created_at), new Date(), { addSuffix: true })}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

import { FileText, ListChecks, Clock, CheckCircle2 } from "lucide-react";
import { formatDistance } from "date-fns";
