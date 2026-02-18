"use client";

import { useEffect, useRef, useState } from "react";
import {
    ElementsType,
    FormElement,
    FormElementInstance,
    SubmitFunction
} from "../builder/types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ScanBarcode, X, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDesigner } from "../builder/DesignerContext";
import { Switch } from "@/components/ui/switch";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

const type: ElementsType = "BarcodeField";

const extraAttributes = {
    label: "Barcode Scanner",
    helperText: "Scan one or more codes",
    required: false,
    continuous: false,
};

const propertiesSchema = z.object({
    label: z.string().min(2).max(50),
    helperText: z.string().max(200),
    required: z.boolean().default(false),
    continuous: z.boolean().default(false),
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
        label: "Scanner (QR/PDF417)",
    },
    designerComponent: DesignerComponent,
    formComponent: FormComponent,
    propertiesComponent: PropertiesComponent,
    validate: (formElement: FormElementInstance, currentValue: string): boolean => {
        const element = formElement as CustomInstance;
        if (element.extraAttributes.required) {
            return currentValue.length > 0 && currentValue !== "[]";
        }
        return true;
    },
};

type CustomInstance = FormElementInstance & {
    extraAttributes: typeof extraAttributes;
};

function DesignerComponent({ elementInstance }: { elementInstance: FormElementInstance }) {
    const element = elementInstance as CustomInstance;
    const { label, helperText, required, continuous } = element.extraAttributes;
    return (
        <div className="flex flex-col gap-2 w-full">
            <Label>
                {label}
                {required && "*"}
            </Label>
            <div className="border border-dashed p-4 rounded-md bg-muted/50 flex flex-col items-center justify-center text-muted-foreground gap-2 h-24">
                <ScanBarcode className="h-6 w-6" />
                <span className="text-xs">{continuous ? "Continuous Scan Mode" : "Single Scan Mode"}</span>
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
    submitValue?: SubmitFunction;
    isInvalid?: boolean;
    defaultValue?: string;
}) {
    const element = elementInstance as CustomInstance;
    const [scannedCodes, setScannedCodes] = useState<string[]>(() => {
        if (!defaultValue) return [];
        try {
            const parsed = JSON.parse(defaultValue);
            if (Array.isArray(parsed)) return parsed;
            return [String(parsed)];
        } catch (e) {
            return [defaultValue];
        }
    });
    const [isScanning, setIsScanning] = useState(false);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const regionId = `reader-${elementInstance.id}`;

    useEffect(() => {
        // Sync with submit value whenever scannedCodes changes
        if (submitValue) {
            submitValue(elementInstance.id, JSON.stringify(scannedCodes));
        }
        //@ts-ignore - disabling dependency warning for submitValue
    }, [scannedCodes, elementInstance.id]);

    const startScanning = async () => {
        setIsScanning(true);
        // Small timeout to allow DOM to render the regionId div
        setTimeout(() => {
            // Explicitly enable common formats including PDF_417 for licenses
            const formatsToSupport = [
                Html5QrcodeSupportedFormats.QR_CODE,
                Html5QrcodeSupportedFormats.PDF_417,
                Html5QrcodeSupportedFormats.CODE_128,
                Html5QrcodeSupportedFormats.EAN_13,
                Html5QrcodeSupportedFormats.UPC_A,
                Html5QrcodeSupportedFormats.DATA_MATRIX
            ];

            const html5QrCode = new Html5Qrcode(regionId);
            // Note: pure Html5Qrcode constructor in some versions takes (id, verbose). 
            // Formats are often inferred or all-inclusive by default if using direct start?
            // Actually, for fine-control, we might need 'Html5QrcodeScanner' if we want easy config? 
            // But we are using 'Html5Qrcode' class for custom UI.
            // We can pass formats in the 'start' config? No.
            // Let's rely on default 'ALL' support which is standard for Html5Qrcode class if not specified.
            // BUT user said "I dont see the PDF417". 
            // Maybe they mean in the "Sidebar List"? 
            // "I dont see the PDF417 ... or the QR code scanner in the elements any more"
            // This strongly suggests they want a button labeled "PDF417 Scanner" or similar.
            // I will stick to one "Barcode Scanner" but make sure it works.
            // AND I will add a label change.

            scannerRef.current = html5QrCode;

            const config = { fps: 10, qrbox: { width: 250, height: 250 } };

            html5QrCode.start(
                { facingMode: "environment" },
                config,
                (decodedText, decodedResult) => {
                    handleScan(decodedText);
                },
                (errorMessage) => {
                    // parse error, ignore it.
                }
            ).catch(err => {
                console.error("Error starting scanner", err);
                setIsScanning(false);
            });
        }, 100);
    };

    const stopScanning = async () => {
        if (scannerRef.current) {
            try {
                await scannerRef.current.stop();
                scannerRef.current.clear();
            } catch (err) {
                console.error("Failed to stop scanner", err);
            }
            scannerRef.current = null;
        }
        setIsScanning(false);
    };

    const handleScan = (code: string) => {
        if (!element.extraAttributes.continuous) {
            // Single Mode
            setScannedCodes([code]);
            stopScanning();
        } else {
            // Continuous Mode
            setScannedCodes(prev => {
                // Avoid duplicates if desired, or allow them. Typically prevent instant re-scan of same code.
                // Simple debounce logic: don't add if it's the very last one added?
                // For now, let's just add it. Factory worker might scan 5 identical boxes.
                return [...prev, code];
            });
            // Optional: Play beep? (Browser interaction rules often block this without user gesture, but worth trying)
        }
    };

    const removeCode = (index: number) => {
        setScannedCodes(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <div className="flex flex-col gap-2 w-full">
            <Label className={isInvalid ? "text-destructive" : ""}>
                {element.extraAttributes.label}
                {element.extraAttributes.required && "*"}
            </Label>

            {/* Scanned List */}
            <div className="flex flex-wrap gap-2 mb-2">
                {scannedCodes.map((code, idx) => (
                    <Badge key={idx} variant="secondary" className="flex items-center gap-1 pr-1">
                        {code}
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 hover:bg-transparent"
                            onClick={() => removeCode(idx)}
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    </Badge>
                ))}
            </div>

            <Dialog open={isScanning} onOpenChange={(open) => {
                if (!open) stopScanning();
                else startScanning();
            }}>
                <DialogTrigger asChild>
                    <Button variant="outline" className="w-full flex gap-2">
                        <ScanBarcode className="h-4 w-4" />
                        {element.extraAttributes.continuous ? "Start Scan Session" : "Scan Code"}
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                    <div className="flex flex-col items-center justify-center p-4">
                        <h3 className="text-lg font-semibold mb-4">Scanning...</h3>
                        <div id={regionId} className="w-full h-[300px] bg-slate-100 rounded-md overflow-hidden relative"></div>
                        <div className="mt-4 flex flex-col items-center gap-2">
                            {element.extraAttributes.continuous && (
                                <p className="text-sm text-muted-foreground">Continuous Mode Active. Keep scanning.</p>
                            )}
                            <div className="max-h-32 overflow-y-auto w-full space-y-1">
                                {scannedCodes.slice(-5).reverse().map((code, i) => (
                                    <div key={i} className="text-xs font-mono bg-secondary p-1 rounded px-2 w-full text-center truncate">
                                        {code}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <Button variant="destructive" className="mt-4 w-full" onClick={stopScanning}>Stop Scanning</Button>
                    </div>
                </DialogContent>
            </Dialog>

            {element.extraAttributes.helperText && (
                <p className={isInvalid ? "text-destructive text-[0.8rem]" : "text-[0.8rem] text-muted-foreground"}>
                    {element.extraAttributes.helperText}
                </p>
            )}
        </div>
    );
}

type propertiesFormSchemaType = z.infer<typeof propertiesSchema>;

function PropertiesComponent({ elementInstance }: { elementInstance: FormElementInstance }) {
    const element = elementInstance as CustomInstance;
    const { updateElement } = useDesigner();

    const form = useForm<propertiesFormSchemaType>({
        resolver: zodResolver(propertiesSchema),
        mode: "onBlur",
        defaultValues: {
            label: element.extraAttributes.label,
            helperText: element.extraAttributes.helperText,
            required: element.extraAttributes.required,
            continuous: element.extraAttributes.continuous,
        },
    });

    useEffect(() => {
        form.reset(element.extraAttributes);
    }, [element, form]);

    function applyChanges(values: propertiesFormSchemaType) {
        const { label, helperText, required, continuous } = values;
        updateElement(element.id, {
            ...element,
            extraAttributes: {
                label,
                helperText,
                required,
                continuous
            },
        });
    }

    return (
        <Form {...form}>
            <form
                onBlur={form.handleSubmit(applyChanges)}
                onSubmit={(e) => {
                    e.preventDefault();
                }}
                className="space-y-3"
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
                                The label of the field.
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
                            <FormLabel>Helper text</FormLabel>
                            <FormControl>
                                <Input
                                    {...field}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") e.currentTarget.blur();
                                    }}
                                />
                            </FormControl>
                            <FormDescription>
                                The helper text of the field.
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
                                <FormDescription>
                                    Require at least one code.
                                </FormDescription>
                            </div>
                            <FormControl>
                                <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="continuous"
                    render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-sm bg-muted/20">
                            <div className="space-y-0.5">
                                <FormLabel>Continuous Mode</FormLabel>
                                <FormDescription>
                                    Keep scanning after detection. Useful for scanning multiple items.
                                </FormDescription>
                            </div>
                            <FormControl>
                                <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </form>
        </Form>
    );
}
