import ApiService from '../../../services/apiService'
import { API_ENDPOINTS } from '../../../constants/apiUrls'

export interface DoctorEvent {
	id: string
	title: string
	category: string
	category_label: string
	event_date: string // YYYY-MM-DD
	event_time: string // HH:MM:SS or HH:MM
	end_time: string // HH:MM:SS or HH:MM
	location_type?: 'online' | 'offline'
	location?: string
	registration_link?: string
	description: string
	cover_image_url?: string
	status: 'draft' | 'published'
	is_expired?: boolean
	created_at: string
	updated_at: string
}

export interface EventCreatePayload {
	title: string
	category: string
	event_date: string
	event_time: string
	end_time: string
	location_type?: 'online' | 'offline'
	location?: string
	registration_link?: string
	description: string
	cover_image_url?: string
	status: 'draft' | 'published'
}

interface ApiResponse<T> {
	success: boolean
	message: string
	data: T
}

export const EVENT_CATEGORIES = [
	{ value: 'health_camp', label: 'Health Camp' },
	{ value: 'webinar', label: 'Webinar' },
	{ value: 'workshop', label: 'Workshop' },
	{ value: 'seminar', label: 'Seminar' },
	{ value: 'health_awareness', label: 'Health Awareness' },
	{ value: 'vaccination_camp', label: 'Vaccination Camp' },
	{ value: 'live_qa', label: 'Live Q&A' },
	{ value: 'fitness_wellness', label: 'Fitness & Wellness' },
	{ value: 'nutrition_session', label: 'Nutrition Session' },
	{ value: 'other', label: 'Other' },
]

export const getDoctorEvents = async (status?: string): Promise<DoctorEvent[]> => {
	const params = status ? { status } : {}
	const res = await ApiService.getWithParams<ApiResponse<DoctorEvent[]>>(
		API_ENDPOINTS.EVENTS.LIST,
		params
	)
	return res.data.data
}

export const getEventDetail = async (id: string): Promise<DoctorEvent> => {
	const res = await ApiService.get<ApiResponse<DoctorEvent>>(
		API_ENDPOINTS.EVENTS.DETAIL(id)
	)
	return res.data.data
}

export const createEvent = async (payload: EventCreatePayload): Promise<DoctorEvent> => {
	const res = await ApiService.post<ApiResponse<DoctorEvent>>(
		API_ENDPOINTS.EVENTS.CREATE,
		payload
	)
	return res.data.data
}

export const updateEvent = async (id: string, payload: Partial<EventCreatePayload>): Promise<DoctorEvent> => {
	const res = await ApiService.patch<ApiResponse<DoctorEvent>>(
		API_ENDPOINTS.EVENTS.UPDATE(id),
		payload
	)
	return res.data.data
}

export const deleteEvent = async (id: string): Promise<void> => {
	await ApiService.delete(API_ENDPOINTS.EVENTS.DELETE(id))
}
