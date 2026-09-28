// src/features/ancillary/utils/ancillaryCatalogCopy.ts
//
// Copy + icon paths for the home-care service catalogue (AncillaryServiceCatalogScreen) and its details sheets.
// The catalogue is generic across every home-care type (nursing-care, home-care, physiotherapy, rehab-care,
// medical-equipment): labels come from the serviceKey / serviceLabel route params, and only nursing gets the
// nurse-specific wording from the design ("Nursing procedures", "Sterile supplies included", ...).

/** 24x24 stroke paths from the "Nursing care at home" design (render with AppPathIcon). */
export const CATALOG_ICONS = {
	grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
	box: 'M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8',
	syringe:
		'M18 2l4 4M17 7l3-3M19 9l-8.7 8.7a2 2 0 0 1-2.8 0l-2.2-2.2a2 2 0 0 1 0-2.8L14 4M9 11l4 4M5 19l-3 3M14 4l6 6',
	bandage: 'M18.5 5.5a3.5 3.5 0 0 0-5 0l-8 8a3.5 3.5 0 0 0 5 5l8-8a3.5 3.5 0 0 0 0-5zM10 10h.01M14 14h.01M10 14h.01M14 10h.01',
	drip: 'M8 3h8v7a4 4 0 0 1-8 0zM8 7h8M12 14v3M12 17c0 2 1 4 4 4',
	elder: 'M3 11l9-7 9 7M5 10v10h14V10M12 17.5s-3-1.8-3-4a1.5 1.5 0 0 1 3-.8 1.5 1.5 0 0 1 3 .8c0 2.2-3 4-3 4z',
	vitals: 'M3 12h4l2-4 4 8 2-4h6',
	surgery: 'M8 3h8M9 3v18M15 3v18M9 11h6M6 21h6M12 21h6',
	catheter: 'M6 3v6a6 6 0 0 0 12 0V3M12 15v6M9 21h6',
	critical: 'M3 4h18v12H3zM8 20h8M12 16v4M6 10h3l2-3 2 6 2-3h3',
	kit: ['M5 4h14v17H5z', 'M9 4V3h6v1', 'M12 9v7M8.5 12.5h7'],
	clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
	user: 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21v-1a8 8 0 0 1 16 0v1',
	userCheck: ['M10 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M3 21a7 7 0 0 1 14 0', 'M16 11l2 2 4-4'],
	home: 'M4 11l8-7 8 7M6 10v10h12V10',
	notes: ['M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z', 'M14 3v5h5M9 13h6M9 17h6'],
	calendar: 'M4 6h16v14H4zM4 10h16M9 3v4M15 3v4',
	wallet: 'M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H3zM3 7V5a2 2 0 0 1 2-2h11M16 14h.01',
	walk: 'M13 4a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM9 21l2-6 3 3v3M8 11l3-3 3 2 3 1M11 15l-1-4',
	bone: 'M7 17l10-10M6 14a2.5 2.5 0 1 1-2-4 2.5 2.5 0 1 1 4-2M18 10a2.5 2.5 0 1 1 2 4 2.5 2.5 0 1 1-4 2',
	brain: 'M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 3 5 3 3 0 0 0 3 3V4zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-3 5 3 3 0 0 1-3 3V4z',
	heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
	wheelchair: 'M10 4a1.5 1.5 0 1 0 0-3M10 6v7h6l2 5M7 10a6 6 0 1 0 8 7',
	lungs: 'M12 4v8M12 12c-2 0-3-2-5-2-2 0-3 3-3 6s1 4 3 4 5-1 5-4M12 12c2 0 3-2 5-2 2 0 3 3 3 6s-1 4-3 4-5-1-5-4',
	plus: 'M12 5v14M5 12h14',
} satisfies Record<string, string | string[]>

export type CatalogIconPath = string | string[]

// Keyword -> icon for API category labels ("Wound & Recovery Care", "Knee Pain", ...). First match wins.
const CATEGORY_ICON_RULES: [RegExp, CatalogIconPath][] = [
	[/inject|vaccin|general nursing/i, CATALOG_ICONS.syringe],
	[/wound|dress|bandage|ulcer|burn/i, CATALOG_ICONS.bandage],
	[/\biv\b|drip|infusion|fluid/i, CATALOG_ICONS.drip],
	[/elder|senior|geriatric|companion|day care|attendant/i, CATALOG_ICONS.elder],
	[/vital|bp|sugar|monitor/i, CATALOG_ICONS.vitals],
	[/surg|post.?op|recovery/i, CATALOG_ICONS.surgery],
	[/cathet|urin/i, CATALOG_ICONS.catheter],
	[/critical|icu|high dependency|trache|ventil/i, CATALOG_ICONS.critical],
	[/stroke|neuro|cognit|brain/i, CATALOG_ICONS.brain],
	[/cardiac|heart/i, CATALOG_ICONS.heart],
	[/knee|back|neck|shoulder|hand|leg|joint|bone|fracture|ortho|pain/i, CATALOG_ICONS.bone],
	[/sport|mobility|walk|exercise|physio/i, CATALOG_ICONS.walk],
	[/wheelchair|equipment|bed|rental|walker/i, CATALOG_ICONS.wheelchair],
	[/oxygen|respir|lung|breath|nebul/i, CATALOG_ICONS.lungs],
]

export const categoryIconFor = (label: string): CatalogIconPath =>
	CATEGORY_ICON_RULES.find(([re]) => re.test(label))?.[1] ?? CATALOG_ICONS.kit

const NOUNS: Record<string, [string, string]> = {
	'nursing-care': ['nurse', 'nurses'],
	physiotherapy: ['physiotherapist', 'physiotherapists'],
	'rehab-care': ['rehab therapist', 'rehab therapists'],
	'home-care': ['caregiver', 'caregivers'],
	'medical-equipment': ['technician', 'technicians'],
}

const SEARCH_PLACEHOLDERS: Record<string, string> = {
	'nursing-care': 'Search e.g. dressing, IV, injection',
	physiotherapy: 'Search e.g. back pain, knee pain',
	'rehab-care': 'Search e.g. stroke, cardiac rehab',
	'home-care': 'Search e.g. bathing, mobility, companion',
	'medical-equipment': 'Search e.g. wheelchair, oxygen',
}

/** "Nursing Care" -> "Nursing care". */
export const sentenceCase = (label: string) => {
	const s = label.trim().toLowerCase()
	return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

export type CatalogTrustChip = { key: string; label: string; icon: CatalogIconPath }

export type AncillaryCatalogCopy = {
	isNursing: boolean
	/** "Nursing care at home". */
	title: string
	/** "Verified nurses · Visits 7 AM–9 PM, every day". */
	subtitle: string
	searchPlaceholder: string
	searchAccessibilityLabel: string
	providerNoun: string
	/** Tab label for the single-service list ("Procedures" for nursing, "Services" otherwise). */
	servicesTabLabel: string
	packagesTitle: string
	packagesSubtitle: string
	servicesTitle: string
	servicesSubtitle: string
	/** Sheet title / kind label for a single service. */
	serviceKind: string
	packageKind: string
	careForSubtitle: string
	trustChips: CatalogTrustChip[]
	emptyCartHint: string
	emptySearchHint: string
	emptyCatalogHint: string
	prepTitle: string
	trustLine: string
}

export const getAncillaryCatalogCopy = (serviceKey: string, serviceLabel: string): AncillaryCatalogCopy => {
	const isNursing = serviceKey === 'nursing-care'
	const label = sentenceCase(serviceLabel) || 'Home care'
	const lower = label.toLowerCase()
	const [noun, nouns] = NOUNS[serviceKey] ?? ['care professional', 'care professionals']

	return {
		isNursing,
		title: `${label} at home`,
		subtitle: `Verified ${nouns} · Visits 7 AM–9 PM, every day`,
		searchPlaceholder: SEARCH_PLACEHOLDERS[serviceKey] ?? `Search ${lower} services`,
		searchAccessibilityLabel: `Search ${lower} services`,
		providerNoun: noun,
		servicesTabLabel: isNursing ? 'Procedures' : 'Services',
		packagesTitle: 'Care packages',
		packagesSubtitle: isNursing ? 'Multi-day nursing plans at your home' : `Multi-visit ${lower} plans at your home`,
		servicesTitle: isNursing ? 'Nursing procedures' : `${label} services`,
		servicesSubtitle: isNursing
			? 'A qualified nurse visits your home for each one'
			: `A verified ${noun} visits your home for each one`,
		serviceKind: isNursing ? 'Nursing procedure' : `${label} service`,
		packageKind: 'Care package',
		careForSubtitle: `${label} services grouped by need`,
		trustChips: isNursing
			? [
					{ key: 'verified', label: 'Background-verified nurses', icon: CATALOG_ICONS.userCheck },
					{ key: 'supplies', label: 'Sterile supplies included', icon: CATALOG_ICONS.kit },
					{ key: 'notes', label: 'Visit notes in the app', icon: CATALOG_ICONS.notes },
				]
			: [
					{ key: 'verified', label: `Background-verified ${nouns}`, icon: CATALOG_ICONS.userCheck },
					{ key: 'pay', label: 'Pay after your visit', icon: CATALOG_ICONS.wallet },
					{ key: 'notes', label: 'Visit notes in the app', icon: CATALOG_ICONS.notes },
				],
		emptyCartHint: `Add a service to book a ${noun} visit`,
		emptySearchHint: isNursing
			? 'Try “dressing” or “injection”, or browse all services.'
			: 'Try another word, or browse all services.',
		emptyCatalogHint: `No ${lower} services are available right now. Please check again later.`,
		prepTitle: `Before the ${noun} arrives`,
		trustLine: isNursing
			? 'Qualified nurse at home · visit notes in the app'
			: `Verified ${noun} at home · visit notes in the app`,
	}
}

/** 45 -> "45 mins", 60 -> "1 hr", 90 -> "1 hr 30 mins". */
export const formatDurationMinutes = (minutes?: number | null) => {
	if (minutes == null || !Number.isFinite(minutes) || minutes <= 0) return ''
	const m = Math.round(minutes)
	if (m < 60) return `${m} mins`
	const h = Math.floor(m / 60)
	const rest = m % 60
	return rest ? `${h} hr ${rest} mins` : `${h} hr`
}

/** "₹4,499" (whole rupees). */
export const rupees = (amount: number) =>
	`₹${amount.toLocaleString('en-IN', { maximumFractionDigits: Number.isInteger(amount) ? 0 : 2 })}`

/** Discount percentage when the MRP is above the price, else null. */
export const percentOff = (price: number, mrp?: number | null) =>
	mrp != null && mrp > price && mrp > 0 ? Math.round(((mrp - price) / mrp) * 100) : null

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
