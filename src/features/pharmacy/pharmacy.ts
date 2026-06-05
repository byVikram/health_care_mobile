// src/types/pharmacy.ts

export interface PharmacyItem {
	id: string
	name: string
	owner_name: string
	avatar_s3_key: string | null
	address: string
	city: string
	operating_hours: {
		open: string
		close: string
		[key: string]: string
	}
	home_delivery_available: boolean
	is_24_x_7: boolean
	emergency_medicine_available: boolean
    image?: any
}