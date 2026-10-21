// src/navigation/NavigationConfigContext.tsx
//
// The signed-in user's menu (sidebar + bottom tabs), fetched once per session from GET /api/lookup/navigation and again
// whenever the app comes back to the foreground, so a menu edited in the backend shows up without a new login.
// Until the first response (or when the request fails, or the backend has no menu for this role) the built-in
// DEFAULT_MENU is used, so the app never renders without a menu. Never throws.
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { AppState } from 'react-native'
import { useAuth } from '../context/AuthContext'
import { getNavigation, type NavigationResponse } from '../services/navigationConfigService'
import { registerSessionCache } from '../utils/sessionCache'
import { DEFAULT_MENU, menuRoleFor, type NavigationConfig } from './menuConfig'

// The last good response (and its ETag), so a remount renders the real menu immediately and the next fetch can ask for
// a 304. It belongs to the signed-in user's role: dropped on logout / session expiry.
let cached: { menu: NavigationResponse; etag?: string } | null = null
registerSessionCache(() => {
	cached = null
})

/** The server's menu, with each list falling back to the built-in one when the server sent it empty. */
function resolve(response: NavigationResponse | null, role: ReturnType<typeof menuRoleFor>): NavigationConfig {
	const defaults = DEFAULT_MENU[role]
	return {
		bottomTabs: response?.bottom_tabs.length ? response.bottom_tabs : defaults.bottomTabs,
		sidebar: response?.sidebar.length ? response.sidebar : defaults.sidebar,
	}
}

const NavigationConfigContext = createContext<NavigationConfig>(DEFAULT_MENU.other)

export function NavigationConfigProvider({ children }: { children: React.ReactNode }) {
	const { role } = useAuth()
	const menuRole = menuRoleFor(role)
	const [response, setResponse] = useState<NavigationResponse | null>(cached?.menu ?? null)

	useEffect(() => {
		let active = true
		const load = async () => {
			try {
				const next = await getNavigation(cached?.etag)
				if (!active || !next || next === 'unchanged' || next.menu.version === cached?.menu.version) return
				cached = next
				setResponse(next.menu)
			} catch {
				// Soft-fail: keep what is showing (the cached or built-in menu).
			}
		}
		void load()
		const subscription = AppState.addEventListener('change', (state) => {
			if (state === 'active') void load()
		})
		return () => {
			active = false
			subscription.remove()
		}
	}, [])

	const config = useMemo(() => resolve(response, menuRole), [response, menuRole])
	return <NavigationConfigContext.Provider value={config}>{children}</NavigationConfigContext.Provider>
}

/** The menu to draw for the signed-in user (sidebar rows and bottom tabs, in display order). */
export const useNavigationConfig = () => useContext(NavigationConfigContext)
