"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Site } from "@/lib/actions/sites";
import { Checkpoint } from "@/lib/actions/security/checkpoints";
import { AddCheckpointDialog } from "./add-checkpoint-dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QrCode, Trash2 } from "lucide-react";

interface CheckpointManagerProps {
    sites: Site[];
    checkpoints: Checkpoint[];
    selectedSiteId?: string;
    organizationId: string;
}

export function CheckpointManager({ sites, checkpoints, selectedSiteId, organizationId }: CheckpointManagerProps) {
    const router = useRouter();

    const handleSiteChange = (siteId: string) => {
        router.push(`/dashboard/${organizationId}/security/checkpoints?siteId=${siteId}`);
    };

    const handlePrintQr = () => {
        // TODO: Implement PDF generation or simple print page
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                <head>
                    <title>Checkpoint QR Codes</title>
                    <style>
                        body { font-family: sans-serif; padding: 20px; }
                        .qr-item { border: 1px solid #ccc; padding: 20px; text-align: center; margin-bottom: 20px; page-break-inside: avoid; }
                        h1 { color: #333; }
                        .qr-code { width: 200px; height: 200px; margin: 0 auto; }
                    </style>
                     <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
                </head>
                <body>
                    <h1>Checkpoints for Site</h1>
                    <div id="checkpoints">
                        ${checkpoints.map(cp => `
                            <div class="qr-item">
                                <h2>${cp.name}</h2>
                                <p>${cp.description || ''}</p>
                                <div id="qr-${cp.id}" class="qr-code"></div>
                            </div>
                        `).join('')}
                    </div>
                    <script>
                        ${checkpoints.map(cp => `
                            new QRCode(document.getElementById("qr-${cp.id}"), {
                                text: "${cp.qr_code}",
                                width: 200,
                                height: 200
                            });
                        `).join('')}
                        window.onload = function() { window.print(); }
                    </script>
                </body>
                </html>
            `);
            printWindow.document.close();
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-4 p-4 bg-muted/50 rounded-lg border">
                <span className="text-sm font-medium">Select Site:</span>
                <Select value={selectedSiteId} onValueChange={handleSiteChange}>
                    <SelectTrigger className="w-[280px]">
                        <SelectValue placeholder="Select a site..." />
                    </SelectTrigger>
                    <SelectContent>
                        {sites.map((site) => (
                            <SelectItem key={site.id} value={site.id}>
                                {site.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {selectedSiteId ? (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold">Checkpoints ({checkpoints.length})</h2>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={handlePrintQr} disabled={checkpoints.length === 0}>
                                <QrCode className="w-4 h-4 mr-2" />
                                Print QR Codes
                            </Button>
                            <AddCheckpointDialog siteId={selectedSiteId} organizationId={organizationId} />
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {checkpoints.map((checkpoint) => (
                            <Card key={checkpoint.id}>
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between">
                                        <CardTitle className="text-lg">{checkpoint.name}</CardTitle>
                                        <QrCode className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                    <CardDescription>{checkpoint.description}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-xs font-mono bg-muted p-1 rounded">
                                        {checkpoint.qr_code}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        {checkpoints.length === 0 && (
                            <div className="col-span-full text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                                No checkpoints found using this site. Create one to get started.
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="text-center py-12 text-muted-foreground">
                    Please select a site to manage its checkpoints.
                </div>
            )}
        </div>
    );
}
