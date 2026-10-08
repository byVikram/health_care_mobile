// src/features/care-ai/careAiData.ts
//
// Mock content for the Care AI chat (the design's sample patient: type 2 diabetes, Metformin, an HbA1c report).
// Nothing here comes from the backend; it is what the scripted replies in careAiReplies.ts are built from.

import type { CareAiMockDoctor, CareAiRecentChat, CareAiStarter } from './careAiTypes'

/** Typed text that is an emergency: answered with the urgent-care card instead of a normal reply. */
export const RED_FLAG_PATTERN =
	/chest pain|crushing|can.?t breathe|cannot breathe|breathless|short of breath|faint|unconscious|passed out|stroke|face drooping|slurred|seizure|\bfit\b|heavy bleeding|bleeding a lot|suicid|kill myself/

/** Typed text asking Care AI to change a prescription: never answered, always handed to a doctor. */
export const DOSE_CHANGE_PATTERN =
	/stop (taking|my)|double (the |my )?dose|increase (the |my )?dose|reduce (the |my )?dose|skip (all|my) medicine|change (the |my )?dose|pregnan|\b(stop|skip|quit|discontinue)\b[^.?!]{0,40}\b(medicines?|medications?|tablets?|pills?|doses?|metformin|insulin|telmisartan)/

export const STARTERS: CareAiStarter[] = [
	{
		id: 'health-ask',
		title: 'Ask a health question',
		sub: 'Diet, sleep, lifestyle',
		icon: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
		tone: 'sky',
	},
	{
		id: 'symptom',
		title: 'Check a symptom',
		sub: 'Get advice on what to do',
		icon: 'M3 12h4l2-6 4 12 2-6h6',
		tone: 'peach',
	},
	{
		id: 'meds',
		title: 'Ask about medicines',
		sub: 'Metformin 500 mg',
		icon: 'M10.5 20.5a5 5 0 0 1-7-7l6-6a5 5 0 0 1 7 7zM8.5 8.5l7 7',
		tone: 'lilac',
	},
	{
		id: 'doctor',
		title: 'Find the right doctor',
		sub: 'Based on your health',
		icon: 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21v-1a8 8 0 0 1 16 0v1',
		tone: 'mint',
	},
]

export const SYMPTOMS = ['Fever', 'Headache', 'Dizziness', 'Stomach pain', 'Chest pain or breathlessness']

/** The symptom that is an emergency on its own. */
export const URGENT_SYMPTOM = 'Chest pain or breathlessness'

export type CareAiConcern = {
	label: string
	spec: string
	/** "Diabetologist" / "Diabetologists" / "diabetologist" / "diabetologists". */
	title: string
	titlePl: string
	who: string
	whoPl: string
}

export const CONCERNS: CareAiConcern[] = [
	{
		label: 'Diabetes or thyroid',
		spec: 'diab',
		title: 'Diabetologist',
		titlePl: 'Diabetologists',
		who: 'diabetologist',
		whoPl: 'diabetologists',
	},
	{
		label: 'Fever, cold or cough',
		spec: 'gp',
		title: 'General physician',
		titlePl: 'General physicians',
		who: 'general physician',
		whoPl: 'general physicians',
	},
	{
		label: 'Skin or hair',
		spec: 'derm',
		title: 'Dermatologist',
		titlePl: 'Dermatologists',
		who: 'dermatologist',
		whoPl: 'dermatologists',
	},
	{
		label: 'Heart or blood pressure',
		spec: 'cardio',
		title: 'Cardiologist',
		titlePl: 'Cardiologists',
		who: 'cardiologist',
		whoPl: 'cardiologists',
	},
	{
		label: 'Child’s health',
		spec: 'paed',
		title: 'Paediatrician',
		titlePl: 'Paediatricians',
		who: 'paediatrician',
		whoPl: 'paediatricians',
	},
]

export const MOCK_DOCTORS: CareAiMockDoctor[] = [
	{ id: 'd1', name: 'Dr. Ananya Rao', spec: 'diab', specLabel: 'Diabetologist', fee: 800, today: true, video: true },
	{
		id: 'd2',
		name: 'Dr. Rahul Menon',
		spec: 'gp',
		specLabel: 'General physician',
		fee: 500,
		today: true,
		video: true,
	},
	{
		id: 'd3',
		name: 'Dr. Farah Siddiqui',
		spec: 'cardio',
		specLabel: 'Cardiologist',
		fee: 1200,
		today: false,
		video: false,
	},
	{
		id: 'd4',
		name: 'Dr. Suresh Iyer',
		spec: 'diab',
		specLabel: 'Diabetologist',
		fee: 900,
		today: false,
		video: true,
	},
	{
		id: 'd5',
		name: 'Dr. Meera Kulkarni',
		spec: 'derm',
		specLabel: 'Dermatologist',
		fee: 700,
		today: true,
		video: true,
	},
	{
		id: 'd6',
		name: 'Dr. Arjun Shetty',
		spec: 'paed',
		specLabel: 'Paediatrician',
		fee: 600,
		today: false,
		video: true,
	},
]

/** The doctor who wrote the sample prescription: offered first when the patient wants a diabetologist. */
export const PRESCRIBING_DOCTOR = MOCK_DOCTORS[0]

export const AREAS = ['Near me · Indiranagar', 'Jayanagar', 'Koramangala', 'HSR Layout']

export const SAMPLE_REPORT = { name: 'HbA1c report.pdf', sub: 'Karola Labs · 28 Sep' }

export const RECENT_CHATS: CareAiRecentChat[] = [
	{
		group: 'This week',
		title: 'How much water should I drink daily?',
		preview: 'About 2.5–3 litres a day for you, more on hot days.',
		when: '22 Sep',
		seed: 'h-water',
		icon: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z',
		tone: 'sky',
	},
	{
		group: 'This week',
		title: 'Lipid profile report explained',
		preview: 'LDL is a little high. Here’s what it means and next steps.',
		when: '20 Sep',
		seed: 'report',
		icon: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6',
		tone: 'lilac',
		tag: { label: 'Report', tone: 'lilac' },
	},
	{
		group: 'This week',
		title: 'Can I fast during Navratri?',
		preview: 'With diabetes, check with your doctor before fasting.',
		when: '18 Sep',
		seed: 'other',
		icon: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
		tone: 'mint',
	},
	{
		group: 'Earlier',
		title: 'Knee pain when climbing stairs',
		preview: 'Booked Dr. Meera Iyer, Orthopaedic, for 12 Sep.',
		when: '10 Sep',
		seed: 'symptom',
		icon: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
		tone: 'peach',
		tag: { label: 'For Raghav', tone: 'sand' },
	},
	{
		group: 'Earlier',
		title: 'Headache after starting Metformin',
		preview: 'Common early on. Take it with food and drink water.',
		when: '9 Sep',
		seed: 'symptom',
		icon: 'M10.5 20.5a4.95 4.95 0 0 1-7-7l6-6a4.95 4.95 0 0 1 7 7zM8.5 8.5l7 7',
		tone: 'peach',
	},
	{
		group: 'Earlier',
		title: 'Reminder for Telmisartan 40',
		preview: 'Daily reminder set for 8:00 AM.',
		when: '2 Sep',
		seed: 'other',
		icon: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0',
		tone: 'mint',
		tag: { label: 'For Raghav', tone: 'sand' },
	},
]

export const RECENT_GROUPS: CareAiRecentChat['group'][] = ['This week', 'Earlier']
