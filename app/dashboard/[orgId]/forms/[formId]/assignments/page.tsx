"use client";

import { useState, useEffect, useTransition } from "react";
import { assignForm, getFormAssignments } from "@/lib/actions/assignments";
import { getOrganizationMembers } from "@/lib/actions/users";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { removeAssignment } from "@/lib/actions/assignments";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistance } from "date-fns";

export default function AssignmentsPage({ params }: { params: { orgId: string; formId: string } }) {
    const [assignments, setAssignments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    // Track deleting state per assignment to show spinner
    const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

    const refresh = () => {
        console.log("Refreshing assignments...");
        getFormAssignments(params.formId).then((data) => {
            console.log("Assignments received on client:", data);
            setAssignments(data);
            setLoading(false);
        }).catch(err => {
            console.error("Error refreshing assignments:", err);
            setLoading(false);
        });
    };

    const handleDelete = async (assignmentId: string) => {
        if (confirm("Are you sure you want to remove this assignment?")) {
            setDeletingIds(prev => new Set(prev).add(assignmentId));
            try {
                await removeAssignment(assignmentId);
                toast({ title: "Removed", description: "Assignment removed successfully." });
                refresh();
            } catch (error: any) {
                toast({ title: "Error", description: error.message, variant: "destructive" });
            } finally {
                setDeletingIds(prev => {
                    const next = new Set(prev);
                    next.delete(assignmentId);
                    return next;
                });
            }
        }
    };

    useEffect(() => {
        refresh();
    }, [params.formId]);

    return (
        <div className="py-4 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Assignments</h2>
                <AssignUserBtn orgId={params.orgId} formId={params.formId} onSuccess={refresh} />
            </div>

            <div className="border rounded-md divide-y">
                {loading && <div className="p-4">Loading assignments...</div>}
                {!loading && assignments.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">
                        No users assigned to this form yet.
                    </div>
                )}
                {assignments.map((assignment) => (
                    <div key={assignment.id} className="p-4 flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600"
                                onClick={() => handleDelete(assignment.id)}
                                disabled={deletingIds.has(assignment.id)}
                            >
                                {deletingIds.has(assignment.id) ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Trash2 className="h-4 w-4" />
                                )}
                            </Button>
                            <Avatar>
                                <AvatarFallback>{(assignment.profiles?.full_name || "?").substring(0, 1)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-medium">{assignment.profiles?.full_name || "Unknown User"}</p>
                                <p className="text-xs text-muted-foreground">Assigned {formatDistance(new Date(assignment.created_at), new Date(), { addSuffix: true })}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${assignment.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {assignment.status}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function AssignUserBtn({ orgId, formId, onSuccess }: { orgId: string, formId: string, onSuccess: () => void }) {
    const [open, setOpen] = useState(false);
    const [loading, startTransition] = useTransition();
    const [members, setMembers] = useState<any[]>([]);
    const [teams, setTeams] = useState<any[]>([]);
    const [selectedUserId, setSelectedUserId] = useState("");
    const [selectedTeamId, setSelectedTeamId] = useState("");
    const [mode, setMode] = useState<"user" | "group">("user");

    useEffect(() => {
        if (open) {
            getOrganizationMembers(orgId).then(setMembers);
            // We need to import getTeams, let's assume it's imported at top, else we need to update imports.
            // Dynamically importing here or relying on top-level import.
            // Let's add the import in a separate block if needed, but for now assuming we update the whole file or relying on top level.
            // Actually, we need to ensure getTeams is imported. 
            // I'll assume I can add it to the top level import in a separate matching chunk or this chunk covers it if I rewrite the component.
            // Checking previous file content... getTeams was NOT imported.
            // I should use multi_replace to add import. 
        }
    }, [open, orgId]);

    // Quick fetch for teams when switching mode or opening
    useEffect(() => {
        if (open && mode === "group" && teams.length === 0) {
            import("@/lib/actions/workforce").then(mod => {
                mod.getTeams(orgId).then(setTeams);
            });
        }
    }, [open, mode, orgId, teams.length]);


    const handleAssign = () => {
        if (mode === "user" && !selectedUserId) return;
        if (mode === "group" && !selectedTeamId) return;

        startTransition(async () => {
            try {
                if (mode === "user") {
                    await assignForm(formId, selectedUserId);
                    toast({ title: "Success", description: "Form assigned to user" });
                } else {
                    // Import dynamically to avoid top-level issues if not updated yet, 
                    // though ideally we update top imports.
                    const { assignFormToGroup } = await import("@/lib/actions/assignments");
                    const res = await assignFormToGroup(formId, selectedTeamId);
                    toast({ title: "Success", description: `Form assigned to ${res.assignedCount} members of the group` });
                }

                setOpen(false);
                onSuccess();
            } catch (error: any) {
                toast({
                    title: "Error",
                    description: error.message || "Failed to assign",
                    variant: "destructive",
                });
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Assign to...
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Assign Form</DialogTitle>
                    <DialogDescription>
                        Assign this form to an individual or an entire group.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex space-x-4 border-b mb-4">
                    <button
                        className={`pb-2 text-sm font-medium transition-colors ${mode === "user" ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-500 hover:text-slate-700"}`}
                        onClick={() => setMode("user")}
                    >
                        Individual
                    </button>
                    <button
                        className={`pb-2 text-sm font-medium transition-colors ${mode === "group" ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-500 hover:text-slate-700"}`}
                        onClick={() => setMode("group")}
                    >
                        Group / Team
                    </button>
                </div>

                <div className="space-y-4 py-2">
                    {mode === "user" ? (
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Select Member</label>
                            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a user..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {members.map((m) => (
                                        <SelectItem key={m.user_id} value={m.user_id}>
                                            {m.profiles?.full_name || m.profiles?.email || m.user_id}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Select Group</label>
                            <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a team..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {teams.map((t) => (
                                        <SelectItem key={t.id} value={t.id}>
                                            {t.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">All members of this team will be assigned this form.</p>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleAssign} disabled={loading || (mode === "user" ? !selectedUserId : !selectedTeamId)}>
                        {loading && <Loader2 className="animate-spin h-4 w-4 mr-2" />}
                        Assign {mode === "group" && "Group"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
