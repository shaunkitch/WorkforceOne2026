
"use client";

import { Button } from "@/components/ui/button";
import { Printer, Share2, Edit } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SubmissionActionsProps {
    submissionId: string;
    formId: string;
    orgId: string;
}

export default function SubmissionActions({ submissionId, formId, orgId }: SubmissionActionsProps) {
    const handleDownloadPdf = async () => {
        // Dynamically import html2pdf if available or load from CDN
        // For simplicity and robustness without npm install, we'll use a script tag approach or assume it's loaded, 
        // but better to just use window.print() now that we fixed the styles.
        // However, user specifically asked for "Save to PDF".
        // Let's stick to window.print() first with the FIX, as "Save as PDF" is a printer option.
        // If they really want a button that does it, we need a library.
        // Let's guide them to "Save as PDF" essentially via print, but label it better?
        // No, let's try to add the library script dynamically.

        try {
            const html2pdf = (await import("html2pdf.js")).default;
            const element = document.getElementById("submission-content");
            const opt = {
                margin: 10,
                filename: `submission-${submissionId}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            html2pdf().set(opt).from(element).save();
        } catch (e) {
            console.error("html2pdf not found, falling back to print", e);
            window.print();
        }
    };

    const handleShare = () => {
        const subject = `Submission ${submissionId}`;
        const body = `View submission details here: ${window.location.href}`;
        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    return (
        <div className="flex gap-2 print:hidden">
            <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
                <Printer className="w-4 h-4 mr-2" />
                Print / Save PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-2" />
                Share
            </Button>
            <Link href={`/dashboard/${orgId}/forms/${formId}/submissions/${submissionId}/edit`}>
                <Button variant="default" size="sm">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                </Button>
            </Link>
        </div>
    );
}
