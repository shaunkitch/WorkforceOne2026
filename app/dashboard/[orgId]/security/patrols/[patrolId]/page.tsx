import { getPatrol } from "@/lib/actions/security/patrols";
import { PatrolDetail } from "@/components/security/patrol-detail";
import { Separator } from "@/components/ui/separator";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function PatrolDetailPage({ params }: { params: { orgId: string, patrolId: string } }) {
    const patrol = await getPatrol(params.patrolId);

    if (!patrol) {
        return notFound();
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href={`/dashboard/${params.orgId}/security/patrols`}>
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Patrol Details</h1>
                    <p className="text-muted-foreground">
                        ID: {patrol.id}
                    </p>
                </div>
            </div>
            <Separator />

            <PatrolDetail patrol={patrol} />
        </div>
    );
}
