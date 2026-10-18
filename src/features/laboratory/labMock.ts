// src/features/laboratory/labMock.ts
//
// Types, icons and static copy for the Lab Tests Ordering flow. The catalogue, labs, slots and prices come
// from the API (labService.ts / labCatalogue.ts); what is still mock here is the payment-method labels, the
// order-screen copy and the demo report, which stay until the order backend is built.

// ---------------------------------------------------------------------------------------------------------
// Catalogue
// ---------------------------------------------------------------------------------------------------------

type LabItemKind = 'package' | 'test'

export type LabItem = {
	id: string
	kind: LabItemKind
	name: string
	about: string
	/** "Good for" line in the details sheet. */
	forWho: string
	/** MRP only: the API exposes no other price, so price === mrp. */
	price: number
	mrp: number
	/** "Reports in 24 hrs" / "Report in 24 hrs" */
	report: string
	fasting: boolean
	/** "10–12 hrs" when fasting is needed. */
	fastingLabel?: string
	sample: string
	/** Packages only: how many tests it bundles. */
	tests?: number
	/** Packages only: [group name, number of tests]. */
	includes?: [string, number][]
	bullets: string[]
	/** Concern ids this item belongs to. */
	tags: string[]
	/** Packages: the names of the tests it bundles (from the item detail; empty until that is loaded). */
	includedTests?: string[]
	/** Preparation notes from the lab, one per line. */
	preparations?: string[]
}

// ---------------------------------------------------------------------------------------------------------
// Catalogue chrome: type tabs, "Shop by concern" tiles
// ---------------------------------------------------------------------------------------------------------

export type LabTypeId = 'all' | 'packages' | 'tests'

export const LAB_TYPES: { id: LabTypeId; label: string; icon: string }[] = [
	{ id: 'all', label: 'All', icon: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z' },
	{ id: 'packages', label: 'Packages', icon: 'M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8' },
	{
		id: 'tests',
		label: 'Single tests',
		icon: 'M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3M7.5 15h9',
	},
]

export type LabConcern = {
	id: string
	label: string
	bg: string
	ink: string
	icon: string
	/** The catalogue has no concern grouping: a tile searches these keywords and merges the results. */
	queries: string[]
}

export const LAB_CONCERNS: LabConcern[] = [
	{
		id: 'diabetes',
		label: 'Diabetes',
		bg: '#DDEBFA',
		ink: '#2463A8',
		icon: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z',
		queries: ['hba1c', 'glucose', 'diabet'],
	},
	{
		id: 'thyroid',
		label: 'Thyroid',
		bg: '#ECE6FA',
		ink: '#6A4BB5',
		icon: 'M12 7v12M12 11c-1.5-3.5-7-4-7 0 0 3.5 4 5 7 3M12 11c1.5-3.5 7-4 7 0 0 3.5-4 5-7 3M10 5l2 2 2-2',
		queries: ['thyroid', 'tsh'],
	},
	{
		id: 'heart',
		label: 'Heart',
		bg: '#FDE8DC',
		ink: '#B4532A',
		icon: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10zM7 12h3l1.5-2 2 4 1.5-2h2',
		queries: ['lipid', 'cholesterol', 'cardiac', 'troponin'],
	},
	{
		id: 'vitamins',
		label: 'Vitamins',
		bg: '#FBEFD5',
		ink: '#8A5300',
		icon: 'M7.1 16.9a3 3 0 0 1 0-4.2l5.6-5.6a3 3 0 0 1 4.2 4.2l-5.6 5.6a3 3 0 0 1-4.2 0zM9.9 9.9l4.2 4.2',
		queries: ['vitamin', 'b12', 'folate'],
	},
	{
		id: 'kidney',
		label: 'Kidney',
		bg: '#E3EFEF',
		ink: '#2B6F71',
		icon: 'M9 4C5.5 4 4 7.5 4 11s1.5 9 5.5 9c2.5 0 3.5-2 3.5-3.5S11.5 14 11.5 12 13 9.5 13 7.5 11.5 4 9 4zM16 8c2 1 3 3 3 5s-1 4-3 5',
		queries: ['kidney', 'creatinine', 'urea', 'renal'],
	},
	{
		id: 'liver',
		label: 'Liver',
		bg: '#FDE8DC',
		ink: '#B4532A',
		icon: 'M3 9.5C3 6.5 6 5 10 5h8c1.8 0 3 1.2 3 3 0 4.5-5.5 11-11.5 11C5.5 19 3 14.5 3 9.5zM12 5v7',
		queries: ['liver', 'sgot', 'sgpt', 'bilirubin'],
	},
	{
		id: 'fever',
		label: 'Fever and infection',
		bg: '#DDEBFA',
		ink: '#2463A8',
		icon: 'M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0zM12 10v7',
		queries: ['dengue', 'malaria', 'typhoid', 'widal', 'cbc'],
	},
	{
		id: 'women',
		label: 'Women’s health',
		bg: '#ECE6FA',
		ink: '#6A4BB5',
		icon: 'M12 14a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 14v7M9 18h6',
		queries: ['pcos', 'prolactin', 'amh', 'pregnan'],
	},
]

/** Icons used across the lab screens (24x24 stroke paths, taken from the design). */
export const LAB_ICONS = {
	flask: 'M9 3h6M10 3v6L4.8 18.2A1.9 1.9 0 0 0 6.4 21h11.2a1.9 1.9 0 0 0 1.6-2.8L14 9V3M7.5 15h9',
	package:
		'M5 4h14v17H5zM9 4V3h6v1M12 17s-3.5-2-3.5-4.3A1.8 1.8 0 0 1 12 11.6a1.8 1.8 0 0 1 3.5 1.1C15.5 15 12 17 12 17z',
	drop: 'M12 3s6 6.6 6 11a6 6 0 0 1-12 0c0-4.4 6-11 6-11z',
	clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
	fast: 'M5 3v7a3 3 0 0 0 6 0V3M8 3v18M16 21V3c2 0 3 3 3 7s-1 5-3 5',
	home: 'M4 11l8-7 8 7M6 10v10h12V10',
	house: 'M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
	clinic: 'M3 21h18M5 21V8l7-5 7 5v13M10 21v-5h4v5M12 8v4M10 10h4',
	calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
	cart: 'M3 4h2l2.4 11.2a1 1 0 0 0 .8.8h9.2a1 1 0 0 0 1-.8L20 8H6.2M9 20.5a.5.5 0 1 0 0 .01M18 20.5a.5.5 0 1 0 0 .01',
	search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
	close: 'M6 6l12 12M18 6L6 18',
	check: 'M5 12.5l4.5 4.5L19 7.5',
	plus: 'M12 5v14M5 12h14',
	chevronRight: 'M9 6l6 6-6 6',
	chevronLeft: 'M15 18l-6-6 6-6',
	chevronDown: 'M6 9l6 6 6-6',
	swap: 'M17 3l4 4-4 4M21 7H9M7 21l-4-4 4-4M3 17h12',
	user: 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21v-1a8 8 0 0 1 16 0v1',
	info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 8v5M12 16h.01',
	shield: 'M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6zM8.5 12l2.5 2.5 4.5-4.5',
	lock: 'M8 11V8a4 4 0 0 1 8 0v3M6 11h12v9H6z',
	share: 'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.6 13.5l6.8 4M15.4 6.5l-6.8 4',
	help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.7M12 17h.01',
	document: 'M14 3v5h5M6 3h8l5 5v13H6zM9 13h6M9 17h6',
	qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2M14 18h2v2M18 18h2v2',
	chat: 'M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12zM9.5 11h5M9.5 14h3',
	person: 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21v-1a8 8 0 0 1 16 0v1',
	download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
	stethoscope: 'M5 3v5a5 5 0 0 0 10 0V3M10 13v3a4 4 0 0 0 8 0v-3M18 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
	order: 'M9 3h6v3H9zM8 4.5H6V21h12V4.5h-2M9 11h6M9 15h4',
	phone: 'M11 18h2',
	card: 'M3 10h18M7 15h4M4 6h16v12H4z',
	bank: 'M3 10l9-6 9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 21h18',
	cash: 'M16 12.5h2M3 10h18M4 6h16v12H4z',
	tag: 'M12 3H5v7l9 9 7-7zM8.5 8.5h.01',
	pin: 'M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
	gps: 'M12 19a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 2v3M12 19v3M2 12h3M19 12h3',
} as const

// ---------------------------------------------------------------------------------------------------------
// Payment
// ---------------------------------------------------------------------------------------------------------

export type LabPayMethod = 'upi' | 'card' | 'netbank' | 'later'

export const PAY_METHOD_LABELS: Record<LabPayMethod, string> = {
	upi: 'UPI',
	card: 'Card',
	netbank: 'Net banking',
	later: 'Pay at collection',
}

// ---------------------------------------------------------------------------------------------------------
// Order screen
// ---------------------------------------------------------------------------------------------------------

export const CANCEL_REASONS = ['Can’t be home', 'Booked by mistake', 'Found a better price', 'Doctor changed tests']

export const RESCHEDULE_PICKUP_WINDOWS = ['6–8 AM', '7–9 AM', '8–10 AM', '9–11 AM']
export const RESCHEDULE_DAY_COUNT = 7

// ---------------------------------------------------------------------------------------------------------
// Report screen (a finished demo order)
// ---------------------------------------------------------------------------------------------------------

export type LabReportResult = {
	name: string
	value: string
	unit: string
	range: string
	/** Where the marker sits on the bar, 0-100. */
	position: number
	status: 'Normal' | 'High' | 'Low'
}

export const DEMO_REPORT = {
	orderId: 'KH-48213',
	title: 'Complete Blood Count',
	collected: 'Fri 12 Sep',
	ready: 'Sat 13 Sep',
	parameters: 21,
	inRange: 19,
	toReview: 2,
	paid: '₹349 via UPI',
	patient: { name: 'Vikram K.', relation: 'Self' },
	collectedAt: { title: 'Home', sub: '14, 2nd Cross, Chickpet, Bengaluru' },
	lab: { name: 'Karola Labs · Indiranagar', sub: 'NABL accredited' },
	results: [
		{ name: 'Haemoglobin', value: '13.8', unit: 'g/dL', range: '13.0–17.0', position: 42, status: 'Normal' },
		{ name: 'White blood cells', value: '11.8', unit: '×10³/µL', range: '4.0–11.0', position: 86, status: 'High' },
		{ name: 'Platelets', value: '2.4', unit: 'lakh/µL', range: '1.5–4.1', position: 38, status: 'Normal' },
		{ name: 'ESR', value: '24', unit: 'mm/hr', range: '0–15', position: 90, status: 'High' },
	] as LabReportResult[],
	status: [
		{ title: 'Order placed', sub: 'Wed 10 Sep' },
		{ title: 'Sample collected', sub: 'Fri 12 Sep, 8:05 AM' },
		{ title: 'Processed at lab', sub: 'Fri 12 Sep' },
		{ title: 'Report ready', sub: 'Sat 13 Sep, 9:30 AM' },
	],
}
