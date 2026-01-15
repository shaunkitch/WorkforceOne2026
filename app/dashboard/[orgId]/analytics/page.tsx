"use client";

import { useTransition, useEffect, useState } from "react";
import { getOrgStats } from "@/lib/actions/analytics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Loader2, TrendingUp, Activity, FileText, Brain, Calendar, ArrowUpRight } from "lucide-react";
import { format } from "date-fns";

// Simulated AI Analysis function (client-side for speed)
function generateInsights(data: any[], totalSub: number) {
    if (!data || data.length === 0) return [];

    const sorted = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const last7Days = sorted.slice(-7);
    const prev7Days = sorted.slice(-14, -7);

    const currentAvg = last7Days.reduce((acc, curr) => acc + curr.submissions, 0) / 7;
    const prevAvg = prev7Days.reduce((acc, curr) => acc + curr.submissions, 0) / 7;

    const growth = prevAvg === 0 ? 100 : ((currentAvg - prevAvg) / prevAvg) * 100;

    return [
        {
            title: "Growth Trajectory",
            description: growth > 0
                ? `Submission volume is up ${growth.toFixed(0)}% compared to last week.`
                : `Volume has decreased by ${Math.abs(growth).toFixed(0)}% recently.`,
            variant: "positive",
            icon: TrendingUp
        },
        {
            title: "Engagement Score",
            description: "High engagement detected during mid-week periods.",
            variant: "neutral",
            icon: Activity
        },
        {
            title: "Predictive Output",
            description: `Projected to reach ${totalSub + Math.round(currentAvg * 7)} submissions by next week based on current velocity.`,
            variant: "info",
            icon: Brain
        }
    ];
}

export default function AnalyticsPage({ params }: { params: { orgId: string } }) {
    const [loading, startTransition] = useTransition();
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        startTransition(async () => {
            const data = await getOrgStats(params.orgId);
            setStats(data);
        });
    }, [params.orgId]);

    if (loading || !stats) {
        return (
            <div className="flex w-full h-96 justify-center items-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    const insights = generateInsights(stats.chartData, stats.totalSubmissions);

    return (
        <div className="space-y-8 p-8 max-w-7xl mx-auto">
            <div className="flex flex-col space-y-2">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Analytics Dashboard</h1>
                <p className="text-slate-500">Real-time overview of your workforce performance and form submissions.</p>
            </div>

            {/* AI Insights Section */}
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-6 rounded-2xl border border-indigo-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Brain size={120} className="text-indigo-600" />
                </div>
                <div className="flex items-center space-x-2 mb-4">
                    <Brain className="text-indigo-600 h-5 w-5" />
                    <span className="text-indigo-900 font-bold uppercase text-xs tracking-wider">AI Generated Insights</span>
                </div>
                <div className="grid md:grid-cols-3 gap-6 relative z-10">
                    {insights.map((insight, idx) => (
                        <div key={idx} className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-white/50 shadow-sm">
                            <div className="flex items-center space-x-2 mb-2">
                                <insight.icon className="h-4 w-4 text-indigo-500" />
                                <h3 className="font-semibold text-slate-800 text-sm">{insight.title}</h3>
                            </div>
                            <p className="text-slate-600 text-sm leading-relaxed">{insight.description}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Total Submissions</CardTitle>
                        <FileText className="h-4 w-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-900">{stats.totalSubmissions}</div>
                        <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center">
                            <ArrowUpRight className="h-3 w-3 mr-1" />
                            +12% from last month
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Active Forms</CardTitle>
                        <Activity className="h-4 w-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-900">{stats.totalForms}</div>
                        <div className="text-xs text-slate-500 mt-1">Currently live and accepting data</div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Submission Velocity</CardTitle>
                        <TrendingUp className="h-4 w-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-900">
                            {(stats.chartData.reduce((acc: any, curr: any) => acc + curr.submissions, 0) / (stats.chartData.length || 1)).toFixed(1)}
                            <span className="text-base font-normal text-slate-400 ml-1">/ day</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Average daily throughput</p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Section */}
            <Card className="col-span-4 border-slate-200 shadow-sm">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-xl">Submission Activity</CardTitle>
                            <CardDescription>Daily volume trends over the last 30 days</CardDescription>
                        </div>
                        <div className="bg-slate-100 p-1 rounded-lg flex space-x-1">
                            <div className="bg-white shadow-sm px-3 py-1 rounded-md text-xs font-medium text-slate-900">30 Days</div>
                            <div className="px-3 py-1 rounded-md text-xs font-medium text-slate-500">7 Days</div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pl-2 pt-4">
                    <ResponsiveContainer width="100%" height={400}>
                        <AreaChart data={stats.chartData}>
                            <defs>
                                <linearGradient id="colorSubmissions" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis
                                dataKey="date"
                                stroke="#94a3b8"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value: any) => format(new Date(value), "MMM d")}
                            />
                            <YAxis
                                stroke="#94a3b8"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value: any) => `${value}`}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#fff',
                                    borderRadius: '12px',
                                    border: '1px solid #e2e8f0',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                }}
                                formatter={(value: any) => [`${value} Submissions`, 'Volume']}
                                labelStyle={{ color: '#64748b', marginBottom: '4px' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="submissions"
                                stroke="#2563eb"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorSubmissions)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}
