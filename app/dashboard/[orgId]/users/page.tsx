"use client";

import { useState, useEffect, useTransition } from "react";
import { getOrganizationMembers } from "@/lib/actions/users";
import { createUser, getTeams } from "@/lib/actions/workforce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import { Loader2, Plus, UserPlus, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Papa from "papaparse";
import { bulkCreateUsers, removeUser } from "@/lib/actions/workforce";
import { Upload } from "lucide-react";
import { Label } from "@/components/ui/label";

export default function UserDirectoryPage({ params }: { params: { orgId: string } }) {
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const refresh = () => {
        getOrganizationMembers(params.orgId).then((data) => {
            setMembers(data);
            setLoading(false);
        });
    };

    useEffect(() => {
        refresh();
    }, [params.orgId]);

    return (
        <div className="space-y-4">
            <div className="flex justify-end gap-2">
                <BulkImportBtn orgId={params.orgId} onSuccess={refresh} />
                <CreateUserBtn orgId={params.orgId} onSuccess={refresh} />
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Mobile</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading && (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">Loading...</TableCell>
                            </TableRow>
                        )}
                        {!loading && members.map((member) => (
                            <TableRow key={member.id}>
                                <TableCell className="font-medium flex items-center gap-2">
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback>{(member.profiles?.full_name || member.user_id).substring(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    {member.profiles?.full_name || "Unknown"}
                                </TableCell>
                                <TableCell>{member.profiles?.email}</TableCell>
                                <TableCell>{member.profiles?.mobile || "-"}</TableCell>
                                <TableCell className="capitalize">{member.role}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    <EditUserDialog orgId={params.orgId} user={member} onSuccess={refresh} />
                                    <DeleteUserBtn orgId={params.orgId} userId={member.user_id} onSuccess={refresh} />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

function DeleteUserBtn({ orgId, userId, onSuccess }: { orgId: string, userId: string, onSuccess: () => void }) {
    const [loading, startTransition] = useTransition();

    const handleDelete = () => {
        if (!confirm("Are you sure you want to remove this user from the organization?")) return;

        startTransition(async () => {
            try {
                await removeUser(orgId, userId);
                toast({ title: "User Removed", description: "User has been removed from the organization." });
                onSuccess();
            } catch (error: any) {
                toast({ title: "Error", description: error.message, variant: "destructive" });
            }
        });
    };

    return (
        <Button variant="ghost" size="icon" onClick={handleDelete} disabled={loading} className="text-red-500 hover:text-red-700 hover:bg-red-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </Button>
    );
}

function CreateUserBtn({ orgId, onSuccess }: { orgId: string, onSuccess: () => void }) {
    const [open, setOpen] = useState(false);
    const [loading, startTransition] = useTransition();
    const [teams, setTeams] = useState<any[]>([]);

    // Form States
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [mobile, setMobile] = useState("");
    const [role, setRole] = useState<"admin" | "editor" | "viewer">("viewer");
    const [teamId, setTeamId] = useState("");

    useEffect(() => {
        if (open) {
            getTeams(orgId).then(setTeams);
        }
    }, [open, orgId]);

    const handleCreate = () => {
        if (!email || !firstName) return;
        startTransition(async () => {
            try {
                const res = await createUser(orgId, {
                    firstName,
                    lastName,
                    email,
                    mobile,
                    role,
                    teamId: teamId === "none" ? undefined : teamId
                });

                // Show temp password
                setOpen(false);
                onSuccess();

                // Ideally we show this in a nice dialog, but toast is quick for now.
                // Or better, keep dialog open and show success state.
                // Let's use a long duration toast.
                toast({
                    title: "User Created",
                    description: `Success! Temporary Password: ${res.tempPassword}`,
                    duration: 10000,
                });

            } catch (error: any) {
                toast({
                    title: "Error",
                    description: error.message,
                    variant: "destructive",
                });
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    Create User
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create User</DialogTitle>
                    <DialogDescription>
                        Manually add a user to your workforce. They must already have an account.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">First Name</label>
                            <Input value={firstName} onChange={e => setFirstName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Last Name</label>
                            <Input value={lastName} onChange={e => setLastName(e.target.value)} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Email</label>
                        <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="user@example.com" />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Mobile Number</label>
                        <Input value={mobile} onChange={e => setMobile(e.target.value)} placeholder="+1 234 567 8900" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Role</label>
                            <Select value={role} onValueChange={(val: any) => setRole(val)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="viewer">Viewer</SelectItem>
                                    <SelectItem value="editor">Editor</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Team</label>
                            <Select value={teamId} onValueChange={setTeamId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select team" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No Team</SelectItem>
                                    {teams.map(t => (
                                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreate} disabled={loading}>
                        {loading && <Loader2 className="animate-spin h-4 w-4 mr-2" />}
                        Create
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

import { updateUser } from "@/lib/actions/workforce";

function EditUserDialog({ orgId, user, onSuccess }: { orgId: string, user: any, onSuccess: () => void }) {
    const [open, setOpen] = useState(false);
    const [loading, startTransition] = useTransition();
    const [teams, setTeams] = useState<any[]>([]);

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [mobile, setMobile] = useState("");
    const [role, setRole] = useState<"admin" | "editor" | "viewer">("viewer");
    const [teamId, setTeamId] = useState("none");
    const [hourlyRate, setHourlyRate] = useState("0");

    const splitName = (fullName: string) => {
        const parts = (fullName || "").split(' ');
        return {
            first: parts[0] || "",
            last: parts.slice(1).join(' ') || ""
        };
    };

    useEffect(() => {
        if (open) {
            getTeams(orgId).then(setTeams);
            const { first, last } = splitName(user.profiles?.full_name);
            setFirstName(first);
            setLastName(last);
            setMobile(user.profiles?.mobile || "");
            setRole(user.role);
            setHourlyRate(user.profiles?.hourly_rate?.toString() || "0");
            // Ideally we fetch current team membership for this user to pre-fill teamId
            // For now default to none or we'd need to pass it in `user` object in `getOrganizationMembers`
        }
    }, [open, orgId, user]);

    const handleUpdate = () => {
        startTransition(async () => {
            try {
                await updateUser(orgId, user.user_id, {
                    firstName,
                    lastName,
                    mobile,
                    role,
                    teamId: teamId === "none" ? null : teamId,
                    hourlyRate: parseFloat(hourlyRate)
                });
                toast({ title: "User Updated", description: "Changes saved successfully." });
                setOpen(false);
                onSuccess();
            } catch (error: any) {
                toast({ title: "Error", description: error.message, variant: "destructive" });
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm">Edit</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit User</DialogTitle>
                    <DialogDescription>Update user details and permissions.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">First Name</label>
                            <Input value={firstName} onChange={e => setFirstName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Last Name</label>
                            <Input value={lastName} onChange={e => setLastName(e.target.value)} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Mobile Number</label>
                        <Input value={mobile} onChange={e => setMobile(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Hourly Rate ($)</label>
                        <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={hourlyRate}
                            onChange={e => setHourlyRate(e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Role</label>
                            <Select value={role} onValueChange={(val: any) => setRole(val)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="viewer">Viewer</SelectItem>
                                    <SelectItem value="editor">Editor</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Team</label>
                            <Select value={teamId} onValueChange={setTeamId}>
                                <SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No Team</SelectItem>
                                    {teams.map(t => (
                                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleUpdate} disabled={loading}>
                        {loading && <Loader2 className="animate-spin h-4 w-4 mr-2" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function BulkImportBtn({ orgId, onSuccess }: { orgId: string, onSuccess: () => void }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [stats, setStats] = useState<any>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setStats(null);
        }
    };

    const handleUpload = () => {
        if (!file) return;
        setLoading(true);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const users = results.data.map((row: any) => ({
                    firstName: row.FirstName || row.firstName || "",
                    lastName: row.LastName || row.lastName || "",
                    email: row.Email || row.email || "",
                    mobile: row.Mobile || row.mobile || "",
                    role: (row.Role || row.role || "viewer").toLowerCase(),
                    teamId: row.TeamId || row.teamId
                })).filter(u => u.email); // Basic filter

                try {
                    const res = await bulkCreateUsers(orgId, users);
                    setStats(res);
                    if (res.success > 0) {
                        toast({ title: "Import Complete", description: `Successfully imported ${res.success} users.` });
                        onSuccess();
                    }
                    if (res.failed === 0) {
                        // Don't close immediately if we want to show success? 
                        // Logic from before: close if no errors.
                        setOpen(false);
                        setFile(null);
                        setStats(null);
                    }
                } catch (e: any) {
                    toast({ title: "Import Failed", description: e.message, variant: "destructive" });
                } finally {
                    setLoading(false);
                }
            },
            error: (err) => {
                toast({ title: "CSV Error", description: err.message, variant: "destructive" });
                setLoading(false);
            }
        });
    };

    const downloadTemplate = () => {
        const csvContent = "data:text/csv;charset=utf-8,FirstName,LastName,Email,Mobile,Role\nJohn,Doe,john@example.com,+123456789,viewer";
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "user_import_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Upload className="h-4 w-4" />
                    Import CSV
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Bulk Import Users</DialogTitle>
                    <DialogDescription>Upload a CSV file to add multiple users at once.</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="flex justify-between items-center bg-muted/50 p-3 rounded text-sm">
                        <span>Need a template?</span>
                        <Button variant="link" size="sm" onClick={downloadTemplate}>Download CSV Template</Button>
                    </div>

                    <div className="grid w-full max-w-sm items-center gap-1.5">
                        <Label htmlFor="csv">CSV File</Label>
                        <Input id="csv" type="file" accept=".csv" onChange={handleFileChange} />
                    </div>

                    {stats && (
                        <div className="text-sm border p-3 rounded">
                            <p className="font-semibold">Result:</p>
                            <p className="text-green-600">Success: {stats.success}</p>
                            <p className="text-red-600">Failed: {stats.failed}</p>
                            {stats.errors.length > 0 && (
                                <ul className="mt-2 text-red-500 text-xs list-disc pl-4 max-h-32 overflow-y-auto">
                                    {stats.errors.map((e: string, i: number) => <li key={i}>{e}</li>)}
                                </ul>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
                    <Button onClick={handleUpload} disabled={loading || !file}>
                        {loading && <Loader2 className="animate-spin h-4 w-4 mr-2" />}
                        Import Users
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
