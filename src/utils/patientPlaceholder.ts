/** Placeholder/fallback patient names that must never be treated as a real,
 *  bookable patient identity — matches the blocklist already enforced in
 *  Ancillary's booking flow (`BookingDetailsPage.tsx`, staff verification
 *  screens, etc.) so patient-identity handling is consistent everywhere a
 *  booking is made, not just in Nursing. */
export const PLACEHOLDER_PATIENT_NAMES = [
	'Patient Account Holder',
	'John Doe',
	'Eleanor Vance',
	'Patient Recipient',
	'Patient',
]

export function isPlaceholderPatientName(name: string | null | undefined): boolean {
	if (!name || typeof name !== 'string') return true
	return PLACEHOLDER_PATIENT_NAMES.includes(name.trim())
}
