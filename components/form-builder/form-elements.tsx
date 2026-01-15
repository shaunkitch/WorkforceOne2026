import { SpacerFieldFormElement } from "./fields/spacer-field";
import { TextFieldFormElement } from "./fields/text-field";
import { TitleFieldFormElement } from "./fields/title-field";
import { SubTitleFieldFormElement } from "./fields/sub-title-field";
import { ParagraphFieldFormElement } from "./fields/paragraph-field";
import { SeparatorFieldFormElement } from "./fields/separator-field";
import { NumberFieldFormElement } from "./fields/number-field";
import { TextAreaFieldFormElement } from "./fields/textarea-field";
import { DateFieldFormElement } from "./fields/date-field";
import { SelectFieldFormElement } from "./fields/select-field";
import { CheckboxFieldFormElement } from "./fields/checkbox-field";
import { LicenseFieldFormElement } from "./fields/license-field";
import { QRCodeFieldFormElement } from "./fields/qrcode-field";
import { BarcodeFieldFormElement } from "./fields/barcode-field";
import { FormElementsType } from "./types";

export const FormElements: FormElementsType = {
    TextField: TextFieldFormElement,
    TitleField: TitleFieldFormElement,
    SubTitleField: SubTitleFieldFormElement,
    ParagraphField: ParagraphFieldFormElement,
    SeparatorField: SeparatorFieldFormElement,
    SpacerField: SpacerFieldFormElement,
    NumberField: NumberFieldFormElement,
    TextAreaField: TextAreaFieldFormElement,
    DateField: DateFieldFormElement,
    SelectField: SelectFieldFormElement,
    CheckboxField: CheckboxFieldFormElement,
    LicenseField: LicenseFieldFormElement,
    QRCodeField: QRCodeFieldFormElement,
    BarcodeField: BarcodeFieldFormElement,
};
