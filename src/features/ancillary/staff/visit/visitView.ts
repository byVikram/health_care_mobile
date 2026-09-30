// src/features/ancillary/staff/visit/visitView.ts
//
// Display helpers for the provider visit screens (details, in progress, complete).
import { isSameDay, parseDateOnly } from '../../../../utils/date'
import { capitaliseWords, formatTimeSlot } from '../../../../utils/formatters'
import type { ProviderVisitDetail, ProviderVisitRecord, VisitRecordType } from '../../providerVisitService'

/** Visit statuses from which the provider can head out / start the visit (mirrors the backend). */
const STARTABLE = new Set(['SCHEDULED_CONFIRMED', 'ASSIGNED', 'NURSE_ASSIGNED', 'EN_ROUTE', 'ARRIVED'])

export const isStartable = (v: ProviderVisitDetail) => STARTABLE.has(v.status)
export const isInProgress = (v: ProviderVisitDetail) => v.status === 'IN_PROGRESS'
export const isCompleted = (v: ProviderVisitDetail) => v.status === 'COMPLETED'
export const isToday = (v: Pick<ProviderVisitDetail, 'date'>) => {
	const d = parseDateOnly(v.date)
	return !!d && isSameDay(d, new Date())
}

/** "7:00 PM – 7:45 PM" */
export const timeRange = (v: Pick<ProviderVisitDetail, 'start_time' | 'end_time'>) =>
	[formatTimeSlot(v.start_time), formatTimeSlot(v.end_time)].filter(Boolean).join(' – ')

/** Short booking reference shown in headers ("KH-1A2B3C4D"). */
export const bookingRef = (requestId: string) => `KH-${requestId.replace(/-/g, '').slice(0, 8).toUpperCase()}`

const RELATION_LABELS: Record<string, string> = {
	FATHER: 'Father',
	MOTHER: 'Mother',
	SPOUSE: 'Spouse',
	WIFE: 'Wife',
	HUSBAND: 'Husband',
	SON: 'Son',
	DAUGHTER: 'Daughter',
	BROTHER: 'Brother',
	SISTER: 'Sister',
}

/** "Male · 70 yrs · Father of Vikram K." */
export const patientLine = (v: ProviderVisitDetail) => {
	const p = v.patient
	const relation = (p.relation ?? '').toUpperCase()
	const relationText =
		relation && relation !== 'SELF' && p.family_contact_name
			? `${RELATION_LABELS[relation] ?? capitaliseWords(relation.toLowerCase())} of ${p.family_contact_name}`
			: null
	return [p.gender ? capitaliseWords(p.gender) : null, p.age != null ? `${p.age} yrs` : null, relationText]
		.filter(Boolean)
		.join(' · ')
}

export const firstName = (name?: string | null) => (name ?? '').trim().split(/\s+/)[0] || 'the patient'

/** Section title of the checklist by what the speciality records. */
export const tasksTitle = (type: VisitRecordType) =>
	type === 'pain_score' ? 'Today’s exercises' : type === 'family_updates' ? 'Care plan' : 'Procedure steps'

/** "Pain 6/10 · Knee bend (degrees) 70" from a recorded session. */
export const sessionSummary = (record: ProviderVisitRecord, measurementLabel?: string | null) => {
	const parts: string[] = []
	if (record.pain_score != null) parts.push(`Pain ${record.pain_score}/10`)
	if (record.measurement != null) {
		const label = String(record.measurement_label ?? measurementLabel ?? 'Measurement')
		parts.push(`${label} ${record.measurement}`)
	}
	return parts.join(' · ')
}

/** Fact rows under "Care instructions" -- only rows with data. */
export const careFacts = (v: ProviderVisitDetail) => {
	const rows: { label: string; value: string }[] = []
	if (v.care.allergies.length) rows.push({ label: 'Allergies', value: v.care.allergies.join(', ') })
	if (v.care.conditions.length) rows.push({ label: 'Conditions', value: v.care.conditions.join(', ') })
	if (v.care.medications.length) rows.push({ label: 'Medicines', value: v.care.medications.join(', ') })
	const last = v.care.last_session
	if (last) {
		const summary = sessionSummary(last.record, v.service.measurement_label) || last.notes
		if (summary) rows.push({ label: 'Last visit', value: summary })
	}
	return rows
}

/** What was recorded, for the completion summary ("Vitals · notes"). */
export const recordedSummary = (v: ProviderVisitDetail) => {
	const parts: string[] = []
	const r = v.record
	if (v.service.record_type === 'vitals' && ['bp', 'pulse', 'temp_f', 'spo2'].some((k) => r[k] != null))
		parts.push('Vitals')
	if (r.pain_score != null) parts.push('Pain score')
	if (r.measurement != null) parts.push(v.service.measurement_label ?? 'Measurement')
	if (v.updates.length) parts.push('Family updates')
	if (v.notes) parts.push('Notes')
	return parts.join(' · ') || 'Nothing recorded'
}

/** "32 min" / "1 hr 5 min" between two ISO stamps (or until now). */
export const durationLabel = (fromIso?: string | null, toIso?: string | null) => {
	if (!fromIso) return '—'
	const from = new Date(fromIso).getTime()
	const to = toIso ? new Date(toIso).getTime() : Date.now()
	const mins = Math.max(0, Math.round((to - from) / 60000))
	if (mins < 60) return `${mins} min`
	const h = Math.floor(mins / 60)
	const m = mins % 60
	return `${h} ${h === 1 ? 'hr' : 'hrs'}${m ? ` ${m} min` : ''}`
}

/** Quick updates a provider can send to the family during a home-care visit. */
export const FAMILY_QUICK_UPDATES = [
	'Had breakfast',
	'Medicines given',
	'BP normal',
	'Went for a walk',
	'Resting well',
	'Needs attention',
] as const
