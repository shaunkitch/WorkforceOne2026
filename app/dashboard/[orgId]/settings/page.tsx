"use client";

import { useState, useEffect, useTransition } from "react";
import { getOrganization, updateOrganization, getOrganizationUsage } from "@/lib/actions/organizations";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { Loader2, Palette, Shield, User, HardDrive } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function OrganizationSettingsPage({ params }: { params: { orgId: string } }) {
    const [loading, setLoading] = useState(true);
    const [saving, startTransition] = useTransition();

    const [name, setName] = useState("");
    const [brandColor, setBrandColor] = useState("#000000");
    const [logoUrl, setLogoUrl] = useState("");
    const [faviconUrl, setFaviconUrl] = useState("");
    const [currency, setCurrency] = useState("USD");

    const [usage, setUsage] = useState<any>(null);

    // Mock Security Settings state
    const [enforce2FA, setEnforce2FA] = useState(false);
    const [requireLocation, setRequireLocation] = useState(false);
    const [allowedIPs, setAllowedIPs] = useState("");

    useEffect(() => {
        const load = async () => {
            const org = await getOrganization(params.orgId);
            if (org) {
                console.log("Loaded org:", org); // Debug logic
                setName(org.name);
                setBrandColor(org.brand_color || "#09090b");
                setLogoUrl(org.logo_url || "");
                setFaviconUrl((org as any).favicon_url || "");
                setCurrency(org.currency || "USD");
            }
            const stats = await getOrganizationUsage(params.orgId);
            setUsage(stats);
            setLoading(false);
        };
        load();
    }, [params.orgId]);

    const handleSave = () => {
        startTransition(async () => {
            try {
                await updateOrganization(params.orgId, {
                    name,
                    brandColor,
                    logoUrl,
                    faviconUrl,
                    currency
                });
                toast({ title: "Settings saved", description: "Organization settings updated successfully." });
            } catch (error: any) {
                toast({ title: "Error", description: error.message, variant: "destructive" });
            }
        });
    };


    if (loading) {
        return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Organization Settings</h2>
                <p className="text-muted-foreground">Manage your workspace preferences, branding and security.</p>
            </div>

            <div className="grid gap-6">
                {/* Usage Overview */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2"><HardDrive className="h-4 w-4" /> Usage & Limits</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-6 md:grid-cols-2">
                        <UsageItem
                            label="Forms Created"
                            value={usage?.forms?.used}
                            max={usage?.forms?.limit}
                        />
                        <UsageItem
                            label="Team Members"
                            value={usage?.members?.used}
                            max={usage?.members?.limit}
                        />
                        <UsageItem
                            label="Storage Used"
                            value={usage?.storage?.used}
                            max={usage?.storage?.limit}
                            format={(v) => (v / 1024 / 1024).toFixed(1) + " MB"}
                        />
                        <UsageItem
                            label="Monthly Submissions"
                            value={usage?.submissions?.used}
                            max={usage?.submissions?.limit}
                        />
                    </CardContent>
                </Card>

                {/* Branding & General */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2"><Palette className="h-4 w-4" /> Branding & General</CardTitle>
                        <CardDescription>Customize how your members see the workspace.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label>Organization Name</Label>
                            <Input value={name} onChange={e => setName(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Logo URL</Label>
                            <Input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://..." />
                        </div>
                        <div className="grid gap-2">
                            <Label>Default Currency</Label>
                            <Select value={currency} onValueChange={setCurrency}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Currency" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="USD">USD ($)</SelectItem>
                                    <SelectItem value="EUR">EUR (€)</SelectItem>
                                    <SelectItem value="GBP">GBP (£)</SelectItem>
                                    <SelectItem value="CAD">CAD ($)</SelectItem>
                                    <SelectItem value="AUD">AUD ($)</SelectItem>
                                    <SelectItem value="JPY">JPY (¥)</SelectItem>
                                    <SelectItem value="INR">INR (₹)</SelectItem>
                                    <SelectItem value="ZAR">ZAR (R)</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">Used for payroll and user rates.</p>
                        </div>
                        <div className="grid gap-2">
                            <Label>Organization Logo</Label>
                            <ImageUpload value={logoUrl} onChange={setLogoUrl} />
                            <p className="text-xs text-muted-foreground">Upload your company logo.</p>
                        </div>
                        <div className="grid gap-2">
                            <Label>Organization Favicon</Label>
                            <ImageUpload value={faviconUrl} onChange={setFaviconUrl} />
                            <p className="text-xs text-muted-foreground">Upload your website favicon.</p>
                        </div>
                        <div className="grid gap-2">
                            <Label>Brand Color</Label>
                            <div className="flex gap-2">
                                <Input type="color" className="w-12 h-10 p-1" value={brandColor} onChange={e => setBrandColor(e.target.value)} />
                                <Input value={brandColor} onChange={e => setBrandColor(e.target.value)} className="font-mono uppercase" />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="border-t px-6 py-4">
                        <Button onClick={handleSave} disabled={saving}>
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </CardFooter>
                </Card>

                {/* Security (Mock) */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2"><Shield className="h-4 w-4" /> Security & Policies</CardTitle>
                        <CardDescription>Control access and data requirements for your workforce.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between space-x-2">
                            <div className="space-y-0.5">
                                <Label>Enforce Two-Factor Authentication</Label>
                                <p className="text-xs text-muted-foreground">Require all members to use 2FA.</p>
                            </div>
                            <Switch checked={enforce2FA} onCheckedChange={setEnforce2FA} />
                        </div>
                        <div className="flex items-center justify-between space-x-2">
                            <div className="space-y-0.5">
                                <Label>Require Location on Submissions</Label>
                                <p className="text-xs text-muted-foreground">Force GPS capture for all mobile form submissions.</p>
                            </div>
                            <Switch checked={requireLocation} onCheckedChange={setRequireLocation} />
                        </div>
                        <div className="grid gap-2 pt-2">
                            <Label>Allowed IP Ranges</Label>
                            <Input value={allowedIPs} onChange={e => setAllowedIPs(e.target.value)} placeholder="e.g. 192.168.1.0/24" />
                            <p className="text-xs text-muted-foreground">Comma separated list of CIDR blocks allowed to access the dashboard.</p>
                        </div>
                    </CardContent>
                    <CardFooter className="border-t px-6 py-4 bg-muted/50">
                        <p className="text-xs text-muted-foreground">Security settings are auto-saved in this demo.</p>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}

function ImageUpload({ value, onChange }: { value: string, onChange: (val: string) => void }) {
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                onChange(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="flex flex-col gap-2">
            {!value && (
                <div className="border border-dashed p-4 rounded-md bg-muted/50 flex flex-col items-center justify-center text-muted-foreground gap-2 h-24 hover:bg-muted/70 transition-colors cursor-pointer relative">
                    <input
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={handleFileChange}
                    />
                    <HardDrive className="h-6 w-6" />
                    <span className="text-xs">Click to Upload</span>
                </div>
            )}

            {value && (
                <div className="relative h-32 w-32 rounded-md border overflow-hidden group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={value} alt="Preview" className="h-full w-full object-contain bg-slate-50" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onChange("")}
                        >
                            <div className="h-4 w-4">x</div>
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

function UsageItem({ label, value, max, format }: { label: string; value: number; max: number; format?: (v: number) => string }) {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));

    return (
        <div className="space-y-1">
            <div className="flex justify-between text-sm">
                <span className="font-medium text-muted-foreground">{label}</span>
                <span className="font-bold">{format ? format(value) : value} <span className="text-muted-foreground font-normal">/ {format ? format(max) : max}</span></span>
            </div>
            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${percentage}%` }} />
            </div>
        </div>
    )
}
