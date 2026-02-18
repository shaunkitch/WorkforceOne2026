import { getIncidents } from "@/lib/actions/security/incidents";
import { IncidentsList } from "@/components/security/incidents-list";
import { Separator } from "@/components/ui/separator";

export default async function IncidentsPage({ params }: { params: { orgId: string } }) {
    const incidents = await getIncidents(params.orgId);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Incidents</h1>
                <p className="text-muted-foreground">Manage and resolve security incidents reported by guards.</p>
            </div>
            <Separator />

            <IncidentsList incidents={incidents} orgId={params.orgId} />
        </div>
    );
}
