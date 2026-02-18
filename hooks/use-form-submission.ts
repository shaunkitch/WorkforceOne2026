"use client";

import { useState, useTransition, useCallback, useRef } from "react";
import { FormElementInstance } from "@/types/forms";
import { FormElements } from "@/components/forms/builder/FormElements";
import { toast } from "@/components/ui/use-toast";

type UseFormSubmissionProps = {
    content: FormElementInstance[];
    submitAction: (jsonContent: string) => Promise<{ success: boolean; error?: string }>;
    onSuccess?: () => void;
    preview?: boolean;
};

export function useFormSubmission({
    content,
    submitAction,
    onSuccess,
    preview = false,
}: UseFormSubmissionProps) {
    const formValues = useRef<{ [key: string]: string }>(
        content.reduce((acc, field) => {
            if (field.extraAttributes?.defaultValue !== undefined) {
                acc[field.id] = String(field.extraAttributes.defaultValue);
            }
            return acc;
        }, {} as { [key: string]: string })
    );
    const formErrors = useRef<{ [key: string]: boolean }>({});
    const [renderKey, setRenderKey] = useState(new Date().getTime());
    const [submitted, setSubmitted] = useState(false);
    const [pending, startTransition] = useTransition();

    const validateForm = useCallback(() => {
        formErrors.current = {};
        for (const field of content) {
            const actualValue = formValues.current[field.id] || "";
            const valid = FormElements[field.type].validate?.(field, actualValue);

            if (valid === false) {
                formErrors.current[field.id] = true;
            }
        }

        if (Object.keys(formErrors.current).length > 0) {
            return false;
        }

        return true;
    }, [content]);

    const submitValue = useCallback((key: string, value: string) => {
        formValues.current[key] = value;
    }, []);

    const submit = async () => {
        formErrors.current = {};
        const validForm = validateForm();
        if (!validForm) {
            setRenderKey(new Date().getTime());
            toast({
                title: "Error",
                description: "Please check the form for errors",
                variant: "destructive",
            });
            return;
        }

        if (preview) {
            toast({
                title: "Preview Mode",
                description: "Form is valid! Submission is disabled in preview.",
            });
            return;
        }

        try {
            const jsonContent = JSON.stringify(formValues.current);
            const result = await submitAction(jsonContent);

            if (result.success) {
                setSubmitted(true);
                onSuccess?.();
            } else {
                toast({
                    title: "Error",
                    description: result.error || "Something went wrong",
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Something went wrong",
                variant: "destructive",
            });
        }
    };

    const handleSubmit = () => {
        startTransition(submit);
    };

    return {
        submitValue,
        handleSubmit,
        isSubmitting: pending,
        isSubmitted: submitted,
        errors: formErrors.current,
        renderKey,
    };
}
