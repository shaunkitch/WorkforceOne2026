"use server";

import { createClient } from "@/lib/supabase/server";
import { getSites } from "@/lib/actions/sites";
import { SitesClient } from "./client";

export default async function SitesPage({ params }: { params: { orgId: string } }) {
    const sites = await getSites(params.orgId);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Sites & Locations</h2>
                <p className="text-muted-foreground">Manage physical locations, geofences, and patrol checkpoints.</p>
            </div>
            <SitesClient orgId={params.orgId} initialSites={sites} />
        </div>
    );
}
