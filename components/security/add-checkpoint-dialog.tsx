"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { createCheckpoint } from "@/lib/actions/security/checkpoints";

const formSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters."),
    description: z.string().optional(),
    qrCode: z.string().min(1, "QR Code content is required"), // Could auto-generate
});

interface AddCheckpointDialogProps {
    siteId: string;
    organizationId: string;
}

export function AddCheckpointDialog({ siteId, organizationId }: AddCheckpointDialogProps) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();

    // Auto-generate a UUID or random string for QR code if empty? 
    // For now, let's just use a random string default.
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            description: "",
            qrCode: `CP-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        },
    });

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            await createCheckpoint({
                siteId,
                organizationId,
                name: values.name,
                description: values.description,
                qrCode: values.qrCode,
            });
            toast({
                title: "Success",
                description: "Checkpoint created successfully.",
            });
            setOpen(false);
            form.reset({
                name: "",
                description: "",
                qrCode: `CP-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
            });
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to create checkpoint.",
                variant: "destructive",
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    New Checkpoint
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add Checkpoint</DialogTitle>
                    <DialogDescription>
                        Create a new checkpoint for this site. A QR code string is auto-generated but you can customize it.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. Front Gate" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Instructions for the guard..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="qrCode"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>QR Code Value</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Create Checkpoint
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
