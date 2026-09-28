// src/utils/sessionCache.ts
//
// Registry for in-memory, per-user caches (module-level values that outlive a screen). Anything that caches
// data belonging to the signed-in user registers a reset here; AuthContext calls clearSessionCaches() when
// auth is cleared (logout / session expiry) and when a new login is stored, so the next user never sees the
// previous user's data.
type Reset = () => void

const resets = new Set<Reset>()

/** Register a reset for a per-user cache. Returns an unregister function. */
export const registerSessionCache = (reset: Reset) => {
	resets.add(reset)
	return () => {
		resets.delete(reset)
	}
}

/** Clear every registered per-user cache. Never throws. */
export const clearSessionCaches = () => {
	resets.forEach((reset) => {
		try {
			reset()
		} catch {
			// A failing reset must not block logout.
		}
	})
}
