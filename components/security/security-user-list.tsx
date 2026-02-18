"use client";

import { SecurityUser, toggleSecurityAccess } from "@/lib/actions/security/settings";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { User } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";

interface SecurityUserListProps {
    users: SecurityUser[];
    orgId: string;
}

export function SecurityUserList({ users, orgId }: SecurityUserListProps) {
    const { toast } = useToast();
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const handleToggle = async (userId: string, memberId: string, currentStatus: boolean) => {
        setLoadingId(userId);
        try {
            await toggleSecurityAccess(memberId, !currentStatus, orgId);
            toast({
                title: "Updated",
                description: `User security access ${!currentStatus ? 'enabled' : 'disabled'}.`,
            });
            // Optimistic update handled by server action revalidatePath, 
            // but we might want local state update if it feels slow. 
            // For now, relying on Next.js server action refresh.
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to update user access.",
                variant: "destructive",
            });
        } finally {
            setLoadingId(null);
        }
    };

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Security Guard Access</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users.map((member) => (
                        <TableRow key={member.id}>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-medium text-sm">{member.profile?.full_name || 'Unknown User'}</span>
                                        <span className="text-xs text-muted-foreground">{member.profile?.email}</span>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline" className="capitalize">{member.role}</Badge>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={member.metadata?.is_security_guard || false}
                                        onCheckedChange={() => handleToggle(member.user_id, member.id, member.metadata?.is_security_guard || false)}
                                        disabled={loadingId === member.user_id}
                                    />
                                    <span className="text-sm text-muted-foreground">
                                        {member.metadata?.is_security_guard ? "Enabled" : "Disabled"}
                                    </span>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
