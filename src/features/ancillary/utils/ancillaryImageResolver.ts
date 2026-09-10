import { ImageSourcePropType } from 'react-native'

const DEFAULT_FALLBACK_IMAGE: ImageSourcePropType = require('../../../assets/ancillary/home-care.png')

const ANCILLARY_ASSET_REGISTRY: Record<string, ImageSourcePropType> = {
	'bandage dressing.png': require('../../../assets/ancillary/Bandage Dressing.png'),
	'cardiac rehabilitation.png': require('../../../assets/ancillary/Cardiac Rehabilitation.png'),
	'cervical mobility therapy.png': require('../../../assets/ancillary/Cervical Mobility Therapy.png'),
	'cognitive rehabilitation.png': require('../../../assets/ancillary/Cognitive Rehabilitation.png'),
	'hand mobility therapy.png': require('../../../assets/ancillary/Hand Mobility Therapy.png'),
	'hand pain relief therapy.png': require('../../../assets/ancillary/Hand Pain Relief Therapy.png'),
	'hand strengthening therapy.png': require('../../../assets/ancillary/Hand Strengthening Therapy.png'),
	'icu care at home.png': require('../../../assets/ancillary/ICU Care at Home.png'),
	'iv drip setup.png': require('../../../assets/ancillary/IV Drip Setup.png'),
	'iv fluids and medication drip.png': require('../../../assets/ancillary/IV Fluids and Medication Drip.png'),
	'injection administration.png': require('../../../assets/ancillary/Injection Administration.png'),
	'joint mobilization therapy.png': require('../../../assets/ancillary/Joint Mobilization Therapy.png'),
	'manual therapy session.png': require('../../../assets/ancillary/Manual Therapy Session.png'),
	'neck pain relief therapy.png': require('../../../assets/ancillary/Neck Pain Relief Therapy.png'),
	'post-fracture rehabilitation.png': require('../../../assets/ancillary/Post-Fracture Rehabilitation.png'),
	'post-op knee rehab.png': require('../../../assets/ancillary/Post-Op Knee Rehab.png'),
	'post-stroke physio.png': require('../../../assets/ancillary/Post-Stroke Physio.png'),
	'post-surgical dressing.png': require('../../../assets/ancillary/Post-Surgical Dressing.png'),
	'posture correction therapy.png': require('../../../assets/ancillary/Posture Correction Therapy.png'),
	'rotator cuff rehabilitation.png': require('../../../assets/ancillary/Rotator Cuff Rehabilitation.png'),
	'ryle\'s tube feeding and care.png': require('../../../assets/ancillary/Ryle\'s Tube Feeding and Care.png'),
	'shoulder mobility therapy.png': require('../../../assets/ancillary/Shoulder Mobility Therapy.png'),
	'shoulder pain relief therapy.png': require('../../../assets/ancillary/Shoulder Pain Relief Therapy.png'),
	'sports injury rehab.png': require('../../../assets/ancillary/Sports Injury Rehab.png'),
	'therapeutic exercise guidance.png': require('../../../assets/ancillary/Therapeutic Exercise Guidance.png'),
	'tracheostomy care.png': require('../../../assets/ancillary/Tracheostomy Care.png'),
	'vitals and sugar check.png': require('../../../assets/ancillary/Vitals and Sugar Check.png'),
	'wound dressing and care.png': require('../../../assets/ancillary/Wound Dressing and Care.png'),
	'elder-day-care.png': require('../../../assets/ancillary/elder-day-care.png'),
	'home-care.png': require('../../../assets/ancillary/home-care.png'),
	'nursing-care.png': require('../../../assets/ancillary/nursing-care.png'),
	'physiotherapy.png': require('../../../assets/ancillary/physiotherapy.png'),
}

function normalizeKey(path: string): string {
	let key = path.trim().toLowerCase()
	key = key.replace(/^\/+/, '')
	// Bundler asset URLs break on '&' (Expo web treats it as a query-string
	// separator), so renamed physical files use 'and' -- normalize DB-supplied
	// identifiers that still contain the original '&' the same way.
	key = key.replace(/&/g, 'and')
	if (key.startsWith('assets/')) {
		key = key.substring(7)
	}
	if (key.startsWith('ancillary/')) {
		key = key.substring(10)
	}
	if (!key.includes('.')) {
		key = `${key}.png`
	}
	return key
}

/**
 * Generic asset resolver for DB-driven ancillary procedure images.
 * Resolves static bundled assets by path/identifier or remote URLs (http/https).
 */
export function getAncillaryImageSource(
	imageUrl?: string | null,
	fallback?: ImageSourcePropType
): ImageSourcePropType {
	if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.trim()) {
		return fallback || DEFAULT_FALLBACK_IMAGE
	}

	const trimmed = imageUrl.trim()
	if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
		return { uri: trimmed }
	}

	const normalized = normalizeKey(trimmed)
	if (ANCILLARY_ASSET_REGISTRY[normalized]) {
		return ANCILLARY_ASSET_REGISTRY[normalized]
	}

	const withSpaces = normalized.replace(/-/g, ' ')
	if (ANCILLARY_ASSET_REGISTRY[withSpaces]) {
		return ANCILLARY_ASSET_REGISTRY[withSpaces]
	}

	const withDashes = normalized.replace(/\s+/g, '-')
	if (ANCILLARY_ASSET_REGISTRY[withDashes]) {
		return ANCILLARY_ASSET_REGISTRY[withDashes]
	}

	return fallback || DEFAULT_FALLBACK_IMAGE
}
