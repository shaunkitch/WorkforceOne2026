"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createForm } from "./actions";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { useState } from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { FORM_TEMPLATES } from "@/lib/constants/templates";

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending ? "Creating..." : "Create Form"}
        </Button>
    );
}

export function CreateFormButton({ orgId }: { orgId: string }) {
    const [open, setOpen] = useState(false);
    const [state, formAction] = useFormState(createForm, null);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Form
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create Form</DialogTitle>
                    <DialogDescription>
                        Create a new form to start collecting data.
                    </DialogDescription>
                </DialogHeader>
                <form action={formAction} className="grid gap-4 py-4">
                    <input type="hidden" name="orgId" value={orgId} />
                    <div className="grid gap-2">
                        <Label htmlFor="title">Title</Label>
                        <Input id="title" name="title" required />
                        {state?.errors?.title && (
                            <p className="text-sm text-red-500">{state.errors.title}</p>
                        )}
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" name="description" />
                    </div>
                    <div className="grid gap-2">
                        <Label>Template</Label>
                        <Select name="template" defaultValue="BLANK">
                            <SelectTrigger>
                                <SelectValue placeholder="Select a template" />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(FORM_TEMPLATES).map(([key, template]) => (
                                    <SelectItem key={key} value={key}>
                                        <div className="flex flex-col items-start text-left">
                                            <span className="font-medium">{template.label}</span>
                                            <span className="text-xs text-muted-foreground">{template.description}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {state?.error && (
                        <p className="text-sm text-red-500">{state.error}</p>
                    )}
                    <DialogFooter>
                        <SubmitButton />
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
