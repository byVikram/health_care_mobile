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
