// src/services/eventService.ts
//
// The patient's view of events: published, not-yet-finished events from the doctors' event feature
// (GET /api/events/public, GET /api/events/public/{id}). Both are open endpoints that answer with the backend's
// `{ success, message, data }` envelope.
import ApiService from './apiService'
import { API_ENDPOINTS } from '../constants/apiUrls'
import type { EventItem } from '../types/event'

type Envelope<T> = { success: boolean; message?: string; data: T }

/** Upcoming events, soonest first (the server orders them). */
export const getPublicEvents = async (limit = 20): Promise<EventItem[]> => {
	const res = await ApiService.get<Envelope<EventItem[]>>(`${API_ENDPOINTS.EVENTS.PUBLIC}?limit=${limit}`)
	const data = res.data?.data
	return Array.isArray(data) ? data : []
}

export const getPublicEvent = async (id: string): Promise<EventItem | null> => {
	const res = await ApiService.get<Envelope<EventItem>>(API_ENDPOINTS.EVENTS.PUBLIC_DETAIL(id))
	return res.data?.data ?? null
}
