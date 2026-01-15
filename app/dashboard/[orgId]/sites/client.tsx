"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Plus, MapPin, ScanLine, Trash2 } from "lucide-react";
import QRCode from "react-qr-code";
import { QrCode as QrIcon } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { createSite, createCheckpoint, deleteSite, deleteCheckpoint } from "@/lib/actions/sites";
import { toast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

export function SitesClient({ orgId, initialSites }: { orgId: string, initialSites: any[] }) {
    const [openSite, setOpenSite] = useState(false);

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button onClick={() => setOpenSite(true)} className="gap-2">
                    <Plus className="h-4 w-4" /> Add Site
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {initialSites.map((site) => (
                    <SiteCard key={site.id} site={site} orgId={orgId} />
                ))}
                {initialSites.length === 0 && (
                    <div className="col-span-full text-center py-10 text-muted-foreground">
                        No sites found. Create one to get started.
                    </div>
                )}
            </div>

            <CreateSiteDialog open={openSite} setOpen={setOpenSite} orgId={orgId} />
        </div>
    );
}

function SiteCard({ site, orgId }: { site: any, orgId: string }) {
    const [openCheckpoint, setOpenCheckpoint] = useState(false);
    const [viewQr, setViewQr] = useState<string | null>(null); // QR content to view
    const [deleting, startDelete] = useTransition();

    const handleDelete = () => {
        if (!confirm("Delete this site and all its checkpoints?")) return;
        startDelete(async () => {
            await deleteSite(orgId, site.id);
            toast({ title: "Site deleted" });
        });
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    {site.name}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={handleDelete} disabled={deleting}>
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-500" />
                </Button>
            </CardHeader>
            <CardContent>
                <div className="text-xs text-muted-foreground mb-4">
                    {site.address || "No address provided"}
                    {(site.latitude && site.longitude) && (
                        <div className="mt-1 font-mono">
                            {site.latitude.toFixed(4)}, {site.longitude.toFixed(4)} (r={site.radius}m)
                        </div>
                    )}
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">Checkpoints</span>
                        <Button variant="outline" size="xs" className="h-6 text-xs" onClick={() => setOpenCheckpoint(true)}>
                            <Plus className="h-3 w-3 mr-1" /> Add
                        </Button>
                    </div>

                    <div className="space-y-1">
                        {site.checkpoints?.map((cp: any) => (
                            <div key={cp.id} className="flex justify-between items-center bg-muted/50 p-2 rounded text-xs group">
                                <div className="flex items-center gap-2">
                                    <ScanLine className="h-3 w-3" />
                                    <span>{cp.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setViewQr(cp.qr_code)}>
                                        <QrIcon className="h-3 w-3 text-blue-500" />
                                    </Button>
                                    <code className="bg-background px-1 rounded text-[10px] text-muted-foreground hidden sm:inline-block">{cp.qr_code}</code>
                                    <DeleteCheckpointBtn orgId={orgId} id={cp.id} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
            <CreateCheckpointDialog open={openCheckpoint} setOpen={setOpenCheckpoint} orgId={orgId} siteId={site.id} />
            <Dialog open={!!viewQr} onOpenChange={(v) => !v && setViewQr(null)}>
                <DialogContent className="sm:max-w-sm flex flex-col items-center">
                    <DialogHeader>
                        <DialogTitle>Checkpoint QR</DialogTitle>
                        <DialogDescription className="text-center">Scan this code to verify location.</DialogDescription>
                    </DialogHeader>
                    <div className="p-4 bg-white rounded-lg shadow-sm">
                        {viewQr && <QRCode value={viewQr} size={200} />}
                    </div>
                    <div className="text-center">
                        <code className="bg-muted px-2 py-1 rounded text-sm">{viewQr}</code>
                    </div>
                    <Button variant="outline" onClick={() => window.print()}>Print / Save PDF</Button>
                </DialogContent>
            </Dialog>
        </Card>
    );
}

function DeleteCheckpointBtn({ orgId, id }: { orgId: string, id: string }) {
    const [pending, start] = useTransition();
    return (
        <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => start(() => deleteCheckpoint(orgId, id))}
        >
            <Trash2 className="h-3 w-3 text-red-500" />
        </Button>
    )
}

function CreateSiteDialog({ open, setOpen, orgId }: { open: boolean, setOpen: (v: boolean) => void, orgId: string }) {
    const [loading, startTransition] = useTransition();
    const [name, setName] = useState("");
    const [address, setAddress] = useState("");
    const [radius, setRadius] = useState("100");

    const handleCreate = () => {
        startTransition(async () => {
            try {
                await createSite(orgId, { name, address, radius: parseInt(radius) });
                setOpen(false);
                setName("");
                setAddress("");
                toast({ title: "Site created" });
            } catch (e: any) {
                toast({ title: "Error", description: e.message, variant: "destructive" });
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
                <DialogHeader><DialogTitle>Add New Site</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Site Name</Label>
                        <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Main Warehouse" />
                    </div>
                    <div className="space-y-2">
                        <Label>Address</Label>
                        <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Industrial Park" />
                    </div>
                    <div className="space-y-2">
                        <Label>Geofence Radius (meters)</Label>
                        <Input type="number" value={radius} onChange={e => setRadius(e.target.value)} />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleCreate} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function CreateCheckpointDialog({ open, setOpen, orgId, siteId }: { open: boolean, setOpen: (v: boolean) => void, orgId: string, siteId: string }) {
    const [loading, startTransition] = useTransition();
    const [name, setName] = useState("");

    const handleCreate = () => {
        startTransition(async () => {
            try {
                await createCheckpoint(orgId, siteId, { name });
                setOpen(false);
                setName("");
                toast({ title: "Checkpoint created" });
            } catch (e: any) {
                toast({ title: "Error", description: e.message, variant: "destructive" });
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Checkpoint</DialogTitle>
                    <DialogDescription>A specific point that must be scanned.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Checkpoint Name</Label>
                        <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. North Gate" />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleCreate} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
