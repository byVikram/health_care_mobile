import { Linking } from 'react-native'

/**
 * Open a server-supplied URL (offers, events, podcasts, report files). Only https
 * is allowed: the value comes from the API/CMS, so schemes like `intent:`, `file:`,
 * `javascript:` or another app's deep link must never be handed to the OS.
 * Throws when the URL is not openable, so callers keep their existing catch/fallback.
 */
export function isSafeWebUrl(url: unknown): url is string {
	if (typeof url !== 'string') return false
	return /^https:\/\/[^\s/?#]+/i.test(url.trim())
}

export async function openWebUrl(url: unknown): Promise<void> {
	if (!isSafeWebUrl(url)) throw new Error('Blocked: not an https URL')
	await Linking.openURL(url.trim())
}
