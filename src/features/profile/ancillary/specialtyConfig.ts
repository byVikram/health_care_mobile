// Single source of truth for mapping an ancillary provider's specialty (as
// returned by the backend -- e.g. AncillaryProfileBackendResponse.specialty_id /
// specialty_name / specialty.label) to the internal specialty key used to drive
// role-specific behavior across the shared Provider Profile tabs
// (AncillaryProfileLayout, ProfessionalDetailsTab, CapabilitiesTab).
//
// This is the ONLY place these mappings should live. Previously the same two
// functions were copy-pasted verbatim into three separate tab files; keeping
// them here means adding a new ancillary specialty (e.g. "Medical Equipment")
// only requires updating this one file, plus that specialty's entries in
// ProfessionalDetailsTab's field-config map and CapabilitiesTab's SPECIALTY_META
// map -- never duplicating a whole profile screen.

export type AncillarySpecialtyKey =
	| 'home-care'
	| 'physiotherapy'
	| 'rehab-care'
	| 'nursing-care'
	| string

export function normalizeSpecialtyKey(key?: string | null): string {
	if (!key) return ''
	const lower = key.toLowerCase().trim()
	if (lower.includes('home')) return 'home-care'
	if (lower.includes('physio')) return 'physiotherapy'
	if (lower.includes('rehab')) return 'rehab-care'
	if (lower.includes('nurs')) return 'nursing-care'
	return lower
}

export function normalizeSpecialtyToLabel(key?: string | null): string {
	const normalizedKey = normalizeSpecialtyKey(key)
	if (normalizedKey === 'home-care') return 'Home Care'
	if (normalizedKey === 'physiotherapy') return 'Physiotherapy'
	if (normalizedKey === 'rehab-care') return 'Rehabilitation'
	if (normalizedKey === 'nursing-care') return 'Nursing Care'
	return key || ''
}

/**
 * Physiotherapist Profile Image URL — Single Source of Truth for Physiotherapy.
 * When the user provides a new URL (NEW_PHYSIOTHERAPIST_IMAGE_URL),
 * paste it here. If empty or missing, the system gracefully uses the bundled
 * physiotherapist asset (src/assets/physiotherapy/physiotherapist.png).
 */
export const NEW_PHYSIOTHERAPIST_IMAGE_URL = ''

