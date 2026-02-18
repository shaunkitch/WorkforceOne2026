import { ClientDialog } from "@/components/clients/client-dialog";
import { getClients, deleteClient } from "@/lib/actions/clients";
import { Trash2, Users, MapPin, Phone, Mail, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export default async function ClientsPage({ params }: { params: { orgId: string } }) {
    const clients = await getClients(params.orgId);

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Clients</h2>
                <div className="flex items-center space-x-2">
                    <ClientDialog orgId={params.orgId} />
                </div>
            </div>

            <div className="flex items-center py-4">
                <Input
                    placeholder="Filter clients..."
                    className="max-w-sm"
                />
            </div>

            <div className="rounded-md border">
                <div className="relative w-full overflow-auto">
                    <table className="w-full caption-bottom text-sm">
                        <thead className="[&_tr]:border-b">
                            <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">#</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Name</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Contact</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Address</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="[&_tr:last-child]:border-0">
                            {clients.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="h-24 text-center">
                                        No clients found. Add clients to manage sales.
                                    </td>
                                </tr>
                            ) : (
                                clients.map((client) => (
                                    <tr key={client.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                        <td className="p-4 align-middle font-medium">
                                            {client.client_number}
                                        </td>
                                        <td className="p-4 align-middle font-medium">
                                            <div className="flex items-center">
                                                <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                                                <Link href={`/dashboard/${params.orgId}/clients/${client.id}`} className="hover:underline font-medium">
                                                    {client.name}
                                                </Link>
                                            </div>
                                        </td>
                                        <td className="p-4 align-middle">
                                            <div className="flex flex-col space-y-1">
                                                {client.email && (
                                                    <div className="flex items-center text-xs">
                                                        <Mail className="mr-1 h-3 w-3 text-muted-foreground" />
                                                        {client.email}
                                                    </div>
                                                )}
                                                {client.phone && (
                                                    <div className="flex items-center text-xs">
                                                        <Phone className="mr-1 h-3 w-3 text-muted-foreground" />
                                                        {client.phone}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4 align-middle">
                                            {client.address && (
                                                <div className="flex items-center text-xs max-w-[200px] truncate">
                                                    <MapPin className="mr-1 h-3 w-3 text-muted-foreground" />
                                                    {client.address}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4 align-middle">
                                            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80">
                                                {client.status}
                                            </span>
                                        </td>
                                        <td className="p-4 align-middle text-right">
                                            <div className="flex justify-end gap-2">
                                                <Link href={`/dashboard/${params.orgId}/clients/${client.id}`}>
                                                    <Button variant="outline" size="icon" title="View Details">
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                                <form action={async () => {
                                                    "use server"
                                                    await deleteClient(params.orgId, client.id)
                                                }}>
                                                    <Button variant="ghost" size="icon" type="submit">
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </form>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
