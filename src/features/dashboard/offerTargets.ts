import { ROUTES } from '../../navigation/routes'

// An offer's in-app target comes from the server (the ads CMS), so it is checked before anything is navigated to.
// Only browse / entry screens are allowed: no payment, wallet, profile or order screens, and nothing that needs an
// object handed in (a doctor, an order). An offer for something else uses an https link instead.
const OFFER_ROUTES: ReadonlySet<string> = new Set<string>([
	ROUTES.MAIN.HOME,
	ROUTES.MAIN.SEARCH,
	ROUTES.MAIN.PORTAL,
	ROUTES.MAIN.ANCILLARY,
	ROUTES.STACK.SEARCH,
	ROUTES.STACK.DOCTOR_SEARCH,
	ROUTES.STACK.ALL_SPECIALITIES,
	ROUTES.STACK.PHARMACY_SEARCH_PAGE,
	ROUTES.STACK.LABORATORY_LIST,
	ROUTES.STACK.RADIOLOGY_LIST,
	ROUTES.STACK.ANCILLARY_SERVICES,
	ROUTES.STACK.HOME_CARE_CATALOG,
	ROUTES.STACK.CAREGIVER_SERVICES,
	ROUTES.STACK.ALL_EVENTS,
	ROUTES.STACK.BLOG_LIST,
	ROUTES.STACK.COMMUNITY_FORUM,
	ROUTES.STACK.PATIENT_QUESTIONS_LIST,
	ROUTES.STACK.CARE_AI,
])

const PARAM_KEY = /^[A-Za-z_][A-Za-z0-9_]{0,40}$/
const MAX_PARAM_TEXT = 200

/** Plain values only (text, numbers, true / false): no nested objects, no oversized text, no odd key names. */
const cleanParams = (params: unknown): Record<string, string | number | boolean> | undefined => {
	if (!params || typeof params !== 'object' || Array.isArray(params)) return undefined
	const out: Record<string, string | number | boolean> = {}
	for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
		if (!PARAM_KEY.test(key)) continue
		if (typeof value === 'string' && value.length <= MAX_PARAM_TEXT) out[key] = value
		else if (typeof value === 'number' && Number.isFinite(value)) out[key] = value
		else if (typeof value === 'boolean') out[key] = value
	}
	return Object.keys(out).length ? out : undefined
}

/** The route and params an offer may open, or null when its target is not on the allowed list. */
export const resolveOfferRoute = (
	route: unknown,
	params?: unknown
): { name: string; params?: Record<string, string | number | boolean> } | null => {
	if (typeof route !== 'string' || !OFFER_ROUTES.has(route)) return null
	return { name: route, params: cleanParams(params) }
}
