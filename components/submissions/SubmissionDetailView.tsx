
"use client";

import React, { useState } from "react";
import { FormElementInstance } from "@/types/forms";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import Image from "next/image";
import { format } from "date-fns";

interface SubmissionDetailViewProps {
    formContent: FormElementInstance[];
    submissionData: Record<string, any>;
}

export default function SubmissionDetailView({ formContent, submissionData }: SubmissionDetailViewProps) {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    // Filter out layout elements (Separators, Spacers, Titles) if desired, 
    // or keep them for structure. Titles/Subtitles are good for context.
    // We definitely want to skip buttons if any are in the form content (usually not in data).

    return (
        <div className="space-y-6 print:space-y-0 print:grid print:grid-cols-2 print:gap-x-6 print:gap-y-4">
            {formContent.map((element) => {
                const value = submissionData[element.id] || submissionData[element.extraAttributes?.label || ""];
                const fieldValue = submissionData[element.id];

                // Determine grid span for print
                let colSpan = "print:col-span-1";
                const fullWidthTypes = ["TitleField", "SubTitleField", "ParagraphField", "TextAreaField", "ImageUploadField", "SignatureField", "LocationField"];
                if (fullWidthTypes.includes(element.type)) {
                    colSpan = "print:col-span-2";
                }

                switch (element.type) {
                    case "TextField":
                    case "NumberField":
                    case "TextAreaField":
                    case "DateField":
                    case "SelectField":
                    case "CheckboxField":
                    case "LocationField":
                    case "BarcodeField":
                        return (
                            <div key={element.id} className={`border-b pb-4 break-inside-avoid print:border-none print:pb-0 ${colSpan}`}>
                                <h4 className="font-semibold text-sm text-muted-foreground mb-1 print:text-black print:font-bold">
                                    {element.extraAttributes?.label}
                                </h4>
                                <p className="text-base whitespace-pre-wrap print:text-sm">
                                    {element.type === "CheckboxField"
                                        ? (fieldValue ? "Checked" : "Unchecked")
                                        : (fieldValue || "-")
                                    }
                                </p>
                            </div>
                        );
                    case "ImageUploadField":
                    case "SignatureField":
                        // fieldValue should be a base64 string or URL
                        if (!fieldValue) return null;
                        const isSignature = element.type === "SignatureField";
                        return (
                            <div key={element.id} className={`border-b pb-4 break-inside-avoid print:border-none print:pb-2 ${colSpan}`}>
                                <h4 className="font-semibold text-sm text-muted-foreground mb-1 print:text-black">
                                    {element.extraAttributes?.label}
                                </h4>
                                <div className="mt-2">
                                    {Array.isArray(fieldValue) ? (
                                        <div className="flex flex-wrap gap-2">
                                            {fieldValue.map((url, idx) => (
                                                <div
                                                    key={idx}
                                                    className="relative w-32 h-32 cursor-pointer border rounded overflow-hidden hover:opacity-90 transition print:w-24 print:h-24"
                                                    onClick={() => setSelectedImage(url)}
                                                >
                                                    <Image src={url} alt={`Attachment ${idx}`} fill style={{ objectFit: "cover" }} />
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div
                                            className={`relative ${isSignature ? 'w-64 h-32' : 'w-32 h-32'} cursor-pointer border rounded overflow-hidden hover:opacity-90 transition bg-white print:border-slate-300`}
                                            onClick={() => setSelectedImage(fieldValue)}
                                        >
                                            <img
                                                src={fieldValue}
                                                alt="Attachment"
                                                className="w-full h-full object-contain"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    case "TitleField":
                        return <h2 key={element.id} className={`text-xl font-bold mt-6 mb-2 border-b-2 border-primary/20 pb-1 print:mt-4 print:mb-1 ${colSpan}`}>{element.extraAttributes?.title}</h2>;
                    case "SubTitleField":
                        return <h3 key={element.id} className={`text-lg font-semibold mt-4 mb-2 print:mt-2 print:mb-1 ${colSpan}`}>{element.extraAttributes?.title}</h3>;
                    case "ParagraphField":
                        return <p key={element.id} className={`text-muted-foreground mb-4 print:text-sm print:mb-2 ${colSpan}`}>{element.extraAttributes?.text}</p>;
                    default:
                        return null;
                }
            })}

            <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
                <DialogContent className="max-w-4xl w-full h-[80vh] flex items-center justify-center p-0 bg-transparent border-none shadow-none">
                    <div className="relative w-full h-full">
                        {selectedImage && (
                            <img
                                src={selectedImage}
                                alt="Full size"
                                className="w-full h-full object-contain"
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
