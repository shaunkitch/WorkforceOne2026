
"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import Papa from "papaparse";

interface CsvExportButtonProps {
    data: any[];
    filename: string;
    fieldLabels?: Record<string, string>;
}

export default function CsvExportButton({ data, filename, fieldLabels = {} }: CsvExportButtonProps) {
    const handleExport = () => {
        if (!data || data.length === 0) return;

        const flatData = data.map((sub) => {
            // Extract core metadata
            const { data: formData, profiles, clients, visits, location, ...rest } = sub;

            // Flatten useful metadata
            const metadata = {
                "Submission ID": rest.id,
                "Date": new Date(rest.submitted_at).toLocaleString(),
                "User": profiles?.full_name || "Unknown",
                "Client": clients?.name || "",
                "Visit": visits?.title || "",
                "Status": rest.status,
                "Location": location ? `${location.lat}, ${location.lng}` : "",
            };

            // Map form data keys to labels
            const mappedFormData: Record<string, any> = {};
            if (formData) {
                Object.keys(formData).forEach(key => {
                    const label = fieldLabels[key] || key;
                    // Handle images specially? Or just raw url? 
                    // CSV usually implies raw text.
                    mappedFormData[label] = formData[key];
                });
            }

            return {
                ...metadata,
                ...mappedFormData,
            };
        });

        const csv = Papa.unparse(flatData);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `${filename}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
        </Button>
    );
}
