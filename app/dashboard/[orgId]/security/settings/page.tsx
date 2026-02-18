import { getSecurityUsers } from "@/lib/actions/security/settings";
import { SecurityUserList } from "@/components/security/security-user-list";
import { Separator } from "@/components/ui/separator";

export default async function SecuritySettingsPage({ params }: { params: { orgId: string } }) {
    const users = await getSecurityUsers(params.orgId);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Security Settings</h1>
                <p className="text-muted-foreground">Manage user access to security features (Patrols, Incidents).</p>
            </div>
            <Separator />

            <div className="rounded-lg border p-4">
                <h2 className="text-lg font-semibold mb-4">Security Personnel</h2>
                <p className="text-sm text-muted-foreground mb-4">
                    Enable the "Security Guard" role for users who need access to the mobile patrol features.
                </p>
                <SecurityUserList users={users} orgId={params.orgId} />
            </div>
        </div>
    );
}
