import { getClient } from "@/lib/actions/clients";
import { getVisits, updateVisitStatus, deleteVisit } from "@/lib/actions/visits";
import { VisitDialog } from "@/components/visits/visit-dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, MapPin, Phone, Mail, CheckCircle, Trash2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function ClientDetailPage({ params }: { params: { orgId: string; clientId: string } }) {
    const client = await getClient(params.orgId, params.clientId);
    const visits = await getVisits(params.orgId, { clientId: params.clientId });

    if (!client) {
        notFound();
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center space-x-4 mb-4">
                <Link href={`/dashboard/${params.orgId}/clients`}>
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div className="flex-1">
                    <h2 className="text-3xl font-bold tracking-tight">{client.name}</h2>
                    <p className="text-muted-foreground">Client Details</p>
                </div>
            </div>

            <Tabs defaultValue="visits" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="visits">Visits</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Contact Details</CardTitle>
                                <Phone className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm font-medium">{client.phone || "No phone"}</div>
                                <div className="text-xs text-muted-foreground">{client.email || "No email"}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Location</CardTitle>
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm">{client.address || "No address provided"}</div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="visits" className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-semibold">Scheduled Visits</h3>
                        <VisitDialog orgId={params.orgId} defaultClientId={client.id} />
                    </div>

                    <Card>
                        <CardContent className="p-0">
                            {visits.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-8 text-center">
                                    <Calendar className="h-10 w-10 text-muted-foreground mb-3" />
                                    <p className="font-medium">No visits scheduled</p>
                                    <p className="text-sm text-muted-foreground mb-4">Schedule a visit used the button above.</p>
                                </div>
                            ) : (
                                <div className="relative w-full overflow-auto">
                                    <table className="w-full caption-bottom text-sm">
                                        <thead className="[&_tr]:border-b">
                                            <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Title</th>
                                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Date & Time</th>
                                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Assigned To</th>
                                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                                                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {visits.map((visit) => (
                                                <tr key={visit.id} className="border-b transition-colors hover:bg-muted/50">
                                                    <td className="p-4 align-middle font-medium">{visit.title}</td>
                                                    <td className="p-4 align-middle">
                                                        <div className="flex items-center">
                                                            <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                                                            {formatDate(visit.scheduled_at)}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 align-middle">
                                                        {visit.profiles?.full_name || "Unassigned"}
                                                    </td>
                                                    <td className="p-4 align-middle">
                                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold
                                                            ${visit.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                                visit.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                                            {visit.status}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 align-middle text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <VisitDialog orgId={params.orgId} visit={visit} defaultClientId={client.id} />

                                                            {visit.status === 'scheduled' && (
                                                                <form action={async () => {
                                                                    "use server"
                                                                    await updateVisitStatus(params.orgId, visit.id, 'completed')
                                                                }}>
                                                                    <Button variant="ghost" size="icon" type="submit" title="Mark Complete">
                                                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                                                    </Button>
                                                                </form>
                                                            )}

                                                            <form action={async () => {
                                                                "use server"
                                                                await deleteVisit(params.orgId, visit.id)
                                                            }}>
                                                                <Button variant="ghost" size="icon" type="submit" title="Delete">
                                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                                </Button>
                                                            </form>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
