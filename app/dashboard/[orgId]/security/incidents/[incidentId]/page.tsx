import { getIncident } from "@/lib/actions/security/incidents";
import { IncidentDetail } from "@/components/security/incident-detail";
import { Separator } from "@/components/ui/separator";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function IncidentDetailPage({ params }: { params: { orgId: string, incidentId: string } }) {
    const incident = await getIncident(params.incidentId);

    if (!incident) {
        return notFound();
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href={`/dashboard/${params.orgId}/security/incidents`}>
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{incident.title}</h1>
                    <p className="text-muted-foreground">
                        ID: {incident.id}
                    </p>
                </div>
            </div>
            <Separator />

            <IncidentDetail incident={incident} />
        </div>
    );
}
