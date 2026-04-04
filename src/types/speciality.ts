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
