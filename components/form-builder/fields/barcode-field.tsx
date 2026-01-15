"use client";

import { ElementsType, FormElement, FormElementInstance } from "../types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useDesigner } from "../hooks/use-designer";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ScanBarcode } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useZxing } from "react-zxing";
import { BarcodeFormat } from "@zxing/library";

const type: ElementsType = "BarcodeField";

const extraAttributes = {
    label: "Barcode Scanner",
    helperText: "Scan a product barcode",
    required: false,
};

const propertiesSchema = z.object({
    label: z.string().min(2).max(50),
    helperText: z.string().max(200),
    required: z.boolean().default(false),
});

export const BarcodeFieldFormElement: FormElement = {
    type,
    construct: (id: string) => ({
        id,
        type,
        extraAttributes,
    }),
    designerBtnElement: {
        icon: ScanBarcode,
        label: "Barcode Scanner",
    },
    designerComponent: DesignerComponent,
    formComponent: FormComponent,
    propertiesComponent: PropertiesComponent,
    validate: (formElement: FormElementInstance, currentValue: string) => {
        const element = formElement as CustomInstance;
        if (element.extraAttributes.required) {
            return currentValue.length > 0;
        }
        return true;
    },
};

type CustomInstance = FormElementInstance & {
    extraAttributes: typeof extraAttributes;
};

function DesignerComponent({
    elementInstance,
}: {
    elementInstance: FormElementInstance;
}) {
    const element = elementInstance as CustomInstance;
    const { label, required, helperText } = element.extraAttributes;
    return (
        <div className="flex flex-col gap-2 w-full">
            <Label>
                {label}
                {required && "*"}
            </Label>
            <div className="flex items-center gap-2 p-4 border rounded-md border-dashed bg-muted/50 justify-center text-muted-foreground">
                <ScanBarcode className="h-8 w-8" />
                <span>Barcode Scanner</span>
            </div>
            {helperText && <p className="text-[0.8rem] text-muted-foreground">{helperText}</p>}
        </div>
    );
}

function FormComponent({
    elementInstance,
    submitValue,
    isInvalid,
    defaultValue,
}: {
    elementInstance: FormElementInstance;
    submitValue?: (key: string, value: string) => void;
    isInvalid?: boolean;
    defaultValue?: string;
}) {
    const element = elementInstance as CustomInstance;
    const [scannedData, setScannedData] = useState<string>(defaultValue || "");
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        setError(isInvalid === true);
    }, [isInvalid]);

    const { ref } = useZxing({
        onDecodeResult(result) {
            const text = result.getText();
            setScannedData(text);
            setIsScanning(false);
            if (submitValue) {
                const valid = BarcodeFieldFormElement.validate(element, text);
                setError(!valid);
                submitValue(element.id, text);
            }
        },
        onError(error) {
            // console.error(error);
        },
        constraints: {
            video: { facingMode: "environment" }
        },
        // Support common 1D barcodes
        hints: new Map([
            ["POSSIBLE_FORMATS", [
                BarcodeFormat.EAN_13,
                BarcodeFormat.EAN_8,
                BarcodeFormat.CODE_128,
                BarcodeFormat.CODE_39,
                BarcodeFormat.UPC_A,
                BarcodeFormat.UPC_E
            ]]
        ])
    });

    const { label, required, helperText } = element.extraAttributes;

    return (
        <div className="flex flex-col gap-2 w-full">
            <Label className={cn(error && "text-red-500")}>
                {label}
                {required && "*"}
            </Label>

            <div className={`p-4 border rounded-md ${error ? "border-red-500" : "border-border"} bg-background`}>
                {isScanning ? (
                    <div className="relative aspect-square w-full max-w-[300px] mx-auto overflow-hidden rounded-md bg-black">
                        <video ref={ref} className="h-full w-full object-cover" />
                        <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2 z-10"
                            onClick={() => setIsScanning(false)}
                        >
                            Cancel
                        </Button>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-48 h-32 border-2 border-red-500/50 rounded-lg"></div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {scannedData ? (
                            <div className="bg-muted p-2 rounded text-sm break-all font-mono">
                                {scannedData}
                            </div>
                        ) : (
                            <div className="text-sm text-muted-foreground text-center py-4">
                                No barcode scanned yet
                            </div>
                        )}
                        <Button type="button" onClick={() => setIsScanning(true)} variant="outline" className="w-full gap-2">
                            <ScanBarcode className="h-4 w-4" />
                            {scannedData ? "Rescan Barcode" : "Scan Barcode"}
                        </Button>
                    </div>
                )}
            </div>

            {helperText && (
                <p className={cn("text-muted-foreground text-[0.8rem]", error && "text-red-500")}>{helperText}</p>
            )}
        </div>
    );
}

type propertiesFormSchemaType = z.infer<typeof propertiesSchema>;

function PropertiesComponent({
    elementInstance,
}: {
    elementInstance: FormElementInstance;
}) {
    const element = elementInstance as CustomInstance;
    const { updateElement } = useDesigner();

    const form = useForm<propertiesFormSchemaType>({
        resolver: zodResolver(propertiesSchema) as any,
        mode: "onBlur",
        defaultValues: {
            label: element.extraAttributes.label,
            helperText: element.extraAttributes.helperText,
            required: element.extraAttributes.required,
        },
    });

    useEffect(() => {
        form.reset(element.extraAttributes);
    }, [element, form]);

    function applyChanges(values: propertiesFormSchemaType) {
        const { label, helperText, required } = values;
        updateElement(element.id, {
            ...element,
            extraAttributes: {
                label,
                helperText,
                required,
            },
        });
    }

    return (
        <Form {...form}>
            <form
                onBlur={form.handleSubmit(applyChanges)}
                className="space-y-3"
                onSubmit={(e) => {
                    e.preventDefault();
                }}
            >
                <FormField
                    control={form.control}
                    name="label"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Label</FormLabel>
                            <FormControl>
                                <Input
                                    {...field}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") e.currentTarget.blur();
                                    }}
                                />
                            </FormControl>
                            <FormDescription>
                                The label of the field. <br /> It will be displayed above the field.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="helperText"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>HelperText</FormLabel>
                            <FormControl>
                                <Input
                                    {...field}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") e.currentTarget.blur();
                                    }}
                                />
                            </FormControl>
                            <FormDescription>
                                The helper text of the field. <br />
                                It will be displayed below the field.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="required"
                    render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                                <FormLabel>Required</FormLabel>
                            </div>
                            <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                        </FormItem>
                    )}
                />
            </form>
        </Form>
    );
}
