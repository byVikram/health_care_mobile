// features/auth/roleDisplay.ts
//
// Presentation helpers for the three sign-up roles (Patient, Doctor, Healthcare provider = "ancillary") so the
// role screen, intro slides and register form agree on names and which design variant to use.

export type RoleVariant = 'patient' | 'doctor' | 'provider'

/** Provider kinds shown as chips on the role screen; `key` is the specialty stored/sent to the backend. */
export const PROVIDER_KINDS = [
	{ key: 'nursing-care', label: 'Nurse' },
	{ key: 'physiotherapy', label: 'Physiotherapist' },
	{ key: 'home-care', label: 'Care attendant' },
	{ key: 'rehab-care', label: 'Rehab therapist' },
] as const

export const roleVariant = (roleId?: string, roleLabel?: string): RoleVariant => {
	const id = (roleId ?? '').toLowerCase()
	const label = (roleLabel ?? '').toLowerCase()
	if (id === 'patient' || label === 'patient') return 'patient'
	if (id === 'doctor' || label === 'doctor') return 'doctor'
	return 'provider'
}

/** "Patient", "Doctor", or the chosen provider kind ("Nurse"...) / "Healthcare provider". */
export const roleDisplayName = (roleId?: string, roleLabel?: string, specialty?: string) => {
	const variant = roleVariant(roleId, roleLabel)
	if (variant === 'patient') return 'Patient'
	if (variant === 'doctor') return 'Doctor'
	return PROVIDER_KINDS.find((k) => k.key === specialty)?.label ?? 'Healthcare provider'
}
