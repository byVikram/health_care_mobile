import { ImageSourcePropType } from 'react-native'

const DEFAULT_FALLBACK_IMAGE: ImageSourcePropType = require('../../../assets/ancillary/home-care.png')

const ANCILLARY_ASSET_REGISTRY: Record<string, ImageSourcePropType> = {
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
