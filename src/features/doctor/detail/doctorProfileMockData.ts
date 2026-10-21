// src/features/doctor/detail/doctorProfileMockData.ts
//
// TEMPORARY hardcoded values for the Doctor Profile screen (DoctorDetailPage.tsx).
//
// Everything in this file exists ONLY because the corresponding field has no
// real API backing today. Each export below says exactly why. When the
// backend adds real data for one of these, wire it up in DoctorDetailPage.tsx
// and delete the entry here — do not leave it defined-but-unused.
//
// Do NOT add anything here that the API already provides (name, specialities,
// qualifications/degrees, languages, consultation fees, hospitals, real
// achievements, areas of expertise, treatment offerings) — those must always
// come from the doctor detail API response, never from this file.

/**
 * MOCK — generic pre-visit guidance shown on every doctor's profile. This is
 * app-wide policy copy, not per-doctor data, but there is no CMS/content
 * endpoint serving it yet, so it's hardcoded here until one exists. The
 * "reschedule window" hours figure is a placeholder (the reference design
 * itself leaves this as "[X] hours") — confirm the real policy value before
 * shipping.
 */
export const DOCTOR_PROFILE_GOOD_TO_KNOW_MOCK: string[] = [
	'Bring your recent lab reports and a list of your medicines.',
	'Reschedule for free up to 4 hours before your visit.',
	'Your prescription is shared in the app after the consult.',
]
