import { FormElementInstance } from "@/components/form-builder/types";

function generateId() {
    return Math.floor(Math.random() * 10001).toString();
}

/**
 * Templates for quick form creation.
 * We use functions to ensure unique IDs for elements each time a template is used.
 */
export const FORM_TEMPLATES = {
    BLANK: {
        label: "Blank Form",
        role: "General",
        description: "Start from scratch with an empty canvas.",
        content: () => [],
    },
    SECURITY_PATROL: {
        label: "Security Patrol Report",
        role: "Security",
        description: "Standard guard tour report with checkpoint scanning.",
        content: (): FormElementInstance[] => [
            {
                id: generateId(),
                type: "TitleField",
                extraAttributes: { title: "Security Patrol Log" }
            },
            {
                id: generateId(),
                type: "ParagraphField",
                extraAttributes: { text: "Scan the checkpoint and report any issues." }
            },
            {
                id: generateId(),
                type: "SeparatorField"
            },
            {
                id: generateId(),
                type: "QRCodeField",
                extraAttributes: {
                    label: "Checkpoint Scan",
                    helperText: "Scan the QR code at the location.",
                    required: true
                }
            },
            {
                id: generateId(),
                type: "SelectField",
                extraAttributes: {
                    label: "Status",
                    helperText: "Is the area secure?",
                    required: true,
                    options: ["Secure", "Issue Found", "Maintenance Required", "Breach Detected"]
                }
            },
            {
                id: generateId(),
                type: "TextAreaField",
                extraAttributes: {
                    label: "Observations / Incident Details",
                    helperText: "Provide details if issues were found.",
                    required: false
                }
            }
        ]
    },
    WAREHOUSE_INVENTORY: {
        label: "Warehouse Stock Check",
        role: "Logistics",
        description: "Inventory cycle count using barcode scanning.",
        content: (): FormElementInstance[] => [
            {
                id: generateId(),
                type: "TitleField",
                extraAttributes: { title: "Inventory Count" }
            },
            {
                id: generateId(),
                type: "BarcodeField",
                extraAttributes: {
                    label: "Product Barcode",
                    helperText: "Scan the item UPC/EAN.",
                    required: true
                }
            },
            {
                id: generateId(),
                type: "NumberField",
                extraAttributes: {
                    label: "Quantity on Hand",
                    helperText: "Count the physical items.",
                    required: true
                }
            },
            {
                id: generateId(),
                type: "TextField",
                extraAttributes: {
                    label: "Bin Location",
                    helperText: "Verify the shelf/bin label.",
                    required: false
                }
            },
            {
                id: generateId(),
                type: "CheckboxField",
                extraAttributes: {
                    label: "Damaged?",
                    helperText: "Check if the item is damaged.",
                    required: false
                }
            }
        ]
    }
};
