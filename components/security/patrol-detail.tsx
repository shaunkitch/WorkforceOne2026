"use client";

import { Patrol } from "@/lib/actions/security/patrols";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Clock, MapPin, XCircle } from "lucide-react";

interface PatrolDetailProps {
    patrol: any; // Type is complex with joins, using any for specific components for now or need to export full type
}

export function PatrolDetail({ patrol }: PatrolDetailProps) {
    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Patrol Info</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between border-b pb-2">
                            <span className="font-semibold text-muted-foreground">Guard</span>
                            <span>{patrol.user?.full_name} ({patrol.user?.email})</span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <span className="font-semibold text-muted-foreground">Site</span>
                            <span>{patrol.site?.name}</span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <span className="font-semibold text-muted-foreground">Status</span>
                            <Badge variant={patrol.status === 'completed' ? 'default' : 'secondary'}>
                                {patrol.status}
                            </Badge>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <span className="font-semibold text-muted-foreground">Started</span>
                            <span>{format(new Date(patrol.started_at), "PPpp")}</span>
                        </div>
                        {patrol.ended_at && (
                            <div className="flex justify-between border-b pb-2">
                                <span className="font-semibold text-muted-foreground">Ended</span>
                                <span>{format(new Date(patrol.ended_at), "PPpp")}</span>
                            </div>
                        )}
                        {patrol.notes && (
                            <div className="flex flex-col gap-2 pt-2">
                                <span className="font-semibold text-muted-foreground">Notes</span>
                                <p className="text-sm bg-muted p-2 rounded">{patrol.notes}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Map Placeholder */}
                <Card>
                    <CardHeader>
                        <CardTitle>Map View</CardTitle>
                        <CardDescription>GPS track of the patrol</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px] bg-muted/20 flex items-center justify-center rounded-md border border-dashed">
                        <span className="text-muted-foreground">Map visualization coming soon</span>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Patrol Logs</CardTitle>
                    <CardDescription>Timeline of checkpoint scans and events</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="relative border-l border-muted ml-4 space-y-8 pb-4">
                        {patrol.logs?.map((log: any, index: number) => (
                            <div key={log.id} className="relative pl-6">
                                <div className={`absolute -left-[9px] top-1 h-4 w-4 rounded-full border bg-background flex items-center justify-center ${log.status === 'issue_reported' ? 'border-destructive text-destructive' : 'border-primary text-primary'
                                    }`}>
                                    {log.status === 'issue_reported' ? <XCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-sm font-semibold">
                                        {log.checkpoint?.name || "Unknown Checkpoint"}
                                    </span>
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {format(new Date(log.scanned_at), "HH:mm:ss")}
                                    </span>
                                    {log.formatted_address && (
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <MapPin className="w-3 h-3" />
                                            {log.formatted_address}
                                        </span>
                                    )}
                                    {log.status === 'issue_reported' && (
                                        <Badge variant="destructive" className="w-fit mt-1">Issue Reported</Badge>
                                    )}
                                </div>
                            </div>
                        ))}
                        {patrol.logs?.length === 0 && (
                            <div className="pl-6 text-sm text-muted-foreground">
                                No logs recorded yet.
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
