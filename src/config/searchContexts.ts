// What each search bar in the app invites the user to search for. `AppSearchBar` looks its text up here by
// `context`, so a screen never hardcodes (or forgets) its own prompt and every bar reads the same way.
//
// - `placeholder`: the full prompt. Shown as-is when the bar has no `hints`, and always used as the
//   accessibility label.
// - `hints`: example terms. While the bar is empty they cycle as `Search “<term>”` (the KarolaHealth search
//   field design), so the bar teaches what is searchable instead of repeating one static line.
//
// Where the prompt depends on who is looking (a doctor sees patients, a patient sees doctors) there is one
// entry per viewer, e.g. `appointments.doctor` / `appointments.patient`.

export interface SearchContext {
	placeholder: string
	hints?: readonly string[]
}

export const SEARCH_CONTEXTS = {
	// ── Discover ─────────────────────────────────────────────────────────────
	'home.patient': {
		placeholder: 'Search doctors, tests or symptoms',
		hints: ['diabetologist', 'fever', 'full body checkup', 'nurse at home', 'thyroid test'],
	},
	'home.pharmacy': {
		placeholder: 'Search orders by ID or patient',
		hints: ['order ID', 'patient name', 'pending orders'],
	},
	'home.radiology': {
		placeholder: 'Search scans by ID or patient',
		hints: ['scan ID', 'patient name', 'MRI', 'X-ray'],
	},
	'home.doctor': {
		placeholder: 'Search patients, reports or questions',
		hints: ['patient name', 'lab report', 'patient question'],
	},
	'home.ancillary': {
		placeholder: 'Search patients, bookings or care requests',
		hints: ['patient name', 'today’s visits', 'care request'],
	},
	doctorSearch: {
		placeholder: 'Search specialities or symptoms',
		hints: ['cardiology', 'fever', 'skin rash', 'back pain', 'diabetes'],
	},
	doctors: {
		placeholder: 'Search doctors by name or speciality',
		hints: ['cardiologist', 'dermatologist', 'paediatrician', 'Dr. name', 'knee pain'],
	},
	specialities: {
		placeholder: 'Search specialities or treatments',
		hints: ['cardiology', 'dermatology', 'orthopaedics', 'dental care'],
	},
	myDoctors: {
		placeholder: 'Search doctors by name or speciality',
		hints: ['doctor name', 'cardiologist', 'last visited'],
	},
	favouriteDoctors: {
		placeholder: 'Search saved doctors by name, speciality or location',
		hints: ['doctor name', 'speciality', 'hospital'],
	},
	pharmacies: {
		placeholder: 'Search pharmacies by name, owner or city',
		hints: ['pharmacy name', 'owner', 'your city'],
	},
	radiologyCenters: {
		placeholder: 'Search scan centers by name, scan or city',
		hints: ['center name', 'MRI', 'CT scan', 'your city'],
	},
	events: {
		placeholder: 'Search events by name or topic',
		hints: ['diabetes camp', 'heart health', 'webinar', 'free checkup'],
	},
	healthQuestions: {
		placeholder: 'Search questions or symptoms',
		hints: ['back pain', 'high blood pressure', 'skin rash', 'child fever'],
	},
	healthQuestionsFeed: {
		placeholder: 'Search questions by topic or symptom',
		hints: ['diabetes', 'migraine', 'pregnancy', 'thyroid'],
	},
	healthReads: {
		placeholder: 'Search articles and blogs',
		hints: ['sleep', 'nutrition', 'heart health', 'mental wellbeing'],
	},
	careAiChats: {
		placeholder: 'Search your Care AI chats',
		hints: ['symptom', 'medicine', 'report'],
	},
	homeCareTasks: {
		placeholder: 'Search care tasks, e.g. bathing, walking',
		hints: ['bathing', 'walking', 'meal preparation', 'medication reminder'],
	},
	services: {
		placeholder: 'Search services',
		hints: ['nursing', 'physiotherapy', 'elder care', 'lab test'],
	},
	location: {
		placeholder: 'Search area, street or landmark',
		hints: ['your area', 'street name', 'landmark'],
	},

	// ── Bookings & orders (who is looking decides what is searchable) ────────
	'appointments.patient': {
		placeholder: 'Search appointments by doctor name',
		hints: ['doctor name', 'speciality', 'clinic'],
	},
	'appointments.doctor': {
		placeholder: 'Search appointments by patient name',
		hints: ['patient name', 'phone number', 'booking ID'],
	},
	'pharmacyOrders.patient': {
		placeholder: 'Search by order ID or pharmacy',
		hints: ['order ID', 'pharmacy name', 'medicine'],
	},
	'pharmacyOrders.pharmacy': {
		placeholder: 'Search by patient name or order ID',
		hints: ['patient name', 'order ID'],
	},
	'radiologyOrders.patient': {
		placeholder: 'Search by center, scan or reference ID',
		hints: ['center name', 'MRI', 'reference ID'],
	},
	'radiologyOrders.radiology': {
		placeholder: 'Search by patient name, scan or reference ID',
		hints: ['patient name', 'CT scan', 'reference ID'],
	},
	ancillaryBookings: {
		placeholder: 'Search bookings by provider, service or date',
		hints: ['provider name', 'nursing visit', 'physiotherapy', 'this week'],
	},
} as const satisfies Record<string, SearchContext>

export type SearchContextKey = keyof typeof SEARCH_CONTEXTS

/** Picks the viewer-specific entry, e.g. `searchContextFor('appointments', isDoctor ? 'doctor' : 'patient')`. */
export function searchContextFor<Base extends string, Viewer extends string>(
	base: Base,
	viewer: Viewer
): `${Base}.${Viewer}` {
	return `${base}.${viewer}`
}
