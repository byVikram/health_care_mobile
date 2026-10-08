// src/features/care-ai/careAiReplies.ts
//
// The scripted Care AI: which reply a typed message or a chip maps to (routeText / resolveChip) and the content of
// every reply (buildReply). Mock content from the design -- swap this module for the chat API when it exists; the
// screens only depend on the CareAiReply shape.

import {
	AREAS,
	CONCERNS,
	DOSE_CHANGE_PATTERN,
	MOCK_DOCTORS,
	PRESCRIBING_DOCTOR,
	RED_FLAG_PATTERN,
	SYMPTOMS,
	URGENT_SYMPTOM,
	type CareAiConcern,
} from './careAiData'
import type { CareAiFollowUp, CareAiLink, CareAiReply, CareAiReplyArg, CareAiReplyId } from './careAiTypes'

const GENERAL_SOURCE = 'General guidance · reviewed by Karola doctors'
const NOT_A_DIAGNOSIS = 'General guidance · not a diagnosis'

const TALK_TO_DOCTOR: CareAiLink = { to: 'doctors' }

const ask = (label: string): CareAiFollowUp => ({ label })

const concernOf = (label: string): CareAiConcern => CONCERNS.find((c) => c.label === label) ?? CONCERNS[0]

const doctorsFor = (concern: CareAiConcern) => MOCK_DOCTORS.filter((d) => d.spec === concern.spec)

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

type ConcernArg = { concern: string; mode?: string; area?: string }

const asConcernArg = (arg: CareAiReplyArg | undefined): ConcernArg =>
	typeof arg === 'object' ? arg : { concern: typeof arg === 'string' ? arg : CONCERNS[0].label }

const asText = (arg: CareAiReplyArg | undefined, fallback = '') => (typeof arg === 'string' ? arg : fallback)

export type CareAiReplyContext = { firstName: string }

/** The reply for `id`. `arg` carries what the turn is about (the symptom picked, the doctor-finder's choices). */
export function buildReply(id: CareAiReplyId, arg: CareAiReplyArg | undefined, ctx: CareAiReplyContext): CareAiReply {
	switch (id) {
		case 'greet':
			return { follow: [] }

		case 'health-ask':
			return {
				text: 'Sure! What would you like to know? Type your question below, or pick one of these:',
				chips: ['How can I control my blood sugar?', 'How much water should I drink?', 'Tips for better sleep'],
				follow: [],
			}

		case 'h-water':
			return {
				text: 'Most adults need about 2–3 litres (8–10 glasses) of water a day, and more in hot weather or after exercise. Pale yellow urine is a good sign you’re drinking enough.',
				note: 'If you have kidney or heart problems, ask your doctor how much is right for you.',
				source: GENERAL_SOURCE,
				follow: [ask('Is coconut water good for me?'), ask('Can I drink tea or coffee?')],
			}

		case 'h-sleep':
			return {
				text: 'Good sleep helps your sugar, mood and heart. A few things that work well:',
				bulletsTitle: 'For better sleep',
				bullets: [
					'Sleep and wake at the same time every day',
					'Keep your phone away 30 minutes before bed',
					'Avoid tea, coffee and heavy meals late in the evening',
				],
				source: GENERAL_SOURCE,
				follow: [ask('Why do I wake up at night?'), ask('Is a short nap okay?')],
			}

		case 'health':
			return {
				text: 'Small daily habits make a big difference to blood sugar. Here are the ones that help most:',
				bulletsTitle: 'Daily habits that help',
				bullets: [
					'Eat at regular times and don’t skip breakfast',
					'Fill half your plate with vegetables; choose whole grains over white rice',
					'Walk for 30 minutes, ideally after a meal',
					'Sleep 7–8 hours and drink plenty of water',
				],
				note: 'Keep taking your medicines as prescribed. Don’t stop or change a dose without talking to your doctor.',
				actions: [{ label: 'Talk to a doctor', primary: true, link: TALK_TO_DOCTOR }],
				source: GENERAL_SOURCE,
				why: ['HbA1c report · 28 Sep (7.8%)', 'Health profile · Type 2 diabetes'],
				follow: [
					ask('What should I eat for breakfast?'),
					ask('Is fruit okay with diabetes?'),
					ask('How often should I check my sugar?'),
				],
			}

		case 'symptom':
			return {
				text: 'I’m sorry you’re not feeling well. What’s bothering you the most right now?',
				chips: SYMPTOMS,
				follow: [],
			}

		case 'sym-pick': {
			const symptom = asText(arg)
			if (symptom === URGENT_SYMPTOM) {
				return {
					text: 'Chest pain or trouble breathing can be a sign of a heart problem, especially with diabetes. Please don’t wait.',
					urgent: {
						title: 'This needs urgent care',
						body: 'Call an ambulance or go to the nearest emergency room now. Don’t drive yourself.',
					},
					follow: [],
				}
			}
			return {
				text: `${symptom} can have many causes. Because you take Metformin, low or high sugar is worth ruling out first. If you have a sugar meter, check your reading now.`,
				bulletsTitle: 'See a doctor today if',
				bullets: [
					'It lasts more than a day or keeps getting worse',
					'You also have vomiting, confusion or a high fever',
					'Your sugar is below 70 or above 300 mg/dL',
				],
				actions: [{ label: 'Talk to a doctor now', primary: true, link: TALK_TO_DOCTOR }],
				source: NOT_A_DIAGNOSIS,
				why: ['Your medicines · Metformin 500 mg', 'Health profile · Type 2 diabetes'],
				follow: [
					{ label: 'Talk to a doctor about this', id: 'handoff', arg: `${symptom} since yesterday` },
					ask('My sugar is 65, what do I do?'),
				],
			}
		}

		case 'meds':
			return {
				text: 'Yes. Paracetamol is generally safe to take with Metformin at the usual dose: 500 mg to 1 g at a time, up to 4 g in a day.',
				med: { name: 'Metformin 500 mg', sub: 'After lunch and dinner · next dose 8:30 PM' },
				note: 'Check with your doctor first if you have liver or kidney problems, or take it for more than 3 days.',
				actions: [{ label: 'Remind me at 8:30 PM', doneLabel: 'Reminder set for 8:30 PM' }],
				source: 'Based on your prescription · Dr. Ananya Rao',
				why: ['Prescription · Dr. Ananya Rao · 12 Sep', 'Medicines list · Metformin 500 mg'],
				follow: [ask('Can I skip a dose?'), ask('What are the side effects of Metformin?')],
			}

		case 'doctor':
			return {
				text: 'Sure, I’ll help you find the right doctor. What do you need help with?',
				chips: CONCERNS.map((c) => c.label),
				follow: [],
			}

		case 'doc-mode':
			return {
				text: `Great. Would you like to consult a ${concernOf(asText(arg)).who} online or in person?`,
				chips: ['Online', 'In person'],
				follow: [],
			}

		case 'doc-area':
			return { text: 'Sure. Which area would you like to visit a clinic in?', chips: AREAS, follow: [] }

		case 'doc-result': {
			const { concern } = asConcernArg(arg)
			const found = concernOf(concern)
			// The patient's own diabetologist has slots in the chat itself.
			if (found.spec === 'diab') return buildReply('book', undefined, ctx)
			const online = doctorsFor(found).filter((d) => d.video)
			if (!online.length) {
				return {
					text: `No ${found.whoPl} offer video consults right now. Would you like to visit one at a clinic instead?`,
					follow: [
						{ label: 'Yes, in person', id: 'doc-area', arg: concern },
						{ label: 'Thank you', id: 'thanks' },
					],
				}
			}
			const today = online.filter((d) => d.today).length
			return {
				consult: {
					tone: 'lilac',
					title: `Consult a ${found.title} online`,
					sub: today
						? `${plural(today, 'doctor', 'doctors')} available for a video call today`
						: 'Next video slot tomorrow morning',
					doctors: online,
					cta: 'Video consult now',
					ctaTone: 'lilac',
					link: { to: 'doctors', query: found.title, mode: 'video' },
				},
				after: `Tap the button to connect with a ${found.who} on a video call for expert care.`,
				follow: [
					{ label: 'In person instead', id: 'doc-area', arg: concern },
					{ label: 'Thank you', id: 'thanks' },
				],
			}
		}

		case 'doc-clinic': {
			const { concern, area = AREAS[0] } = asConcernArg(arg)
			const found = concernOf(concern)
			const place = area.replace('Near me · ', '')
			const docs = doctorsFor(found)
			const today = docs.filter((d) => d.today).length
			return {
				text: `You can see the top ${found.whoPl} in ${place} for an in-person visit here:`,
				consult: {
					tone: 'mint',
					title: `Top ${found.titlePl} near ${place}`,
					sub: today ? 'Available today for a clinic visit' : 'Next clinic slot tomorrow',
					doctors: docs,
					cta: 'See doctors',
					ctaTone: 'primary',
					link: { to: 'doctors', query: found.title, mode: 'clinic', sort: 'near' },
				},
				follow: [
					{ label: 'Thank you', id: 'thanks' },
					{ label: 'Find a doctor online', id: 'doc-result', arg: { concern, mode: 'Online' } },
				],
			}
		}

		case 'urgent-typed':
			return {
				text: 'What you’re describing could be a medical emergency. Please get help right away.',
				urgent: {
					title: 'This needs urgent care',
					body: 'Call an ambulance or go to the nearest emergency room now. Don’t drive yourself, and don’t wait for symptoms to settle.',
				},
				follow: [],
			}

		case 'cant':
			return {
				text: 'I can’t advise on stopping, skipping or changing a dose. That decision needs your doctor, who knows your full history.',
				note: 'Keep taking your medicines as prescribed until you’ve spoken to them.',
				actions: [{ label: 'Talk to a doctor now', primary: true, link: TALK_TO_DOCTOR }],
				source: 'Safety limit · Care AI never changes prescriptions',
				why: ['Medicine and dosing decisions are always left to your doctor'],
				follow: [ask('What happens if I miss a dose?')],
			}

		case 'report':
			return {
				text: 'Here’s what stands out in your HbA1c report from 28 Sep:',
				results: [
					{ name: 'HbA1c', range: 'Target below 7%', value: '7.8%', status: 'High' },
					{ name: 'Fasting glucose', range: '70–100 mg/dL', value: '142', status: 'High' },
					{ name: 'LDL cholesterol', range: 'Below 100 mg/dL', value: '118', status: 'Borderline' },
					{ name: 'Creatinine', range: '0.7–1.3 mg/dL', value: '0.9', status: 'Normal' },
				],
				bulletsTitle: 'What this means',
				bullets: [
					'Your 3-month sugar average is above target',
					'Your kidneys are working normally',
					'Cholesterol is slightly high, worth watching',
				],
				note: 'Share these results with your doctor. Don’t change your medicines on your own.',
				actions: [
					{
						label: `Book ${PRESCRIBING_DOCTOR.name}`,
						primary: true,
						link: { to: 'doctors', query: 'Ananya Rao' },
					},
				],
				source: 'From your report · Karola Labs, 28 Sep',
				why: [
					'HbA1c report · Karola Labs · 28 Sep',
					'Health profile · Type 2 diabetes',
					'Prescription · Metformin 500 mg',
				],
				follow: [ask('How can I bring my HbA1c down?'), ask('What is LDL cholesterol?')],
			}

		case 'handoff':
			return {
				text: 'I’ve written a short summary so the doctor doesn’t have to ask everything again.',
				summary: {
					title: 'Chat summary for the doctor',
					rows: [
						['Concern', asText(arg, 'Headache for 2 days')],
						['Medicines', 'Metformin 500 mg, twice a day'],
						['Sugar today', 'Not checked yet'],
						['Question', 'Could it be linked to Metformin?'],
					],
				},
				actions: [{ label: 'Video consult now', primary: true, link: { to: 'doctors', mode: 'video' } }],
				follow: [],
			}

		case 'book':
			return {
				text: `${PRESCRIBING_DOCTOR.name}, who wrote your current prescription, has video slots today. Pick a time and I’ll book it:`,
				book: {
					name: PRESCRIBING_DOCTOR.name,
					meta: 'Diabetologist · 14 yrs · video consult',
					fee: PRESCRIBING_DOCTOR.fee,
					slots: ['5:30 PM', '6:00 PM', '7:15 PM'],
				},
				actions: [
					{
						label: 'See all online diabetologists',
						link: { to: 'doctors', query: 'Diabetologist', mode: 'video' },
					},
				],
				follow: [{ label: 'In person instead', id: 'doc-area', arg: CONCERNS[0].label }],
			}

		case 'thanks':
			return {
				text: `You’re welcome, ${ctx.firstName}! Take care, and I’m here whenever you need me.`,
				follow: [],
			}

		case 'other':
		default:
			return {
				text: 'Good question. The short answer depends on your health and the medicines you take, so it’s best checked with a doctor. I can connect you with one in a few minutes.',
				actions: [{ label: 'Talk to a doctor', primary: true, link: TALK_TO_DOCTOR }],
				source: NOT_A_DIAGNOSIS,
				follow: [ask('How can I control my blood sugar?'), ask('Help me find the right doctor')],
			}
	}
}

/** Which reply a typed message gets. Safety rules first: an emergency or a dose change is never answered normally. */
export function routeText(text: string): CareAiReplyId {
	const t = text.toLowerCase()
	if (RED_FLAG_PATTERN.test(t)) return 'urgent-typed'
	if (DOSE_CHANGE_PATTERN.test(t)) return 'cant'
	if (/report|hba1c|result|explain my/.test(t)) return 'report'
	if (/water|drink/.test(t)) return 'h-water'
	if (/sleep|nap/.test(t)) return 'h-sleep'
	if (/sugar|diet|eat|food|exercise|weight|fruit/.test(t)) return 'health'
	if (/symptom|pain|fever|dizz|headache|feel/.test(t)) return 'symptom'
	if (/medicine|tablet|metformin|paracetamol|dose/.test(t)) return 'meds'
	if (/doctor|specialist|appointment/.test(t)) return 'doctor'
	return 'other'
}

export type CareAiChipAnswer = { id: CareAiReplyId; arg?: CareAiReplyArg }

/**
 * What a tapped quick-reply chip asks next. The chip belongs to a turn of kind `kind`, so the same words mean
 * different things (a symptom, a concern, "Online", an area); `concern` is the doctor-finder's choice so far.
 */
export function resolveChip(kind: CareAiReplyId, chip: string, concern: string): CareAiChipAnswer {
	switch (kind) {
		case 'symptom':
			return { id: 'sym-pick', arg: chip }
		case 'doctor':
			return { id: 'doc-mode', arg: chip }
		case 'doc-mode':
			return chip === 'Online'
				? { id: 'doc-result', arg: { concern, mode: chip } }
				: { id: 'doc-area', arg: concern }
		case 'doc-area':
			return { id: 'doc-clinic', arg: { concern, area: chip } }
		default:
			return { id: routeText(chip), arg: chip }
	}
}
