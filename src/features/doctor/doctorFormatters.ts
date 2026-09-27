// src/features/doctor/doctorFormatters.ts
//
// Doctor-domain display formatters shared across the doctor screens.

/** "Apollo Hospitals, Jayanagar" -> "Jayanagar clinic"; a name without a comma is returned as-is. */
export const shortClinic = (name?: string) => {
	if (!name) return 'Clinic'
	const parts = name.split(',')
	return parts.length > 1 ? `${parts[parts.length - 1].trim()} clinic` : name
}
