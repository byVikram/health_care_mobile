// src/validation/authSchemas.ts
//
// Shared Zod schemas for authentication / registration forms.
// Field names and rules mirror the manual validation that previously
// existed inline in each form (see git history of RegisterForm.tsx,
// LoginPage.tsx and OtpForm.tsx) so behavior is preserved exactly.

import { z } from 'zod'

// 10-digit Indian mobile number starting with 6-9 (unchanged from the
// regex previously inlined in RegisterForm.tsx).
const MOBILE_REGEX = /^[6-9]\d{9}$/

export const registrationSchema = z.object({
	name: z.string().trim().min(1, 'Name is required'),
	email: z
		.string()
		.trim()
		.min(1, 'Email is required')
		.email('Invalid email'),
	mobile: z
		.string()
		.trim()
		.regex(MOBILE_REGEX, 'Enter valid 10-digit mobile number'),
})

export type RegistrationForm = z.infer<typeof registrationSchema>

// Login only ever required a non-empty contact number (see the
// `contactNumber.length > 0` guard previously inlined in LoginPage.tsx).
// Kept intentionally loose to avoid introducing a new, stricter
// business rule that didn't exist before.
export const loginSchema = z.object({
	contactNumber: z.string().trim().min(1, 'Enter your contact number'),
})

export type LoginForm = z.infer<typeof loginSchema>

const OTP_LENGTH = 6

export const otpSchema = z.object({
	otp: z
		.string()
		.trim()
		.length(OTP_LENGTH, `Please enter the complete ${OTP_LENGTH}-digit OTP`),
})

export type OtpFormValues = z.infer<typeof otpSchema>

/**
 * Runs a Zod object schema and returns field-level error messages keyed
 * by field name, so they can be mapped directly onto per-field
 * `errorText` props (e.g. on `AppInput`) without touching unrelated UI.
 */
export function getFieldErrors<T extends z.ZodTypeAny>(
	schema: T,
	values: unknown
): Record<string, string> {
	const result = schema.safeParse(values)
	if (result.success) return {}

	const errors: Record<string, string> = {}
	for (const issue of result.error.issues) {
		const key = issue.path.join('.')
		if (key && !errors[key]) {
			errors[key] = issue.message
		}
	}
	return errors
}
