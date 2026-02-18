
"use client";

import React, { useCallback } from "react";
import { FormElementInstance } from "@/types/forms";
import { FormElements } from "@/components/forms/builder/FormElements";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { updateSubmission } from "@/lib/actions/forms/submissions";
import { useFormSubmission } from "@/hooks/use-form-submission";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/use-toast";

interface EditSubmissionComponentProps {
    submissionId: string;
    content: FormElementInstance[];
}

export default function EditSubmissionComponent({
    submissionId,
    content,
}: EditSubmissionComponentProps) {
    const router = useRouter();

    const {
        submitValue,
        handleSubmit,
        isSubmitting,
        errors,
        renderKey,
    } = useFormSubmission({
        content,
        submitAction: async (json) => {
            try {
                await updateSubmission(submissionId, json);
                toast({
                    title: "Success",
                    description: "Submission updated successfully",
                });
                router.refresh();
                router.back(); // Go back to detail view
                return { success: true };
            } catch (error) {
                toast({
                    title: "Error",
                    description: "Failed to update submission",
                    variant: "destructive",
                });
                console.error("EditSubmissionComponent: Error updating submission", error);
                throw error;
            }
        },
    });

    return (
        <div className="flex justify-center w-full h-full items-center p-8">
            <div
                key={renderKey}
                className="max-w-[800px] flex flex-col gap-4 flex-grow bg-background w-full p-8 overflow-y-auto border shadow-xl rounded"
            >
                <div className="mb-4">
                    <h2 className="text-xl font-bold">Edit Submission</h2>
                    <p className="text-sm text-muted-foreground">Modify the values below and save.</p>
                </div>

                {content.map((element) => {
                    const FormElement = FormElements[element.type].formComponent;
                    return (
                        <FormElement
                            key={element.id}
                            elementInstance={element}
                            submitValue={submitValue}
                            isInvalid={errors[element.id]}
                            defaultValue={element.extraAttributes?.defaultValue}
                        />
                    );
                })}
                <div className="flex justify-end gap-4 mt-8">
                    <Button variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                    >
                        {!isSubmitting && <>
                            <Save className="w-4 h-4 mr-2" />
                            Save Changes
                        </>}
                        {isSubmitting && <Loader2 className="animate-spin" />}
                    </Button>
                </div>
            </div>
        </div>
    );
}
