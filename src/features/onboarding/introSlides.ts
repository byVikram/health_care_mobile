// features/onboarding/introSlides.ts
//
// Copy and colours for the three-slide intro shown before sign-up, one set per role variant
// (Patient, Doctor, Healthcare provider). `icon`, `b1`, `b2` are 24x24 stroke paths for the
// floating card icon and the two floating badges.

import type { RoleVariant } from '../auth/roleDisplay'

export type IntroSlide = {
	tint: string
	ink: string
	title: string
	body: string
	icon: string
	cardTitle: string
	cardSub: string
	chip: string
	chipBg: string
	chipFg: string
	action: string
	b1: string
	b2: string
}

export const INTRO_EYEBROW: Record<RoleVariant, string> = {
	patient: 'FOR PATIENTS',
	doctor: 'FOR DOCTORS',
	provider: 'FOR HEALTHCARE PROVIDERS',
}

export const INTRO_SLIDES: Record<RoleVariant, IntroSlide[]> = {
	patient: [
		{
			tint: '#DDEBFA',
			ink: '#2463A8',
			title: 'See a doctor your way',
			body: 'Book a clinic visit or a video consult with verified doctors near you.',
			icon: 'M5 3v5a5 5 0 0 0 10 0V3M10 13v3a4 4 0 0 0 8 0v-3M18 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
			cardTitle: 'Dr. Ananya Rao',
			cardSub: 'Diabetologist · 1.2 km',
			chip: 'Today · 5:30 PM',
			chipBg: '#E6F4EC',
			chipFg: '#1E7A4E',
			action: 'Book',
			b1: 'M3 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM15 10l6-3v10l-6-3',
			b2: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
		},
		{
			tint: '#E3EFEF',
			ink: '#2B6F71',
			title: 'Care that comes home',
			body: 'Lab sample pickup, nurses and physios at your door. A nurse can reach you in about 15 minutes.',
			icon: 'M18 2l4 4M17 7l3-3M19 9l-8.7 8.7a2 2 0 0 1-2.8 0l-2.2-2.2a2 2 0 0 1 0-2.8L14 4M9 11l4 4M5 19l-3 3M14 4l6 6',
			cardTitle: 'Nurse on the way',
			cardSub: 'Injection at home',
			chip: 'Arriving in 12 min',
			chipBg: '#E6F4EC',
			chipFg: '#1E7A4E',
			action: 'Track',
			b1: 'M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3M7.5 15h9',
			b2: 'M3 11l9-7 9 7M5 10v10h14V10M12 17.5s-3-1.8-3-4a1.5 1.5 0 0 1 3-.8 1.5 1.5 0 0 1 3 .8c0 2.2-3 4-3 4z',
		},
		{
			tint: '#FDE8DC',
			ink: '#B4532A',
			title: 'Your family, in one place',
			body: 'Add family members, keep their reports and bookings together, and book for anyone in a tap.',
			icon: 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21v-1a8 8 0 0 1 16 0v1',
			cardTitle: 'Raghav K. · Father',
			cardSub: 'Lipid profile report ready',
			chip: 'Report ready',
			chipBg: '#E6F4EC',
			chipFg: '#1E7A4E',
			action: 'View',
			b1: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
			b2: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h5',
		},
	],
	doctor: [
		{
			tint: '#DDEBFA',
			ink: '#2463A8',
			title: 'Your practice in your pocket',
			body: 'Manage clinic visits and video consults, with the patient’s history before every appointment.',
			icon: 'M3 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM15 10l6-3v10l-6-3',
			cardTitle: 'Vikram K. · Video consult',
			cardSub: 'Follow-up · diabetes',
			chip: 'In 10 min',
			chipBg: '#E6F4EC',
			chipFg: '#1E7A4E',
			action: 'Join',
			b1: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h5',
			b2: 'M5 3v5a5 5 0 0 0 10 0V3M10 13v3a4 4 0 0 0 8 0v-3M18 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
		},
		{
			tint: '#E3EFEF',
			ink: '#2B6F71',
			title: 'Set your hours per clinic',
			body: 'Add each clinic you work at with its own days and slots. Block dates when you’re away.',
			icon: 'M4 21V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16M2 21h20M12 7v6M9 10h6M9 21v-4h6v4',
			cardTitle: 'Indiranagar clinic',
			cardSub: 'Mon–Sat · 9–12, 5–8 PM',
			chip: '4 slots open today',
			chipBg: '#E6F4EC',
			chipFg: '#1E7A4E',
			action: 'Edit',
			b1: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
			b2: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
		},
		{
			tint: '#FBEFD5',
			ink: '#8A5300',
			title: 'Get verified to go live',
			body: 'Upload your registration certificate and ID. Our team checks them before patients can book you.',
			icon: 'M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6zM8.5 12l2.5 2.5 4.5-4.5',
			cardTitle: 'Registration certificate',
			cardSub: 'Uploaded · under review',
			chip: '1–2 working days',
			chipBg: '#FDF1DC',
			chipFg: '#8A5300',
			action: 'View',
			b1: 'M12 16V4M7 9l5-5 5 5M4 20h16',
			b2: 'M5 12l5 5 9-10',
		},
	],
	provider: [
		{
			tint: '#FDE8DC',
			ink: '#B4532A',
			title: 'Visit requests near you',
			body: 'Go online when you’re free. Requests ring on your phone and you have 30 seconds to accept.',
			icon: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0',
			cardTitle: 'New visit request',
			cardSub: 'Injection · 2.1 km away',
			chip: '30s to accept',
			chipBg: '#FDF1DC',
			chipFg: '#8A5300',
			action: 'Accept',
			b1: 'M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
			b2: 'M3 11l9-7 9 7M5 10v10h14V10M12 17.5s-3-1.8-3-4a1.5 1.5 0 0 1 3-.8 1.5 1.5 0 0 1 3 .8c0 2.2-3 4-3 4z',
		},
		{
			tint: '#E3EFEF',
			ink: '#2B6F71',
			title: 'Earn for every visit',
			body: 'See your payout before you accept. Patients pay online and can add a tip, and all of it is yours.',
			icon: 'M3 7a2 2 0 0 1 2-2h13v4M3 7v11a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2zM16 14.5h.01',
			cardTitle: 'Today’s earnings',
			cardSub: '3 visits · incl. ₹60 tips',
			chip: '+ ₹30 tip',
			chipBg: '#E6F4EC',
			chipFg: '#1E7A4E',
			action: 'Details',
			b1: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
			b2: 'M5 12l5 5 9-10',
		},
		{
			tint: '#FBEFD5',
			ink: '#8A5300',
			title: 'Get verified first',
			body: 'Upload your ID and qualification certificates. Our team checks them before you get requests.',
			icon: 'M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6zM8.5 12l2.5 2.5 4.5-4.5',
			cardTitle: 'Nursing certificate',
			cardSub: 'Uploaded · under review',
			chip: '1–2 working days',
			chipBg: '#FDF1DC',
			chipFg: '#8A5300',
			action: 'View',
			b1: 'M12 16V4M7 9l5-5 5 5M4 20h16',
			b2: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h5',
		},
	],
}
