export const USER_ROLES = {
	DOCTOR: 'doctor',
	PATIENT: 'patient',
	PHARMACY: 'pharmacy',
	RADIOLOGY: 'radiology',
	LABORATORY: 'laboratory',
	ANCILLARY: 'ancillary',
	NURSE: 'nurse',
}

export const APPOINTMENT_STATUS = {
	CONFIRM: '3f9a2c8e-7b61-4d2a-9a3f-5c8e1b2d4f90',
	REJECT: 'a7d4e1c2-9f6b-4c83-b2e1-6f3a9d8c7b12',
}
export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES]

/**
 * The single "is this a patient?" check for the patient experience (Home header + dashboard, quick actions,
 * floating tab bar, drawer). Exactly the patient role -- staff roles (incl. 'nurse') and unknown/empty roles
 * never get the patient Home, whose endpoints are patient-only.
 */
export const isPatientRole = (role?: string | null) => role === USER_ROLES.PATIENT
