export type FieldType = 'text' | 'phone' | 'email' | 'select' | 'date' | 'number' | 'readonly' | 'multi' // ← NEW: multi-value list (allergies, conditions etc.)

export interface ProfileFieldConfig {
	key: string
	apiKey: string
	label: string
	type: FieldType
	placeholder?: string
	options?: string[]
	unit?: string
	verified?: boolean
	required?: boolean
	addLabel?: string // custom modal title e.g. "Add Allergies"
}

export interface TabConfig {
	tab: 'Personal' | 'Medical' | 'Life style'
	fields: ProfileFieldConfig[]
}

export const PROFILE_TABS: TabConfig[] = [
	{
		tab: 'Personal',
		fields: [
			{
				key: 'name',
				apiKey: 'full_name',
				label: 'Name',
				type: 'text',
				placeholder: 'Enter your full name',
				required: true,
			},
			{
				key: 'contactNumber',
				apiKey: 'phone_number',
				label: 'Contact Number',
				type: 'phone',
				placeholder: '+91 XXXXX XXXXX',
				verified: true,
			},
			{ key: 'email', apiKey: 'email', label: 'Email id', type: 'email', placeholder: 'example@email.com' },
			{
				key: 'gender',
				apiKey: 'gender',
				label: 'Gender',
				type: 'select',
				options: ['Male', 'Female', 'Non-binary', 'Prefer not to say'],
			},
			{
				key: 'dateOfBirth',
				apiKey: 'date_of_birth',
				label: 'Date of birth',
				type: 'date',
				placeholder: 'DD / MM / YYYY',
			},
			{
				key: 'bloodGroup',
				apiKey: 'blood_group',
				label: 'Blood group',
				type: 'select',
				options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
			},
			{
				key: 'maritalStatus',
				apiKey: 'marital_status',
				label: 'Marital status',
				type: 'select',
				options: ['Single', 'Married', 'Divorced', 'Widowed'],
			},
			{
				key: 'height',
				apiKey: 'height_cm',
				label: 'Height',
				type: 'number',
				placeholder: 'e.g. 170',
				unit: 'cm',
			},
			{ key: 'weight', apiKey: 'weight_kg', label: 'Weight', type: 'number', placeholder: 'e.g. 65', unit: 'kg' },
			{
				key: 'emergencyContact',
				apiKey: 'emergency_contact',
				label: 'Emergency contact',
				type: 'phone',
				placeholder: '+91 XXXXX XXXXX',
			},
			{ key: 'location', apiKey: 'location', label: 'Location', type: 'text', placeholder: 'City, State' },
		],
	},
	{
		tab: 'Medical',
		fields: [
			{
				key: 'allergies',
				apiKey: 'allergies',
				label: 'Allergies',
				type: 'multi',
				addLabel: 'Add Allergies',
				placeholder: 'Write your allergy',
			},
			// { key: "currentMedications",  apiKey: "current_medications",  label: "Current medications",  type: "multi", addLabel: "Add Medications",          placeholder: "Write your medicines" },
			{
				key: 'chronicConditions',
				apiKey: 'chronic_conditions',
				label: 'Chronic diseases',
				type: 'multi',
				addLabel: 'Add Chronic diseases',
				placeholder: 'Write your medicines',
			},
			// { key: "pastSurgeries",       apiKey: "past_surgeries",       label: "Previous medical reports", type: "multi", addLabel: "Add Medical Reports",  placeholder: "Write your report" },
			// { key: "familyHistory",       apiKey: "family_history",       label: "Family history",       type: "multi", addLabel: "Add Family History",       placeholder: "e.g. Heart disease" },
			// { key: "disabilities",        apiKey: "disabilities",         label: "Disabilities",         type: "multi", addLabel: "Add Disabilities",         placeholder: "e.g. Visual impairment" },
		],
	},
	{
		tab: 'Life style',
		fields: [
			{
				key: 'smoking',
				apiKey: 'smoking_status',
				label: 'Smoking Habits',
				type: 'select',
				options: ['Never', 'Former smoker', 'Occasional', 'Regular'],
			},
			{
				key: 'alcohol',
				apiKey: 'alcohol_consumption',
				label: 'Alcohol Consumption',
				type: 'select',
				options: ['Never', 'Occasionally', 'Socially', 'Regularly'],
			},
			{
				key: 'exerciseFrequency',
				apiKey: 'exercise_frequency',
				label: 'Exercise frequency',
				type: 'select',
				options: ['Sedentary', '1-2 days/week', '3-4 days/week', '5+ days/week'],
			},
			{
				key: 'dietType',
				apiKey: 'diet_type',
				label: 'Food Preferences',
				type: 'select',
				options: ['Omnivore', 'Vegetarian', 'Vegan', 'Keto', 'Gluten-free'],
			},
			{
				key: 'sleepHours',
				apiKey: 'sleep_hours',
				label: 'Sleep hours',
				type: 'select',
				options: ['Less than 5', '5-6 hours', '7-8 hours', 'More than 8'],
			},
			{
				key: 'occupation',
				apiKey: 'occupation',
				label: 'Occupation',
				type: 'select',
				options: [
					'Student',
					'Doctor',
					'Engineer',
					'Teacher',
					' Nurse',
					'Business',
					'Farmer',
					'Housewife',
					'Self-employed',
					'Other',
				],
			},
		],
	},
]

// multi fields store values as JSON array string: '["Pet allergy","Dust"]'
export function getMultiValues(raw?: string): string[] {
	if (!raw) return []
	try {
		return JSON.parse(raw)
	} catch {
		return raw ? [raw] : []
	}
}

export function setMultiValues(values: string[]): string {
	return JSON.stringify(values)
}

export function buildApiPayload(data: Record<string, string>): Record<string, any> {
	const payload: Record<string, any> = {}
	PROFILE_TABS.forEach((tab) => {
		tab.fields.forEach((field) => {
			if (data[field.key]) {
				payload[field.apiKey] = field.type === 'multi' ? getMultiValues(data[field.key]) : data[field.key]
			}
		})
	})
	return payload
}
