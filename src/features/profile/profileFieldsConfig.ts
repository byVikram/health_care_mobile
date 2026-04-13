// ─── Field config — drives both UI rendering and API payload keys ───────────
// When your API is ready, map `apiKey` to the request body field name.

export type FieldType =
  | "text"        // free text input
  | "phone"       // numeric keyboard, phone formatting
  | "email"       // email keyboard
  | "select"      // bottom-sheet picker
  | "date"        // calendar date picker
  | "number"      // numeric input (height, weight)
  | "readonly";   // shown but not editable (e.g. verified contact)

export interface ProfileFieldConfig {
  key: string;            // local state key
  apiKey: string;         // API request body key — update when API is ready
  label: string;
  type: FieldType;
  placeholder?: string;
  options?: string[];     // for type === "select"
  unit?: string;          // suffix label e.g. "cm", "kg"
  verified?: boolean;     // show verified checkmark
  required?: boolean;
}

export interface TabConfig {
  tab: "Personal" | "Medical" | "Life style";
  fields: ProfileFieldConfig[];
}

export const PROFILE_TABS: TabConfig[] = [
  {
    tab: "Personal",
    fields: [
      {
        key: "name",
        apiKey: "full_name",
        label: "Name",
        type: "text",
        placeholder: "Enter your full name",
        required: true,
      },
      {
        key: "contactNumber",
        apiKey: "phone_number",
        label: "Contact Number",
        type: "phone",
        placeholder: "+91 XXXXX XXXXX",
        verified: true,
      },
      {
        key: "email",
        apiKey: "email",
        label: "Email id",
        type: "email",
        placeholder: "example@email.com",
      },
      {
        key: "gender",
        apiKey: "gender",
        label: "Gender",
        type: "select",
        options: ["Male", "Female", "Non-binary", "Prefer not to say"],
      },
      {
        key: "dateOfBirth",
        apiKey: "date_of_birth",
        label: "Date of birth",
        type: "date",
        placeholder: "DD / MM / YYYY",
      },
      {
        key: "bloodGroup",
        apiKey: "blood_group",
        label: "Blood group",
        type: "select",
        options: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
      },
      {
        key: "maritalStatus",
        apiKey: "marital_status",
        label: "Marital status",
        type: "select",
        options: ["Single", "Married", "Divorced", "Widowed"],
      },
      {
        key: "height",
        apiKey: "height_cm",
        label: "Height",
        type: "number",
        placeholder: "e.g. 170",
        unit: "cm",
      },
      {
        key: "weight",
        apiKey: "weight_kg",
        label: "Weight",
        type: "number",
        placeholder: "e.g. 65",
        unit: "kg",
      },
      {
        key: "emergencyContact",
        apiKey: "emergency_contact",
        label: "Emergency contact",
        type: "phone",
        placeholder: "+91 XXXXX XXXXX",
      },
      {
        key: "location",
        apiKey: "location",
        label: "Location",
        type: "text",
        placeholder: "City, State",
      },
    ],
  },
  {
    tab: "Medical",
    fields: [
      {
        key: "allergies",
        apiKey: "allergies",
        label: "Allergies",
        type: "text",
        placeholder: "e.g. Penicillin, Dust",
      },
      {
        key: "currentMedications",
        apiKey: "current_medications",
        label: "Current medications",
        type: "text",
        placeholder: "e.g. Metformin 500mg",
      },
      {
        key: "chronicConditions",
        apiKey: "chronic_conditions",
        label: "Chronic conditions",
        type: "text",
        placeholder: "e.g. Diabetes, Hypertension",
      },
      {
        key: "pastSurgeries",
        apiKey: "past_surgeries",
        label: "Past surgeries",
        type: "text",
        placeholder: "e.g. Appendectomy 2018",
      },
      {
        key: "familyHistory",
        apiKey: "family_history",
        label: "Family history",
        type: "text",
        placeholder: "e.g. Heart disease, Cancer",
      },
      {
        key: "disabilities",
        apiKey: "disabilities",
        label: "Disabilities",
        type: "text",
        placeholder: "e.g. Visual impairment",
      },
    ],
  },
  {
    tab: "Life style",
    fields: [
      {
        key: "smoking",
        apiKey: "smoking_status",
        label: "Smoking",
        type: "select",
        options: ["Never", "Former smoker", "Occasional", "Regular"],
      },
      {
        key: "alcohol",
        apiKey: "alcohol_consumption",
        label: "Alcohol",
        type: "select",
        options: ["Never", "Occasionally", "Socially", "Regularly"],
      },
      {
        key: "exerciseFrequency",
        apiKey: "exercise_frequency",
        label: "Exercise frequency",
        type: "select",
        options: ["Sedentary", "1-2 days/week", "3-4 days/week", "5+ days/week"],
      },
      {
        key: "dietType",
        apiKey: "diet_type",
        label: "Diet type",
        type: "select",
        options: ["Omnivore", "Vegetarian", "Vegan", "Keto", "Gluten-free"],
      },
      {
        key: "sleepHours",
        apiKey: "sleep_hours",
        label: "Sleep hours",
        type: "select",
        options: ["Less than 5", "5-6 hours", "7-8 hours", "More than 8"],
      },
      {
        key: "occupation",
        apiKey: "occupation",
        label: "Occupation",
        type: "text",
        placeholder: "e.g. Software Engineer",
      },
    ],
  },
];

// ── Helper: build API payload from local state ───────────────────────────────
// Call this before hitting your API endpoint.
export function buildApiPayload(data: Record<string, string>): Record<string, string> {
  const payload: Record<string, string> = {};
  PROFILE_TABS.forEach((tab) => {
    tab.fields.forEach((field) => {
      if (data[field.key]) {
        payload[field.apiKey] = data[field.key];
      }
    });
  });
  return payload;
}