
import { getSubmission } from "@/lib/actions/forms/submissions";
import EditSubmissionComponent from "@/components/submissions/EditSubmissionComponent";
import { notFound } from "next/navigation";
import { FormElementInstance } from "@/types/forms";

function mergeDataIntoContent(content: FormElementInstance[], data: any): FormElementInstance[] {
    if (!data) return content;

    return content.map(element => {
        const value = data[element.id];
        return {
            ...element,
            extraAttributes: {
                ...element.extraAttributes,
                defaultValue: value !== undefined ? value : element.extraAttributes?.defaultValue
            }
        };
    });
}

export default async function EditSubmissionPage({
    params
}: {
    params: { submissionId: string }
}) {
    const submission = await getSubmission(params.submissionId);
    if (!submission) return notFound();

    let formContent = typeof submission.forms.content === 'string'
        ? JSON.parse(submission.forms.content)
        : submission.forms.content;

    const submissionData = typeof submission.data === 'string'
        ? JSON.parse(submission.data)
        : submission.data;

    // Merge data into content to set default values
    const contentWithDefaults = mergeDataIntoContent(formContent as FormElementInstance[], submissionData);

    return (
        <>
            <div className="mb-6">
                <h1 className="text-2xl font-bold">Edit {submission.forms.title} Submission</h1>
            </div>
            <EditSubmissionComponent
                submissionId={submission.id}
                content={contentWithDefaults}
            />
        </>
    );
}
