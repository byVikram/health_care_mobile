/**
 * Safely parse a JSON string with a fallback value to prevent runtime crashes.
 */
export function safeJsonParse<T = any>(jsonString: string | null | undefined, fallback: any = null): T | null {
	if (!jsonString) return fallback
	try {
		const parsed = JSON.parse(jsonString)
		return parsed !== undefined ? (parsed as T) : fallback
	} catch (error) {
		if (__DEV__) {
			console.warn('[safeJsonParse] Failed to parse JSON payload:', error)
		}
		return fallback
	}
}
