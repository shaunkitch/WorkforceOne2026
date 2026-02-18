import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { CreateFormButton } from "./create-form-button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { FileText, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function FormsPage({ params }: { params: { orgId: string } }) {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Forms</h2>
                    <p className="text-muted-foreground">
                        Manage your forms and submissions.
                    </p>
                </div>
                <CreateFormButton orgId={params.orgId} />
            </div>

            <Suspense fallback={<FormsListSkeleton />}>
                <FormsList orgId={params.orgId} />
            </Suspense>
        </div>
    );
}

async function FormsList({ orgId }: { orgId: string }) {
    const supabase = createClient();

    // Optimized fetch with joined stats
    const { data: forms, error } = await supabase
        .from("forms")
        .select(`
            *,
            form_statistics (
                submission_count
            )
        `)
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });

    if (error) {
        return <div className="text-red-500">Failed to load forms: {error.message}</div>;
    }

    if (!forms || forms.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-lg bg-slate-50">
                <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <FileText className="h-6 w-6 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium">No forms created yet</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                    Create your first form to get started.
                </p>
            </div>
        );
    }

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {forms.map((form: any) => (
                <Card key={form.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="truncate pr-4">{form.title}</CardTitle>
                            {form.is_published ? (
                                <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">
                                    Published
                                </span>
                            ) : (
                                <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 font-medium">
                                    Draft
                                </span>
                            )}
                        </div>
                        <CardDescription>
                            Created {formatDistanceToNow(new Date(form.created_at), { addSuffix: true })}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm text-muted-foreground">
                            {/* Handle nested object or fallback */}
                            {form.form_statistics?.submission_count || 0} submissions
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button variant="ghost" size="sm" asChild>
                            <Link href={`/dashboard/${orgId}/builder/${form.id}`}>
                                Edit
                            </Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                            <Link href={`/dashboard/${orgId}/forms/${form.id}`}>
                                View Details
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
    );
}

function FormsListSkeleton() {
    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
                <Card key={i}>
                    <CardHeader>
                        <Skeleton className="h-4 w-3/4 mb-2" />
                        <Skeleton className="h-3 w-1/2" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-4 w-full" />
                    </CardContent>
                    <CardFooter>
                        <Skeleton className="h-8 w-16" />
                    </CardFooter>
                </Card>
            ))}
        </div>
    );
}
