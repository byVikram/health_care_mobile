// features/auth/roleDisplay.ts
//
// Presentation helpers for the three sign-up roles (Patient, Doctor, Healthcare provider = "ancillary") so the
// role screen, intro slides and register form agree on names and which design variant to use.

export type RoleVariant = 'patient' | 'doctor' | 'provider' | 'generic'

/** Provider kinds shown as chips on the role screen; `key` is the specialty stored/sent to the backend. */
export const PROVIDER_KINDS = [
	{ key: 'nursing-care', label: 'Nurse' },
	{ key: 'physiotherapy', label: 'Physiotherapist' },
	{ key: 'home-care', label: 'Care attendant' },
	{ key: 'rehab-care', label: 'Rehab therapist' },
] as const

// Role ids/labels (lower-case) that map to each variant. A role matching none of them is 'generic',
// never 'provider', so a new backend role cannot silently inherit the home-care flow.
const VARIANT_MATCH: Record<Exclude<RoleVariant, 'generic'>, string[]> = {
	patient: ['patient'],
	doctor: ['doctor'],
	provider: ['ancillary', 'healthcare provider', 'provider'],
}

export const roleVariant = (roleId?: string, roleLabel?: string): RoleVariant => {
	const id = (roleId ?? '').trim().toLowerCase()
	const label = (roleLabel ?? '').trim().toLowerCase()
	for (const variant of Object.keys(VARIANT_MATCH) as Exclude<RoleVariant, 'generic'>[]) {
		if (VARIANT_MATCH[variant].some((m) => m === id || m === label)) return variant
	}
	return 'generic'
}

/** "Patient", "Doctor", the chosen provider kind ("Nurse"...) / "Healthcare provider", or the backend's own label. */
export const roleDisplayName = (roleId?: string, roleLabel?: string, specialty?: string) => {
	const variant = roleVariant(roleId, roleLabel)
	if (variant === 'patient') return 'Patient'
	if (variant === 'doctor') return 'Doctor'
	if (variant === 'generic') return roleLabel?.trim() || roleId?.trim() || 'Member'
	return PROVIDER_KINDS.find((k) => k.key === specialty)?.label ?? 'Healthcare provider'
}
