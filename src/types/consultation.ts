export interface ConsultationEmergencyContact {
	name: string
	relation: string
	number: string
}

export interface ConsultationPatient {
	id: string
	patientId: string
	name: string
	age: number
	gender: string
	phone: string
	phoneVerified: boolean
	email: string
	avatar: string
	dateOfBirth: string
	maritalStatus: string
	weight: string
	height: string
	bloodGroup: string
	address: string
	occupation: string
	emergencyContact: ConsultationEmergencyContact
	chronicDiseases: string[]
	allergies: string[]
	smokingStatus: string
	alcoholConsumption: string
	dietType: string
}

export interface ConsultationDoctor {
	name: string
	degree: string
	specialization: string
	clinicName: string
	clinicAddress: string
}

export interface VitalStat {
	id: string
	label: string
	value: string
	unit: string
	date: string
	bmiValue?: string
	bmiCategory?: string
}

export interface VitalReading {
	value: string
	time: string
	status: 'normal' | 'abnormal'
}

export interface VitalHistoryRow {
	id: string
	date: string
	cells: Record<string, string>
	cellStatus?: Record<string, 'normal' | 'abnormal'>
	hasDownload?: boolean
}
