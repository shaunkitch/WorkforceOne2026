"use client";

import { useState, useEffect, useTransition } from "react";
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
import { toast } from "@/components/ui/use-toast";
import { Loader2, Plus, UserPlus, Trash2, BellRing, Upload } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Actions
import {
    createUser,
    updateUser,
    removeUser,
    bulkCreateUsers,
    getTeams
} from "@/lib/actions/workforce";
import { sendNotification, sendNotificationToAll } from "@/lib/actions/notifications";
import Papa from "papaparse";
import { useRouter } from "next/navigation";

export function NotifyAllDialog({ orgId }: { orgId: string }) {
    const [open, setOpen] = useState(false);
    const [loading, startTransition] = useTransition();
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [type, setType] = useState<"info" | "success" | "warning" | "error">("info");

    const handleSend = () => {
        if (!title || !message) return;
        if (!confirm("Are you sure you want to send this notification to ALL users?")) return;

        startTransition(async () => {
            try {
                const res = await sendNotificationToAll(orgId, title, message, type);
                if (res.success) {
                    toast({ title: "Notifications Sent", description: `Sent to ${res.count} users.` });
                    setOpen(false);
                    setTitle("");
                    setMessage("");
                    setType("info");
                } else {
                    throw new Error(res.error);
                }
            } catch (error: any) {
                toast({ title: "Error", description: error.message, variant: "destructive" });
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <BellRing className="h-4 w-4" />
                    Notify All
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Notify All Users</DialogTitle>
                    <DialogDescription>Send a push notification to every user in this organization.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label>Title</Label>
                        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Announcement Title" />
                    </div>
                    <div className="space-y-2">
                        <Label>Message</Label>
                        <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Type your message here..." />
                    </div>
                    <div className="space-y-2">
                        <Label>Type</Label>
                        <Select value={type} onValueChange={(val: any) => setType(val)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="info">Info (Blue)</SelectItem>
                                <SelectItem value="success">Success (Green)</SelectItem>
                                <SelectItem value="warning">Warning (Orange)</SelectItem>
                                <SelectItem value="error">Error (Red)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleSend} disabled={loading}>
                        {loading && <Loader2 className="animate-spin h-4 w-4 mr-2" />}
                        Send to All
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function SendNotificationDialog({ orgId, userId, userName }: { orgId: string, userId: string, userName: string }) {
    const [open, setOpen] = useState(false);
    const [loading, startTransition] = useTransition();
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [type, setType] = useState<"info" | "success" | "warning" | "error">("info");

    const handleSend = () => {
        if (!title || !message) return;
        startTransition(async () => {
            try {
                const res = await sendNotification(orgId, userId, title, message, type);
                if (res.success) {
                    toast({ title: "Notification Sent", description: `Sent to ${userName}` });
                    setOpen(false);
                    setTitle("");
                    setMessage("");
                    setType("info");
                } else {
                    throw new Error(res.error);
                }
            } catch (error: any) {
                toast({ title: "Error", description: error.message, variant: "destructive" });
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" title="Send Notification">
                    <BellRing className="h-4 w-4 text-slate-500" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Send Notification</DialogTitle>
                    <DialogDescription>Send a push notification to {userName}.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label>Title</Label>
                        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Notification Title" />
                    </div>
                    <div className="space-y-2">
                        <Label>Message</Label>
                        <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Type your message here..." />
                    </div>
                    <div className="space-y-2">
                        <Label>Type</Label>
                        <Select value={type} onValueChange={(val: any) => setType(val)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="info">Info (Blue)</SelectItem>
                                <SelectItem value="success">Success (Green)</SelectItem>
                                <SelectItem value="warning">Warning (Orange)</SelectItem>
                                <SelectItem value="error">Error (Red)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleSend} disabled={loading}>
                        {loading && <Loader2 className="animate-spin h-4 w-4 mr-2" />}
                        Send
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function DeleteUserBtn({ orgId, userId }: { orgId: string, userId: string }) {
    const [loading, startTransition] = useTransition();
    const router = useRouter();

    const handleDelete = () => {
        if (!confirm("Are you sure you want to remove this user from the organization?")) return;

        startTransition(async () => {
            try {
                await removeUser(orgId, userId);
                toast({ title: "User Removed", description: "User has been removed from the organization." });
                router.refresh();
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

export function CreateUserBtn({ orgId, currency }: { orgId: string, currency?: string }) {
    const [open, setOpen] = useState(false);
    const [loading, startTransition] = useTransition();
    const [teams, setTeams] = useState<Team[]>([]);
    const router = useRouter();

    // Form States
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [mobile, setMobile] = useState("");
    const [role, setRole] = useState<"admin" | "editor" | "viewer">("viewer");
    const [teamId, setTeamId] = useState("");

    // Bank Details
    const [bankName, setBankName] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [iban, setIban] = useState("");

    useEffect(() => {
        if (open) {
            getTeams(orgId).then(setTeams);
        }
    }, [open, orgId]);

    const handleCreate = () => {
        if (!email || !firstName) return;
        startTransition(async () => {
            try {
                const bankDetails = currency === "ZAR"
                    ? { bankName, accountNumber }
                    : currency === "EUR" ? { iban } : {};

                const res = await createUser(orgId, {
                    firstName,
                    lastName,
                    email,
                    mobile,
                    role,
                    teamId: teamId === "none" ? undefined : teamId,
                    bankDetails
                });

                // Show temp password
                setOpen(false);
                router.refresh();

                toast({
                    title: "User Created",
                    description: `Success! Employee #: ${res.employeeNumber}. Temp Password: ${res.tempPassword}`,
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
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Create User</DialogTitle>
                    <DialogDescription>
                        Manually add a user. Employee number will be auto-generated.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
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

                    {/* Dynamic Bank Details */}
                    {currency === "ZAR" && (
                        <div className="space-y-2 border-t pt-4 mt-2">
                            <h4 className="font-medium text-sm">Banking Details (ZAR)</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-muted-foreground">Bank Name</label>
                                    <Input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="e.g. FNB" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-muted-foreground">Account Number</label>
                                    <Input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} />
                                </div>
                            </div>
                        </div>
                    )}

                    {currency === "EUR" && (
                        <div className="space-y-2 border-t pt-4 mt-2">
                            <h4 className="font-medium text-sm">Banking Details (EUR)</h4>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">IBAN</label>
                                <Input value={iban} onChange={e => setIban(e.target.value)} placeholder="NL00 BANK 0000 0000 00" />
                            </div>
                        </div>
                    )}

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

import { OrganizationMember } from "@/types/app";

export function EditUserDialog({ orgId, user, currency }: { orgId: string, user: OrganizationMember, currency?: string }) {
    const [open, setOpen] = useState(false);
    const [loading, startTransition] = useTransition();
    const router = useRouter();
    const [teams, setTeams] = useState<Team[]>([]);

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [mobile, setMobile] = useState("");
    const [role, setRole] = useState<"admin" | "editor" | "viewer">("viewer");
    const [teamId, setTeamId] = useState("none");
    const [hourlyRate, setHourlyRate] = useState("0");

    // Bank Details
    const [bankName, setBankName] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [iban, setIban] = useState("");

    const [password, setPassword] = useState("");

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
            setEmail(user.profiles?.email || "");
            setMobile(user.profiles?.mobile || "");
            setRole(user.role);
            setHourlyRate(user.profiles?.hourly_rate?.toString() || "0");
            setPassword(""); // Reset password field on open

            const bank = user.profiles?.bank_details || {};
            setBankName(bank.bankName || "");
            setAccountNumber(bank.accountNumber || "");
            setIban(bank.iban || "");
        }
    }, [open, orgId, user]);

    const handleUpdate = () => {
        startTransition(async () => {
            try {
                const bankDetails = currency === "ZAR"
                    ? { bankName, accountNumber }
                    : currency === "EUR" ? { iban } : {};

                await updateUser(orgId, user.user_id, {
                    firstName,
                    lastName,
                    email,
                    mobile,
                    password: password || undefined, // Send if entered
                    role,
                    teamId: teamId === "none" ? null : teamId,
                    hourlyRate: parseFloat(hourlyRate),
                    bankDetails
                });
                toast({ title: "User Updated", description: "Changes saved successfully." });
                setOpen(false);
                router.refresh();
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
                <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
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
                        <Input value={email} onChange={e => setEmail(e.target.value)} />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">New Password (Optional)</label>
                        <Input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Leave blank to keep current"
                        />
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

                    {/* Dynamic Bank Details */}
                    {currency === "ZAR" && (
                        <div className="space-y-2 border-t pt-4 mt-2">
                            <h4 className="font-medium text-sm">Banking Details (ZAR)</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-muted-foreground">Bank Name</label>
                                    <Input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="e.g. FNB" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-muted-foreground">Account Number</label>
                                    <Input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} />
                                </div>
                            </div>
                        </div>
                    )}

                    {currency === "EUR" && (
                        <div className="space-y-2 border-t pt-4 mt-2">
                            <h4 className="font-medium text-sm">Banking Details (EUR)</h4>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">IBAN</label>
                                <Input value={iban} onChange={e => setIban(e.target.value)} placeholder="NL00 BANK 0000 0000 00" />
                            </div>
                        </div>
                    )}
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

export function BulkImportBtn({ orgId }: { orgId: string }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [stats, setStats] = useState<any>(null);
    const router = useRouter();

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
                        router.refresh();
                    }
                    if (res.failed === 0) {
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
