// src/features/care-ai/careAiScenarios.ts
//
// The conversations Care AI can be opened into (CareAiLaunch). Each is the chat a patient would have had to reach
// that point -- the same turns the welcome flow produces -- so the screen looks and behaves exactly as if they had
// tapped through it, with the real summary / doctor swapped in for the sample ones.

import { CONCERNS, SYMPTOMS } from './careAiData'
import type {
	CareAiAssistantMessage,
	CareAiLaunch,
	CareAiMessage,
	CareAiReply,
	CareAiReplyArg,
	CareAiReplyId,
	CareAiUserMessage,
} from './careAiTypes'

type MakeUser = (text: string) => CareAiUserMessage
type MakeAssistant = (kind: CareAiReplyId, arg?: CareAiReplyArg, patch?: Partial<CareAiReply>) => CareAiAssistantMessage

const picked = (message: CareAiAssistantMessage, value: string): CareAiAssistantMessage => ({
	...message,
	picked: value,
})

/** "Talk to a doctor about this": greeting -> symptom -> the summary Care AI wrote for the doctor. */
function handoff(launch: CareAiLaunch, user: MakeUser, ai: MakeAssistant): CareAiMessage[] {
	const symptom = SYMPTOMS[1]
	return [
		picked(ai('greet'), 'Check a symptom'),
		user('Check a symptom'),
		picked(ai('symptom'), symptom),
		user(symptom),
		ai('sym-pick', symptom),
		user('Talk to a doctor about this'),
		ai(
			'handoff',
			launch.concern ?? `${symptom} since yesterday`,
			launch.summary ? { summary: launch.summary } : undefined
		),
	]
}

/** "Find the right doctor" -> concern -> Online -> that doctor's slots, ready to book. */
function book(launch: CareAiLaunch, user: MakeUser, ai: MakeAssistant): CareAiMessage[] {
	const concern = CONCERNS[0].label
	const doctor = launch.doctor
	// The sample reply talks about the sample doctor and offers "all online diabetologists"; a real doctor gets neither.
	const booking = ai(
		'book',
		undefined,
		doctor
			? {
					book: doctor,
					text: `${doctor.name} has ${(doctor.mode ?? 'Video').toLowerCase()} slots ${doctor.day ?? 'today'}. Pick a time and I’ll book it:`,
					actions: [],
				}
			: undefined
	)
	return [
		picked(ai('greet'), 'Find the right doctor'),
		user('Find the right doctor'),
		picked(ai('doctor'), concern),
		user(concern),
		picked(ai('doc-mode', concern), 'Online'),
		user('Online'),
		launch.slot ? { ...booking, initialSlot: launch.slot } : booking,
	]
}

/** The messages a chat opened with `launch` starts with, or null for the normal welcome screen. */
export function launchMessages(
	launch: CareAiLaunch | undefined,
	user: MakeUser,
	ai: MakeAssistant
): CareAiMessage[] | null {
	if (launch?.scenario === 'handoff') return handoff(launch, user, ai)
	if (launch?.scenario === 'book') return book(launch, user, ai)
	return null
}
