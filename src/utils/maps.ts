// src/utils/maps.ts
import { Linking, Platform } from 'react-native'

/** Opens the native maps app (falling back to Google Maps on the web) for a given address/name. */
export function openOnMap(address: string | undefined, name: string | undefined) {
	const query = encodeURIComponent(((address ? address + ', ' : '') + (name ?? '')).trim())
	if (!query) return
	const nativeUrl = Platform.select({
		ios: `maps:0,0?q=${query}`,
		android: `geo:0,0?q=${query}`,
	})
	const webUrl = `https://www.google.com/maps/search/?api=1&query=${query}`
	if (nativeUrl) {
		Linking.canOpenURL(nativeUrl)
			.then((supported) => Linking.openURL(supported ? nativeUrl : webUrl))
			.catch(() => Linking.openURL(webUrl))
	} else {
		Linking.openURL(webUrl)
	}
}

/**
 * Turn-by-turn directions to a coordinate (a clinic, or a provider heading to a home visit). Falls back to
 * the address (+ place name) search when there's no coordinate.
 */
export async function openDirections(
	latitude?: number | null,
	longitude?: number | null,
	address?: string,
	name?: string,
) {
	if (latitude == null || longitude == null) {
		openOnMap(address, name)
		return
	}
	const dest = `${latitude},${longitude}`
	const nativeUrl = Platform.select({
		ios: `maps:0,0?daddr=${dest}`,
		android: `google.navigation:q=${dest}`,
	})
	const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${dest}`
	try {
		const supported = nativeUrl ? await Linking.canOpenURL(nativeUrl) : false
		await Linking.openURL(supported && nativeUrl ? nativeUrl : webUrl)
	} catch {
		await Linking.openURL(webUrl).catch(() => undefined)
	}
}

/** Opens the dialer; no-op without a number. */
export async function callPhone(phone?: string | null) {
	if (!phone) return
	await Linking.openURL(`tel:${phone}`).catch(() => undefined)
}
