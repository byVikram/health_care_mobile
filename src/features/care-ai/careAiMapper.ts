// src/features/care-ai/careAiMapper.ts
//
// Turns what the backend chat sends (careAiService.ts) into the CareAiReply the screens draw, for a live answer and
// for a saved chat that is reopened. The screens never see the API shape.

import { formatInr } from '../../config/theme'
import type {
	CareAiAction,
	CareAiAssistantMessage,
	CareAiDoctorResult,
	CareAiMessage,
	CareAiReply,
} from './careAiTypes'
import type { ChatDoctor, ChatPayload, ChatSource, ChatStoredMessage } from './careAiService'

/** Doctors shown under one answer. */
const MAX_DOCTORS = 3

const NOT_A_DIAGNOSIS = 'General guidance · not a diagnosis'

export const COULD_NOT_ANSWER = 'Sorry, I couldn’t answer just now. Please try again in a moment.'

const clean = (values?: (string | null | undefined)[] | null): string[] => {
	const out: string[] = []
	for (const value of values ?? []) {
		const text = value?.trim()
		if (text && !out.includes(text)) out.push(text)
	}
	return out
}

const toDoctor = (d: ChatDoctor): CareAiDoctorResult | null => {
	if (!d.id) return null
	const speciality = clean(d.speciality)[0]
	const years = d.experience_years ? `${d.experience_years} yrs` : ''
	const place = d.hospital_name || d.location || ''
	const fee = d.fees ? formatInr(d.fees) : ''
	const slot = d.earliest_slot?.trim()
	return {
		id: d.id,
		name: d.name,
		meta: [speciality, years].filter(Boolean).join(' · '),
		detail: [fee, place].filter(Boolean).join(' · '),
		slot: slot ? (/no slots/i.test(slot) ? slot : `Next slot: ${slot}`) : undefined,
	}
}

const sourceLine = (sources: ChatSource[], confidence?: string | null) => {
	if (!sources.length) return NOT_A_DIAGNOSIS
	const based = `Based on ${sources.length} ${sources.length === 1 ? 'source' : 'sources'}`
	return confidence ? ` · ${confidence.toLowerCase()} confidence` : based
}

const whyLines = (sources: ChatSource[]) =>
	clean(sources.map((s) => [s.title, s.source].filter(Boolean).join(' · ') || null))

/** The reply for a backend answer: its text, a red card for an emergency, the lists, real doctors and the buttons. */
export function replyFromPayload(answer: string, payload: ChatPayload): CareAiReply {
	const severity = (payload.severity ?? '').toLowerCase()
	const emergency = severity === 'emergency'
	const urgent = emergency || severity === 'urgent' || severity === 'high'

	const conditions = clean(payload.possible_conditions)
	const remedies = clean(payload.home_remedies)
	const doctors = (payload.nearby_doctors ?? [])
		.map(toDoctor)
		.filter((d): d is CareAiDoctorResult => d !== null)
		.slice(0, MAX_DOCTORS)
	const speciality = payload.recommended_speciality?.trim() || undefined
	const sources = payload.sources ?? []

	const reply: CareAiReply = {
		text: answer.trim() || undefined,
		follow: [],
		source: sourceLine(sources, payload.confidence_category),
		why: whyLines(sources),
	}

	if (emergency) {
		reply.urgent = {
			title: 'This needs urgent care',
			body: 'Call an ambulance or go to the nearest emergency room now. Don’t drive yourself, and don’t wait for symptoms to settle.',
		}
	} else if (urgent) {
		reply.note = 'Please see a doctor today. If it gets worse, don’t wait.'
	}

	// What it could be first, then what to do at home.
	const lists = [
		conditions.length ? { title: 'What it could be', bullets: conditions } : null,
		remedies.length ? { title: 'What you can do at home', bullets: remedies } : null,
	].filter((l): l is { title: string; bullets: string[] } => l !== null)
	if (lists[0]) {
		reply.bulletsTitle = lists[0].title
		reply.bullets = lists[0].bullets
	}
	if (lists[1]) reply.moreLists = [lists[1]]

	if (doctors.length) reply.doctors = doctors

	const actions: CareAiAction[] = []
	if (doctors.length && speciality) {
		actions.push({ label: `See all ${speciality} doctors`, link: { to: 'doctors', query: speciality } })
	} else if (payload.doctor_needed || urgent) {
		actions.push({
			label: speciality ? `See ${speciality} doctors` : 'Talk to a doctor',
			primary: true,
			link: { to: 'doctors', query: speciality },
		})
	}
	if (actions.length) reply.actions = actions

	return reply
}

const isUser = (m: ChatStoredMessage) => m.role === 'user' || m.role === 'human'

/** A saved chat as the screen's messages (oldest first). `nextId` hands out the local message ids. */
export function messagesFromSaved(saved: ChatStoredMessage[], nextId: () => string): CareAiMessage[] {
	return saved.map((m): CareAiMessage => {
		if (isUser(m)) return { id: nextId(), role: 'user', text: m.content }
		const payload: ChatPayload = {
			...(m.structured_payload ?? {}),
			severity: m.triage_level ?? m.structured_payload?.severity,
			sources: m.sources ?? m.structured_payload?.sources,
			confidence_category: m.confidence_category ?? m.structured_payload?.confidence_category,
		}
		const turn: CareAiAssistantMessage = {
			id: nextId(),
			role: 'ai',
			kind: 'answer',
			reply: replyFromPayload(m.content, payload),
			messageId: m.id,
		}
		return turn
	})
}
