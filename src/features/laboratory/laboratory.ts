export interface LaboratoryItem {
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
	home_collection_available: boolean
	is_24_x_7: boolean
	is_nabl_accredited: boolean
	emergency_tests_available: boolean
	image?: any
}
