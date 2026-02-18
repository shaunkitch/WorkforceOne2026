import { Suspense } from "react";
import { getSites } from "@/lib/actions/sites";
import { getCheckpoints } from "@/lib/actions/security/checkpoints";
import { CheckpointManager } from "@/components/security/checkpoint-manager";
import { Separator } from "@/components/ui/separator";

export default async function CheckpointsPage({
    params,
    searchParams
}: {
    params: { orgId: string },
    searchParams: { siteId?: string }
}) {
    const sites = await getSites(params.orgId);
    const selectedSiteId = searchParams.siteId || (sites.length > 0 ? sites[0].id : undefined);

    const checkpoints = selectedSiteId ? await getCheckpoints(selectedSiteId) : [];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Checkpoints</h1>
                <p className="text-muted-foreground">Create and manage QR code checkpoints for patrols.</p>
            </div>
            <Separator />

            <CheckpointManager
                sites={sites}
                checkpoints={checkpoints}
                selectedSiteId={selectedSiteId}
                organizationId={params.orgId}
            />
        </div>
    );
}
