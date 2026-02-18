"use client";

import { Patrol } from "@/lib/actions/security/patrols";
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
import { Eye } from "lucide-react";
import Link from "next/link";

interface PatrolsListProps {
    patrols: Patrol[];
    orgId: string;
}

export function PatrolsList({ patrols, orgId }: PatrolsListProps) {
    if (patrols.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                No patrol history found.
            </div>
        );
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Site</TableHead>
                        <TableHead>Guard</TableHead>
                        <TableHead>Started</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {patrols.map((patrol) => (
                        <TableRow key={patrol.id}>
                            <TableCell>
                                <Badge variant={
                                    patrol.status === 'completed' ? 'default' :
                                        patrol.status === 'incomplete' ? 'destructive' : 'secondary'
                                }>
                                    {patrol.status}
                                </Badge>
                            </TableCell>
                            <TableCell>{patrol.site?.name || 'Unknown Site'}</TableCell>
                            <TableCell>
                                <div className="flex flex-col">
                                    <span className="font-medium">{patrol.user?.full_name || 'Unknown User'}</span>
                                    <span className="text-xs text-muted-foreground">{patrol.user?.email}</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                {format(new Date(patrol.started_at), "MMM d, yyyy HH:mm")}
                            </TableCell>
                            <TableCell>
                                {patrol.ended_at ? (
                                    // Simple duration calc
                                    (() => {
                                        const start = new Date(patrol.started_at).getTime();
                                        const end = new Date(patrol.ended_at).getTime();
                                        const diff = Math.round((end - start) / 60000);
                                        return `${diff} mins`;
                                    })()
                                ) : (
                                    <span className="text-muted-foreground italic">Ongoing...</span>
                                )}
                            </TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="sm" asChild>
                                    <Link href={`/dashboard/${orgId}/security/patrols/${patrol.id}`}>
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
