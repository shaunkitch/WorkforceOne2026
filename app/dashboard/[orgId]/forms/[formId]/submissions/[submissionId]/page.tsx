
import { getSubmission } from "@/lib/actions/forms/submissions";
import SubmissionDetailView from "@/components/submissions/SubmissionDetailView";
import SubmissionActions from "@/components/submissions/SubmissionActions";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { FormElementInstance } from "@/types/forms";

import { getOrganization } from "@/lib/actions/organizations";

export default async function SubmissionDetailPage({
    params
}: {
    params: { orgId: string, formId: string, submissionId: string }
}) {
    const submission = await getSubmission(params.submissionId);
    const organization = await getOrganization(params.orgId);

    if (!submission) return notFound();

    // Check if forms relation exists
    if (!submission.forms) {
        console.error(`Submission ${submission.id} has no related form data`);
        return (
            <div className="p-8 text-center">
                <h1 className="text-2xl font-bold text-red-600">Error Loading Submission</h1>
                <p className="text-gray-600">The form definition for this submission could not be found.</p>
            </div>
        );
    }

    const formContent = typeof submission.forms.content === 'string'
        ? JSON.parse(submission.forms.content)
        : submission.forms.content;

    const submissionData = typeof submission.data === 'string'
        ? JSON.parse(submission.data)
        : submission.data;

    return (
        <div id="submission-content" className="py-8 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-start mb-8 print:hidden">
                <div>
                    <h1 className="text-3xl font-bold">{submission.forms.title} Submission</h1>
                    <p className="text-muted-foreground">
                        ID: {submission.id}
                    </p>
                </div>
                <SubmissionActions
                    submissionId={submission.id}
                    formId={params.formId}
                    orgId={params.orgId}
                />
            </div>

            {/* Print Header (Visible only when printing) */}
            <div className="hidden print:flex flex-col mb-8 border-b pb-4">
                <div className="flex justify-between items-center mb-4">
                    {organization.logo_url && (
                        <img
                            src={organization.logo_url}
                            alt={organization.name}
                            className="h-12 object-contain"
                        />
                    )}
                    <h1 className="text-2xl font-bold">{organization.name}</h1>
                </div>
                <div className="flex justify-between items-end">
                    <div>
                        <h2 className="text-xl font-semibold">{submission.forms.title}</h2>
                        <span className="text-sm text-muted-foreground">Submission #{submission.id.substring(0, 8)}</span>
                    </div>
                    <div className="text-right">
                        <p className="text-sm">Submitted on {format(new Date(submission.submitted_at), "PPP p")}</p>
                    </div>
                </div>
            </div>

            {/* Metadata Card */}
            <div className="bg-slate-50 p-6 rounded-lg border mb-8 grid grid-cols-2 md:grid-cols-4 gap-4 print:bg-transparent print:border-none print:p-0">
                <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Submitted By</span>
                    <p className="font-medium">{submission.profiles?.full_name}</p>
                </div>
                <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Date</span>
                    <p className="font-medium">{format(new Date(submission.submitted_at), "PPP p")}</p>
                </div>
                <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Client</span>
                    <p className="font-medium">{submission.clients?.name || "-"}</p>
                </div>
                <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Visit</span>
                    <p className="font-medium">{submission.visits?.title || "-"}</p>
                </div>
            </div>

            {/* Form Data */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold border-b pb-2 mb-4 print:hidden">Submission Data</h2>
                <SubmissionDetailView
                    formContent={formContent as FormElementInstance[]}
                    submissionData={submissionData}
                />
            </div>
        </div>
    )
}
