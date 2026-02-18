import { getFormSubmissions } from "@/lib/actions/forms/submissions";
import { getForm } from "@/lib/actions/forms";
import { formatDistance } from "date-fns";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import CsvExportButton from "@/components/submissions/CsvExportButton";
import { Eye } from "lucide-react";
import Link from "next/link";
import { FormElementInstance } from "@/types/forms";

export default async function SubmissionsPage({
    params,
}: {
    params: { orgId: string, formId: string };
}) {
    const submissions = await getFormSubmissions(params.formId);
    const form = await getForm(params.formId);

    const formContent = (typeof form.content === 'string'
        ? JSON.parse(form.content)
        : form.content) as FormElementInstance[];

    const fieldLabels: Record<string, string> = {};
    formContent.forEach(element => {
        fieldLabels[element.id] = element.extraAttributes?.label || element.extraAttributes?.title || element.id;
    });

    return (
        <div className="py-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Submissions for {form.title}</h2>
                <CsvExportButton
                    data={submissions}
                    filename={`${form.title}_submissions`}
                    fieldLabels={fieldLabels}
                />
            </div>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Submitted By</TableHead>
                            <TableHead>Context</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Content</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {submissions.map((submission: any) => {
                            const content = typeof submission.data === 'string'
                                ? JSON.parse(submission.data)
                                : submission.data || {};

                            const location = submission.location;
                            const mapUrl = location
                                ? `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`
                                : null;

                            return (
                                <TableRow key={submission.id}>
                                    <TableCell className="text-muted-foreground whitespace-nowrap">
                                        {formatDistance(new Date(submission.submitted_at || submission.created_at), new Date(), { addSuffix: true })}
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium">{submission.profiles?.full_name || 'Unknown User'}</div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            {submission.visits?.title && (
                                                <span className="font-medium text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded w-fit mb-1">
                                                    {submission.visits.title}
                                                </span>
                                            )}
                                            <span className="text-sm">{submission.clients?.name || '-'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {mapUrl ? (
                                            <a
                                                href={mapUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center text-blue-600 hover:underline text-xs"
                                            >
                                                View Map
                                            </a>
                                        ) : (
                                            <span className="text-muted-foreground text-xs">No location</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1 text-sm max-w-md">
                                            {Object.keys(content).slice(0, 3).map(key => {
                                                const value = content[key];
                                                const isImage = typeof value === 'string' && (value.startsWith('data:image') || value.startsWith('http'));
                                                const label = fieldLabels[key] || key;

                                                return (
                                                    <div key={key} className="grid grid-cols-[100px_1fr] gap-2">
                                                        <span className="font-semibold text-xs truncate text-muted-foreground" title={label}>{label}:</span>
                                                        <span className="truncate">
                                                            {isImage ? (
                                                                <img src={value} alt={label} className="h-6 w-6 object-cover rounded border bg-white" />
                                                            ) : (
                                                                String(value)
                                                            )}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                            {Object.keys(content).length > 3 && (
                                                <span className="text-xs text-muted-foreground italic">...and {Object.keys(content).length - 3} more fields</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Link href={`/dashboard/${params.orgId}/forms/${params.formId}/submissions/${submission.id}`}>
                                            <Button variant="ghost" size="icon">
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {submissions.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    No results.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
