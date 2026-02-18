import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, AlertTriangle, Activity, MapPin } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function SecurityDashboardPage({ params }: { params: { orgId: string } }) {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Security Operations</h1>
                    <p className="text-muted-foreground">Manage patrols, checkpoints, and incident reports.</p>
                </div>
                <div className="flex gap-2">
                    {/* Actions if needed */}
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Patrols</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-xs text-muted-foreground">Currently on site</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Open Incidents</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-xs text-muted-foreground">Requires attention</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Checkpoints</CardTitle>
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-xs text-muted-foreground">Across all sites</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Guards Online</CardTitle>
                        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-xs text-muted-foreground">Active in last hour</p>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions / Getting Started */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Link href={`/dashboard/${params.orgId}/security/checkpoints`} className="block">
                    <Card className="hover:bg-accent/50 transition cursor-pointer h-full">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-primary" />
                                Manage Checkpoints
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">Set up QR code checkpoints for your sites and print them for deployment.</p>
                        </CardContent>
                    </Card>
                </Link>

                <Link href={`/dashboard/${params.orgId}/security/patrols`} className="block">
                    <Card className="hover:bg-accent/50 transition cursor-pointer h-full">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Activity className="w-5 h-5 text-primary" />
                                Monitor Patrols
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">View real-time patrol logs and guard movements.</p>
                        </CardContent>
                    </Card>
                </Link>

                <Link href={`/dashboard/${params.orgId}/security/incidents`} className="block">
                    <Card className="hover:bg-accent/50 transition cursor-pointer h-full">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-destructive" />
                                Incident Reports
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">Review and resolve reported security incidents.</p>
                        </CardContent>
                    </Card>
                </Link>
            </div>
        </div>
    );
}
