"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createVisit, updateVisit, type Visit } from "@/lib/actions/visits"
import { getClients } from "@/lib/actions/clients"
import { getOrganizationMembers } from "@/lib/actions/users"
import { Loader2, Plus, Calendar, Pencil } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface VisitDialogProps {
    orgId: string;
    visit?: Visit; // Optional visit object for editing
    defaultClientId?: string; // Pre-select a client
}

export function VisitDialog({ orgId, visit, defaultClientId }: VisitDialogProps) {
    const router = useRouter()
    const { toast } = useToast()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [clients, setClients] = useState<any[]>([])
    const [members, setMembers] = useState<any[]>([])

    const [clientId, setClientId] = useState(defaultClientId || "")
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [date, setDate] = useState("")
    const [time, setTime] = useState("")

    // Assignment & Recurrence
    const [assignedUserId, setAssignedUserId] = useState("unassigned")
    const [recurrence, setRecurrence] = useState("none")

    useEffect(() => {
        if (open) {
            getClients(orgId).then(setClients).catch(console.error);
            getOrganizationMembers(orgId).then(setMembers).catch(console.error);

            // Pre-fill if editing
            if (visit) {
                setClientId(visit.client_id)
                setTitle(visit.title)
                setDescription(visit.description || "")

                const d = new Date(visit.scheduled_at)
                // Format YYYY-MM-DD
                setDate(d.toISOString().split('T')[0])
                // Format HH:mm
                const hours = d.getHours().toString().padStart(2, '0')
                const minutes = d.getMinutes().toString().padStart(2, '0')
                setTime(`${hours}:${minutes}`)

                setAssignedUserId(visit.user_id || "unassigned")
                // Recurrence isn't stored on the visit usually in a way that maps back cleanly 1:1 if it's just a generated series.
                // For editing a single instance, we usually disable recurrence editing or reset it.
                // We'll leave it as 'none' to avoid accidentally generating MORE duplicates edits.
            } else {
                // Reset if creating new
                if (defaultClientId) {
                    setClientId(defaultClientId);
                } else {
                    setClientId("");
                }
            }
        }
    }, [open, orgId, visit, defaultClientId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const scheduledAt = new Date(`${date}T${time}:00`).toISOString();

            if (visit) {
                await updateVisit(orgId, visit.id, {
                    clientId,
                    title,
                    description,
                    scheduledAt,
                    userId: assignedUserId === "unassigned" ? undefined : assignedUserId,
                    // We don't update recurrence here for single instance edits usually
                })
                toast({ title: "Success", description: "Visit updated successfully" })
            } else {
                await createVisit(orgId, {
                    clientId,
                    title,
                    description,
                    scheduledAt,
                    userId: assignedUserId === "unassigned" ? undefined : assignedUserId,
                    recurrence
                })
                toast({ title: "Success", description: "Visit scheduled successfully" })
            }

            setOpen(false)
            if (!visit) {
                // Only clear form if creating. If editing, we keep the data for next open or it gets reset by useEffect anyway.
                setTitle("")
                setDescription("")
                setClientId("")
                setDate("")
                setTime("")
                setAssignedUserId("unassigned")
                setRecurrence("none")
            }
            router.refresh()
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message,
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {visit ? (
                    <Button variant="ghost" size="icon">
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                ) : (
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Schedule Visit
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{visit ? "Edit Visit" : "Schedule Visit"}</DialogTitle>
                        <DialogDescription>
                            {visit ? "Update visit details." : "Schedule a new client visit or appointment."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="client" className="text-right">
                                Client *
                            </Label>
                            <Select value={clientId} onValueChange={setClientId} required>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select a client" />
                                </SelectTrigger>
                                <SelectContent>
                                    {clients.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="title" className="text-right">
                                Title *
                            </Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="col-span-3"
                                placeholder="e.g. Site Survey"
                                required
                            />
                        </div>

                        {/* Assignment */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="assignee" className="text-right">
                                Assign To
                            </Label>
                            <Select value={assignedUserId} onValueChange={setAssignedUserId}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Unassigned" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="unassigned">Unassigned</SelectItem>
                                    {members.map(m => (
                                        <SelectItem key={m.user_id} value={m.user_id}>
                                            {m.profiles?.full_name || m.profiles?.email || "Unknown User"}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Recurrence - Only show on Create for now to avoid complexity */}
                        {!visit && (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="recurrence" className="text-right">
                                    Repeat
                                </Label>
                                <Select value={recurrence} onValueChange={setRecurrence}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Does not repeat" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Does not repeat</SelectItem>
                                        <SelectItem value="weekly">Weekly (Next 6 weeks)</SelectItem>
                                        <SelectItem value="bi-weekly">Bi-Weekly (Next 3 months)</SelectItem>
                                        <SelectItem value="monthly">Monthly (Next 6 months)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="date" className="text-right">
                                Date *
                            </Label>
                            <Input
                                id="date"
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="col-span-3"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="time" className="text-right">
                                Time *
                            </Label>
                            <Input
                                id="time"
                                type="time"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                className="col-span-3"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="description" className="text-right">
                                Notes
                            </Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="col-span-3"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {visit ? "Save Changes" : "Schedule"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
