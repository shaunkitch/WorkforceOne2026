"use client";

import { Incident, updateIncidentStatus } from "@/lib/actions/security/incidents";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { AlertTriangle, MapPin, User, Calendar, Image as ImageIcon, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

interface IncidentDetailProps {
    incident: any;
}

export function IncidentDetail({ incident }: IncidentDetailProps) {
    const [status, setStatus] = useState<string>(incident.status);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    const handleStatusChange = async (newStatus: string) => {
        setLoading(true);
        try {
            await updateIncidentStatus(incident.id, newStatus as any);
            setStatus(newStatus);
            toast({
                title: "Status Updated",
                description: `Incident marked as ${newStatus}.`,
            });
            router.refresh();
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to update status.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="font-semibold text-muted-foreground">Priority</span>
                            <Badge variant={
                                incident.priority === 'critical' ? 'destructive' :
                                    incident.priority === 'high' ? 'destructive' :
                                        incident.priority === 'medium' ? 'secondary' : 'outline'
                            } className="capitalize">
                                {incident.priority}
                            </Badge>
                        </div>
                        <div className="space-y-1">
                            <span className="font-semibold text-muted-foreground">Description</span>
                            <p className="text-sm border p-3 rounded-md bg-muted/30">
                                {incident.description || "No description provided."}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Reporter</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                <User className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                                <p className="font-medium">{incident.user?.full_name || 'Unknown User'}</p>
                                <p className="text-sm text-muted-foreground">{incident.user?.email}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                            <Calendar className="w-4 h-4" />
                            Reported on {format(new Date(incident.created_at), "PPpp")}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Location</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2 mb-2">
                            <MapPin className="w-4 h-4 text-primary" />
                            <span className="font-medium">
                                {incident.patrol?.site?.name || "Unknown Site"}
                                {incident.patrol?.site_id ? "" : " (Standalone Report)"}
                            </span>
                        </div>
                        <div className="h-[200px] bg-muted/20 flex items-center justify-center rounded-md border border-dashed">
                            <span className="text-muted-foreground">Map visualization coming soon</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Status Management</CardTitle>
                        <CardDescription>Update the resolution status of this incident.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Select value={status} onValueChange={handleStatusChange} disabled={loading}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="open">Open</SelectItem>
                                <SelectItem value="investigating">Investigating</SelectItem>
                                <SelectItem value="resolved">Resolved</SelectItem>
                                <SelectItem value="closed">Closed</SelectItem>
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Photos & Evidence</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {incident.photos && incident.photos.length > 0 ? (
                            <div className="grid grid-cols-2 gap-4">
                                {incident.photos.map((photo: string, index: number) => (
                                    <div key={index} className="relative aspect-video bg-muted rounded-md overflow-hidden border">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={photo}
                                            alt={`Evidence ${index + 1}`}
                                            className="object-cover w-full h-full hover:scale-105 transition-transform cursor-pointer"
                                            onClick={() => window.open(photo, '_blank')}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                                <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                                <p>No photos attached</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
