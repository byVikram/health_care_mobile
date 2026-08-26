// src/types/speciality.ts

export interface SpecialityItem {
	id: string
	label: string
	icon_key: string
}

export interface SpecialitiesResponse {
	success: boolean
	message: string
	data: SpecialityItem[]
}

// A symptom resolved to the specialty it maps to (via speciality_symptoms).
// `speciality_id` is the real specialty public_id -- always use this to
// navigate to doctor search, never hardcode or guess it from the label.
export interface SymptomItem {
	id: string
	label: string
	icon_key: string | null
	speciality_id: string | null
	speciality_label: string | null
}

export interface SymptomsResponse {
	success: boolean
	message: string
	data: SymptomItem[]
}
