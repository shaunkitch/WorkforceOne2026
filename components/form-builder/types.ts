import { ReactNode } from "react";

export type FormElementType =
    | "TextField"
    | "TitleField"
    | "SubTitleField"
    | "ParagraphField"
    | "SeparatorField"
    | "SpacerField"
    | "NumberField"
    | "TextAreaField"
    | "DateField"
    | "SelectField"
    | "CheckboxField"
    | "LicenseField"
    | "LicenseField"
    | "QRCodeField"
    | "BarcodeField";

export type FormElement = {
    type: FormElementType;
    construct: (id: string) => FormElementInstance;
    designerBtnElement: {
        icon: React.ElementType;
        label: string;
    };
    designerComponent: React.FC<{
        elementInstance: FormElementInstance;
    }>;
    formComponent: React.FC<{
        elementInstance: FormElementInstance;
        submitValue?: (key: string, value: string) => void;
        isInvalid?: boolean;
        defaultValue?: string;
    }>;
    propertiesComponent: React.FC<{
        elementInstance: FormElementInstance;
    }>;
    validate: (formElement: FormElementInstance, currentValue: string) => boolean;
};

export type FormElementInstance = {
    id: string;
    type: FormElementType;
    extraAttributes?: Record<string, any>;
};

export type DesignerContextType = {
    elements: FormElementInstance[];
    setElements: React.Dispatch<React.SetStateAction<FormElementInstance[]>>;
    addElement: (index: number, element: FormElementInstance) => void;
    removeElement: (id: string) => void;

    selectedElement: FormElementInstance | null;
    setSelectedElement: React.Dispatch<React.SetStateAction<FormElementInstance | null>>;

    updateElement: (id: string, element: FormElementInstance) => void;
};

export type ElementsType = FormElementType;

export type FormElementsType = {
    [key in ElementsType]: FormElement;
};
