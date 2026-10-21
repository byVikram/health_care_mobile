// src/features/ancillary/hooks/useServerSearch.ts
//
// Search is done by the backend (GET /api/ancillary/services?search=, /packages?search=): this hook only sends what the
// user types. It waits a moment after the last keystroke (so a fast typist makes one request, not one per letter), drops
// the answer of any request that a newer one has replaced (so a slow earlier answer can never overwrite a newer one), and
// goes back to `null` as soon as the text is cleared, so the screen shows its full list again without a request. When a
// request fails `results` is `null` too and `failed` is set: the screen must show its "search unavailable" state, never the
// previous answer or the full list, because neither matches the text that was typed.
import { useEffect, useRef, useState } from 'react'

const SEARCH_DELAY_MS = 300

export interface ServerSearchState<T> {
	/** The server's answer for the current text; null while the text is empty (show the full list). */
	results: T | null
	/** A request is waiting to be sent or is in flight. */
	searching: boolean
	/** The last request failed (`results` is null): show a "search unavailable" state, not a list. */
	failed: boolean
}

// One shared object, so clearing the box (or mounting the screen) is not a state change: no extra render.
const IDLE = { results: null, searching: false, failed: false } as const

export function useServerSearch<T>(text: string, search: (text: string) => Promise<T>): ServerSearchState<T> {
	const [state, setState] = useState<ServerSearchState<T>>(IDLE)
	// The latest `search` callback without making it a dependency (screens pass a new arrow function every render).
	const searchRef = useRef(search)
	searchRef.current = search
	const latest = useRef(0)

	useEffect(() => {
		const query = text.trim()
		const id = ++latest.current
		if (!query) {
			setState(IDLE)
			return
		}
		setState((prev) => ({ ...prev, searching: true }))
		const timer = setTimeout(async () => {
			try {
				const results = await searchRef.current(query)
				if (id === latest.current) setState({ results, searching: false, failed: false })
			} catch {
				if (id === latest.current) setState({ results: null, searching: false, failed: true })
			}
		}, SEARCH_DELAY_MS)
		return () => clearTimeout(timer)
	}, [text])

	return state
}
