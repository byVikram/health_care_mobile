// src/services/homeService.ts
//
// API layer for the patient Home redesign (header bell, offers carousel, health reads, communities,
// drawer / QR summary, SOS numbers, home-care starting prices). Contract: see the phase-3 notes —
// every endpoint returns the backend's `{ success, message, data }` envelope.
import ApiService from './apiService'
import { API_ENDPOINTS } from '../constants/apiUrls'
import type { ToneKey } from '../config/theme'

type Envelope<T> = { success: boolean; message?: string; data: T }

// ---- Notifications ----

export const getUnreadNotificationCount = async (): Promise<number> => {
	const res = await ApiService.get<Envelope<{ count: number }>>(API_ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT)
	return res.data?.data?.count ?? 0
}

export const markAllNotificationsRead = async (): Promise<number> => {
	const res = await ApiService.post<Envelope<{ updated: number }>>(API_ENDPOINTS.NOTIFICATIONS.READ_ALL, {})
	return res.data?.data?.updated ?? 0
}

// ---- Offers carousel (ads placement "home_offers") ----

export type HomeOfferTarget =
	| { type: 'route'; route: string; params?: Record<string, unknown> }
	| { type: 'url'; url: string }

export interface HomeOffer {
	public_id: string
	tag?: string | null
	title: string
	subtitle?: string | null
	cta_label?: string | null
	tone?: ToneKey | 'ink' | null
	target?: HomeOfferTarget | null
	image_url?: string | null
}

export const HOME_OFFERS_PLACEMENT = 'home_offers'

interface AdPlacementConfig {
	placement?: string
	ads?: HomeOffer[]
	items?: HomeOffer[]
}

/** Active offers for the Home carousel. Accepts either a list of placement configs or a flat ad list. */
export const getHomeOffers = async (): Promise<HomeOffer[]> => {
	const res = await ApiService.getWithParams<Envelope<AdPlacementConfig[] | HomeOffer[]>>(API_ENDPOINTS.ADS.ACTIVE, {
		placement: HOME_OFFERS_PLACEMENT,
	})
	const data = res.data?.data ?? []
	if (!Array.isArray(data)) return []
	const configs = data as AdPlacementConfig[]
	if (configs.some((c) => Array.isArray(c.ads) || Array.isArray(c.items))) {
		return configs
			.filter((c) => !c.placement || c.placement === HOME_OFFERS_PLACEMENT)
			.flatMap((c) => c.ads ?? c.items ?? [])
	}
	return data as HomeOffer[]
}

export const trackAdClick = async (publicId: string): Promise<void> => {
	await ApiService.post(API_ENDPOINTS.ADS.TRACK(publicId), { event: 'click' })
}

// ---- Health reads (blogs with content_type) ----

export type HealthReadType = 'article' | 'blog' | 'podcast'

export interface HealthRead {
	id: string
	slug: string
	title: string
	content_type: HealthReadType
	tag?: string | null
	category?: string | null
	author_name?: string | null
	read_time_minutes?: number | null
	media_url?: string | null
	media_duration_seconds?: number | null
	image_url?: string | null
	published_at?: string | null
}

export const getHealthReads = async (contentType: HealthReadType, limit = 2): Promise<HealthRead[]> => {
	const res = await ApiService.getWithParams<Envelope<HealthRead[]>>(API_ENDPOINTS.BLOGS.LIST, {
		content_type: contentType,
		page: 1,
		limit,
	})
	return res.data?.data ?? []
}

// ---- Communities join / leave ----

export interface CommunityMembership {
	is_joined: boolean
	member_count: number
}

export const joinCommunity = async (groupId: string): Promise<CommunityMembership> => {
	const res = await ApiService.post<Envelope<CommunityMembership>>(API_ENDPOINTS.COMMUNITIES.JOIN(groupId), {})
	return res.data.data
}

export const leaveCommunity = async (groupId: string): Promise<CommunityMembership> => {
	const res = await ApiService.delete<Envelope<CommunityMembership>>(API_ENDPOINTS.COMMUNITIES.JOIN(groupId))
	return res.data.data
}

// ---- Patient summary (header, drawer profile card, My health QR) ----

export interface PatientSummary {
	public_id: string
	display_id: string
	name: string
	avatar_url?: string | null
	age?: number | null
	gender?: string | null
	profile_completion: number
	family_count: number
}

export const getPatientSummary = async (): Promise<PatientSummary> => {
	const res = await ApiService.get<Envelope<PatientSummary>>(API_ENDPOINTS.PATIENT.SUMMARY)
	return res.data.data
}

// ---- App config (SOS / ambulance / support numbers) ----

export interface AppConfig {
	emergency_number: string
	ambulance_number: string
	support_phone: string
	support_email?: string | null
	app_min_version?: string | null
}

export const getAppConfig = async (): Promise<AppConfig> => {
	const res = await ApiService.get<Envelope<AppConfig>>(API_ENDPOINTS.APP_CONFIG)
	return res.data.data
}

// ---- Home-care starting prices ("From ₹199" on the Healthcare at home sheet) ----

export interface HomeCareCategoryPrice {
	id?: string | number
	key?: string
	slug?: string
	name?: string
	label?: string
	starting_price?: number | string | null
}

/** Map of category key/slug/name (lower-case) -> starting price, from the ancillary categories list. */
export const getHomeCareStartingPrices = async (): Promise<Record<string, number>> => {
	const res = await ApiService.get<Envelope<HomeCareCategoryPrice[]>>(API_ENDPOINTS.ANCILLARY.CATEGORIES)
	const map: Record<string, number> = {}
	for (const c of res.data?.data ?? []) {
		const price = Number(c.starting_price)
		if (!Number.isFinite(price) || price <= 0) continue
		for (const k of [c.key, c.slug, c.name, c.label]) {
			if (k) map[String(k).toLowerCase()] = price
		}
	}
	return map
}
