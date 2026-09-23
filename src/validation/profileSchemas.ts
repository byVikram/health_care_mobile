// src/validation/profileSchemas.ts
//
// Shared Zod schemas for Provider Profile forms (Personal & Professional details).
// Follows the same pattern as authSchemas.ts and reuses getFieldErrors().

import { z } from 'zod'
import { getFieldErrors } from './authSchemas'

export { getFieldErrors }

// 10-digit Indian mobile number starting with 6-9
const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/
const DOB_REGEX = /^(\d{2}-\d{2}-\d{4}|\d{4}-\d{2}-\d{2})$/

export const personalDetailsSchema = z.object({
	name: z.string().trim().min(1, 'Full name is required'),
	location: z.string().trim().min(1, 'Location is required'),
	mobile: z
		.string()
		.trim()
		.min(1, 'Enter valid 10-digit mobile number')
		.regex(INDIAN_MOBILE_REGEX, 'Enter valid 10-digit mobile number'),
	email: z
		.string()
		.trim()
		.min(1, 'Email is required')
		.email('Please enter a valid email address'),
	gender: z.string().trim().min(1, 'Gender is required'),
	dob: z
		.string()
		.trim()
		.min(1, 'Date of birth is required')
		.regex(DOB_REGEX, 'Please enter DOB in DD-MM-YYYY format'),
	languages: z.array(z.string()).default([]),
	instagram: z.string().optional(),
	facebook: z.string().optional(),
	twitter: z.string().optional(),
})

export type PersonalDetailsSchemaValues = z.infer<typeof personalDetailsSchema>

export const createProfessionalDetailsSchema = (isHomeCare: boolean = false) =>
	z.object({
		qualification: z.string().trim().min(1, 'Highest qualification is required'),
		subspecialtyId: z.string().trim().min(1, 'Specialization is required'),
		experience: z.string().trim().min(1, 'Please select experience range'),
		nursingRegistrationNumber: isHomeCare
			? z.string().optional()
			: z.string().trim().min(1, 'Registration number is required'),
		stateNursingCouncil: z.string().optional(),
		registrationProof: z.string().optional(),
		qualificationProof: z.string().optional(),
		verificationStatus: z.string().optional(),
		about: z.string().optional(),
		geofenceRadius: z.string().trim().min(1, 'Please select work radius'),
	})

export type ProfessionalDetailsSchemaValues = z.infer<
	ReturnType<typeof createProfessionalDetailsSchema>
>
