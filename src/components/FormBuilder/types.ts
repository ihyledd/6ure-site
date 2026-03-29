export type ApplicationFieldType =
  | "SHORT_TEXT"
  | "PARAGRAPH"
  | "NUMBER"
  | "AGE"
  | "EMAIL"
  | "PHONE"
  | "URL"
  | "DATE"
  | "TIME"
  | "TIME_RANGES"
  | "MULTIPLE_CHOICE"
  | "CHECKBOXES"
  | "MULTI_SELECT"
  | "DROPDOWN"
  | "LINEAR_SCALE"
  | "RATING"
  | "YES_NO"
  | "FILE_UPLOAD"
  | "TIMEZONE"
  | "PRONOUNS"
  | "SECTION_HEADER";

export type FieldOption = { value: string; label: string; hasOther?: boolean };

export type FieldValidation = {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  customError?: string;
};

export interface ApplicationFormFieldData {
  id: string;
  formId: string;
  sectionId: string | null;
  order: number;
  type: ApplicationFieldType;
  label: string;
  description: string | null;
  required: boolean;
  placeholder: string | null;
  options: FieldOption[] | null;
  validation: FieldValidation | null;
  autoFill: string | null;
  shuffleOptions: boolean;
  conditionalLogic: unknown;
  fileConfig: { maxSize?: number; allowedTypes?: string[] } | null;
  scaleConfig: { min?: number; max?: number } | null;
}

export interface ApplicationFormSectionData {
  id: string;
  formId: string;
  order: number;
  title: string | null;
  description: string | null;
  conditionalLogic: unknown;
  fields: ApplicationFormFieldData[];
}

export interface ApplicationFormData {
  id: string;
  title: string;
  description: string | null;
  confirmationMessage: string | null;
  isActive: boolean;
  minAge: number | null;
  limitType: "NONE" | "PER_FORM" | "GLOBAL";
  limitWindowDays: number;
  limitPerForm: number;
  maxResponses: number | null;
  theme: unknown;
  sections: ApplicationFormSectionData[];
  fields: ApplicationFormFieldData[];
}

export const FIELD_TYPE_LABELS: Record<ApplicationFieldType, string> = {
  SHORT_TEXT: "Short text",
  PARAGRAPH: "Paragraph",
  NUMBER: "Number",
  AGE: "Age",
  EMAIL: "Email",
  PHONE: "Phone",
  URL: "URL",
  DATE: "Date",
  TIME: "Time",
  TIME_RANGES: "Time ranges",
  MULTIPLE_CHOICE: "Multiple choice",
  CHECKBOXES: "Checkboxes",
  MULTI_SELECT: "Multi-select",
  DROPDOWN: "Dropdown",
  LINEAR_SCALE: "Linear scale",
  RATING: "Rating",
  YES_NO: "Yes/No",
  FILE_UPLOAD: "File upload",
  TIMEZONE: "Timezone",
  PRONOUNS: "Pronouns",
  SECTION_HEADER: "Section header",
};

export const CHOICE_FIELD_TYPES: ApplicationFieldType[] = [
  "MULTIPLE_CHOICE",
  "CHECKBOXES",
  "MULTI_SELECT",
  "DROPDOWN",
];
