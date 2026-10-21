// src/features/care-ai/careAiTypes.ts
//
// Types for the Care AI chat: the scripted reply a turn is built from, the messages in the conversation and the
// "where does this button go" links. The replies are mock data for now (careAiReplies.ts) -- there is no chat API
// behind this screen yet.

import type { ToneKey } from '../../config/theme'

/** Which scripted reply a turn shows. Also tells the chips under it what to do when one is tapped. */
export type CareAiReplyId =
	| 'greet'
	| 'health-ask'
	| 'health'
	| 'h-water'
	| 'h-sleep'
	| 'symptom'
	| 'sym-pick'
	| 'meds'
	| 'doctor'
	| 'doc-mode'
	| 'doc-area'
	| 'doc-result'
	| 'doc-clinic'
	| 'urgent-typed'
	| 'cant'
	| 'report'
	| 'handoff'
	| 'book'
	| 'thanks'
	| 'other'

/** What a reply is built from: a plain string (a symptom, a concern) or the doctor-finder's choices so far. */
export type CareAiReplyArg = string | { concern: string; mode?: string; area?: string }

/** Doctor search sort keys (same keys as DoctorSearchPage). */
export type CareAiDoctorSort = 'rel' | 'near' | 'fee' | 'exp'

/** A screen a button inside a reply opens. */
export type CareAiLink =
	| { to: 'doctors'; query?: string; mode?: 'all' | 'video' | 'clinic'; sort?: CareAiDoctorSort }
	| { to: 'appointments' }

export type CareAiAction = {
	label: string
	primary?: boolean
	/** Navigates when tapped. Without a link the action is a one-shot ("Remind me") that turns into `doneLabel`. */
	link?: CareAiLink
	doneLabel?: string
}

/** A "You could ask" suggestion: a plain question, or one that jumps straight to a specific reply. */
export type CareAiFollowUp = { label: string; id?: CareAiReplyId; arg?: CareAiReplyArg }

export type CareAiResultStatus = 'High' | 'Low' | 'Normal' | 'Borderline'

export type CareAiLabResult = { name: string; range: string; value: string; status: CareAiResultStatus }

export type CareAiMockDoctor = {
	id: string
	name: string
	spec: string
	specLabel: string
	fee: number
	today: boolean
	video: boolean
}

export type CareAiConsult = {
	tone: ToneKey
	title: string
	sub: string
	doctors: CareAiMockDoctor[]
	cta: string
	/** Filled CTA colour: purple for a video consult, primary for a clinic visit. */
	ctaTone: 'lilac' | 'primary'
	link: CareAiLink
}

export type CareAiBook = {
	name: string
	meta: string
	fee: number
	slots: string[]
	/** Which day the slots are for, as it reads in "VIDEO SLOTS TODAY" / "Booked · today". Defaults to "today". */
	day?: string
	/** Consultation type, as in "VIDEO SLOTS" / "Video consult". Defaults to "Video". */
	mode?: 'Video' | 'Clinic'
}

export type CareAiSummary = { title: string; rows: [label: string, value: string][] }

/** Everything one Care AI turn can show. Every field is optional except the follow-up suggestions. */
export type CareAiReply = {
	text?: string
	/** Quick-reply chips: tapping one answers the question the turn just asked. */
	chips?: string[]
	follow: CareAiFollowUp[]
	urgent?: { title: string; body: string }
	consult?: CareAiConsult
	/** A sentence after the consult card. */
	after?: string
	summary?: CareAiSummary
	book?: CareAiBook
	results?: CareAiLabResult[]
	med?: { name: string; sub: string }
	bulletsTitle?: string
	bullets?: string[]
	/** Yellow caution callout. */
	note?: string
	actions?: CareAiAction[]
	/** "Why this answer?" headline and the records it drew on. */
	source?: string
	why?: string[]
}

export type CareAiAttachment = { name: string; sub: string }

export type CareAiUserMessage = {
	id: string
	role: 'user'
	text: string
	file?: CareAiAttachment
}

export type CareAiAssistantMessage = {
	id: string
	role: 'ai'
	kind: CareAiReplyId
	reply: CareAiReply
	/** The chip (or starter) already chosen on this turn; the others lock. */
	picked?: string
	/** Booking turn only: the slot that starts selected (opened from a screen that already picked one). */
	initialSlot?: string
}

export type CareAiMessage = CareAiUserMessage | CareAiAssistantMessage

/** A starter row on the welcome screen ("Ask a health question" ...). */
export type CareAiStarter = {
	id: CareAiReplyId
	title: string
	sub: string
	icon: string
	tone: ToneKey
}

/** One row in "Recent chats". */
export type CareAiRecentChat = {
	group: 'This week' | 'Earlier'
	title: string
	preview: string
	when: string
	/** The reply the chat re-asks when opened. */
	seed: CareAiReplyId
	icon: string
	tone: ToneKey
	tag?: { label: string; tone: ToneKey }
}

/**
 * Opens Care AI straight into a scenario instead of the welcome screen (route params of ROUTES.STACK.CARE_AI):
 *  - 'handoff': the patient asked to talk to a doctor -- Care AI has summarised the chat for them (screen 14).
 *  - 'book': the patient is booking a particular doctor from inside the chat (screen 15).
 * `summary` / `doctor` replace the sample content with the real thing.
 */
export type CareAiLaunch = {
	scenario?: 'handoff' | 'book'
	/** 'handoff': the symptom the summary is about ("Headache since yesterday"). */
	concern?: string
	summary?: CareAiSummary
	doctor?: CareAiBook
	/** 'book': slot that starts selected. */
	slot?: string
}
