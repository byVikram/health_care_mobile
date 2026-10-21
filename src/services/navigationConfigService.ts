// src/services/navigationConfigService.ts
//
// GET /api/lookup/navigation: the signed-in user's sidebar and bottom tabs (keys + label + icon key, already ordered).
// Named navigationConfig... so it is not mistaken for src/navigation/navigationService.ts (the imperative navigate()).
import ApiService from './apiService'
import { API_ENDPOINTS } from '../constants/apiUrls'
import type { NavSidebarItem, NavTab } from '../navigation/menuConfig'

export interface NavigationResponse {
	role: string
	/** Changes whenever the menu does; also the ETag. */
	version: string
	bottom_tabs: NavTab[]
	sidebar: NavSidebarItem[]
}

type Envelope<T> = { success: boolean; message?: string; data: T }

/** A fresh menu, 'unchanged' (304: the menu still matches `etag`), or null when the response had no menu. */
export type NavigationFetch = { menu: NavigationResponse; etag?: string } | 'unchanged' | null

/** @param etag The ETag of the menu the app already has: an unchanged menu answers 304 with no body. */
export const getNavigation = async (etag?: string): Promise<NavigationFetch> => {
	const res = await ApiService.get<Envelope<NavigationResponse>>(API_ENDPOINTS.NAVIGATION, {
		headers: etag ? { 'If-None-Match': etag } : undefined,
		validateStatus: (status) => (status >= 200 && status < 300) || status === 304,
	})
	if (res.status === 304) return 'unchanged'
	const menu = res.data?.data
	return menu ? { menu, etag: res.headers?.etag } : null
}
