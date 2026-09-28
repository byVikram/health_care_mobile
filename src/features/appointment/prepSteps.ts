// src/features/appointment/prepSteps.ts
//
// Static "Before your visit" / "Get ready for the call" checklist copy from the designs, shared by
// Appointment confirmed (6 · Confirmed / 7a · Video pending) and Appointment details (7 · Appt details).
// The video checklist is identical on both screens; the in-clinic one differs slightly (the confirmed
// screen talks about the booking ID and the prescription, the details screen about the QR code and fasting).

import type { AppNumberedStep } from '../../components/common'

export const VIDEO_PREP_STEPS: AppNumberedStep[] = [
	{ title: 'Find a quiet, well-lit spot', body: 'The doctor needs to see and hear you clearly.' },
	{ title: 'Keep reports and medicines handy', body: 'You can share photos of reports during the call.' },
	{ title: 'Check your internet', body: 'Wi-Fi or strong mobile data works best.' },
]

/** In-clinic checklist shown right after booking (Appointment confirmed). */
export const CLINIC_PREP_STEPS_CONFIRMED: AppNumberedStep[] = [
	{ title: 'Bring your reports', body: 'Recent lab results and a list of your medicines.' },
	{ title: 'Arrive 10 minutes early', body: 'Show your booking ID at the front desk to check in.' },
	{
		title: 'Prescription in the app',
		body: "We'll add the doctor's notes and prescription to your records after the visit.",
	},
]

/** In-clinic checklist on the Appointment details screen. */
export const CLINIC_PREP_STEPS_DETAILS: AppNumberedStep[] = [
	{ title: 'Bring your reports', body: 'Recent lab results, including HbA1c, and your medicine list.' },
	{ title: 'Arrive 10 minutes early', body: 'Show the QR code at the front desk to check in.' },
	{ title: 'Fasting not needed', body: 'Eat as usual unless the doctor told you otherwise.' },
]

export const getPrepSteps = (isVideo: boolean, screen: 'confirmed' | 'details'): AppNumberedStep[] =>
	isVideo ? VIDEO_PREP_STEPS : screen === 'confirmed' ? CLINIC_PREP_STEPS_CONFIRMED : CLINIC_PREP_STEPS_DETAILS

export const getPrepStepsTitle = (isVideo: boolean) => (isVideo ? 'Get ready for the call' : 'Before your visit')
