"use client";

import { Incident } from "@/lib/actions/security/incidents";
import { format } from "date-fns";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface IncidentsListProps {
    incidents: Incident[];
    orgId: string;
}

export function IncidentsList({ incidents, orgId }: IncidentsListProps) {
    if (incidents.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                No incidents reported.
            </div>
        );
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Priority</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Reported By</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {incidents.map((incident) => (
                        <TableRow key={incident.id}>
                            <TableCell>
                                <Badge variant="outline" className={cn(
                                    "capitalize",
                                    incident.priority === 'critical' ? "border-red-500 text-red-500 bg-red-500/10" :
                                        incident.priority === 'high' ? "border-orange-500 text-orange-500 bg-orange-500/10" :
                                            incident.priority === 'medium' ? "border-yellow-500 text-yellow-500 bg-yellow-500/10" :
                                                "border-green-500 text-green-500 bg-green-500/10"
                                )}>
                                    {incident.priority}
                                </Badge>
                            </TableCell>
                            <TableCell className="font-medium">{incident.title}</TableCell>
                            <TableCell>
                                <Badge variant={
                                    incident.status === 'open' ? 'destructive' :
                                        incident.status === 'investigating' ? 'secondary' : 'default'
                                }>
                                    {incident.status}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-col">
                                    <span className="text-sm">{incident.user?.full_name}</span>
                                    <span className="text-xs text-muted-foreground">{incident.user?.email}</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                {incident.patrol?.site?.name || 'Unknown Location'}
                            </TableCell>
                            <TableCell>
                                {format(new Date(incident.created_at), "MMM d, HH:mm")}
                            </TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="sm" asChild>
                                    <Link href={`/dashboard/${orgId}/security/incidents/${incident.id}`}>
                                        <Eye className="w-4 h-4 mr-2" />
                                        Details
                                    </Link>
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
