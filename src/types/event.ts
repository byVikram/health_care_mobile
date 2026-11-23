// What GET /api/events/public and /api/events/public/{id} return for one event (backend `EventOut`).
export interface EventItem {
	id: string
	title: string
	/** Machine value, e.g. `health_camp`, `webinar`. */
	category: string
	/** Display name of the category, e.g. "Health camp". */
	category_label: string
	/** `YYYY-MM-DD`, the clinic's calendar day. */
	event_date: string
	/** `HH:MM:SS`. */
	event_time: string
	end_time: string
	location_type?: 'online' | 'offline' | string
	location?: string | null
	registration_link?: string | null
	description: string
	cover_image_url?: string | null
	status: string
	/** How many people registered. Sent by the server once in-app registration exists; absent until then. */
	going_count?: number
	/** Whether the signed-in patient registered. Sent by the server once in-app registration exists. */
	is_registered?: boolean
	is_expired?: boolean
}
