import { getPatrols } from "@/lib/actions/security/patrols";
import { PatrolsList } from "@/components/security/patrols-list";
import { Separator } from "@/components/ui/separator";

export default async function PatrolsPage({ params }: { params: { orgId: string } }) {
    const patrols = await getPatrols(params.orgId);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Patrol History</h1>
                <p className="text-muted-foreground">View logs of all security patrols across your sites.</p>
            </div>
            <Separator />

            <PatrolsList patrols={patrols} orgId={params.orgId} />
        </div>
    );
}
