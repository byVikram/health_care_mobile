// src/services/bookingsService.ts
//
// The patient's combined bookings list (Bookings tab): doctor appointments, ancillary orders, lab
// bookings and pharmacy orders -- the signed-in patient's and their family members', merged, sorted and paged by the
// backend. Radiology is not part of this list.
import ApiService from './apiService'
import { API_ENDPOINTS } from '../constants/apiUrls'

type Envelope<T> = { success: boolean; message?: string; data: T }

export type BookingsWhen = 'upcoming' | 'past'
export type BookingCategory = 'doctor' | 'ancillary' | 'lab' | 'pharmacy'
export type BookingsCategoryFilter = 'all' | BookingCategory
export type BookingTone = 'ok' | 'wait' | 'move' | 'done'
export type BookingWhereType = 'clinic' | 'home' | 'video' | 'delivery' | 'report'

export type BookingTargetType =
	| 'appointment'
	| 'visit_summary'
	| 'ancillary_request'
	| 'ancillary_tracking'
	| 'pharmacy_order'

export type BookingActionKey =
	| 'view'
	| 'view_pay'
	| 'directions'
	| 'cancel'
	| 'track'
	| 'call'
	| 'reschedule'
	| 'view_report'
	| 'book_again'
	| 'reorder'
	| 'visit_summary'
	| 'invoice'

export interface BookingAction {
	key: BookingActionKey
	label: string
}

export interface BookingItem {
	id: string
	category: BookingCategory
	kind_label: string
	title: string
	subtitle?: string | null
	starts_at?: string | null
	time_label?: string | null
	where?: string | null
	where_type?: BookingWhereType | null
	status: { label: string; tone: BookingTone }
	note?: string | null
	ref?: string | null
	avatar_url?: string | null
	/** Set only when the booking is for a family member. */
	patient?: { public_id: string; name: string; relation?: string | null } | null
	/** Ancillary only: the order's speciality from the DB (catalogue key + label); null when unknown. */
	service?: { key: string; label: string } | null
	target: { type: BookingTargetType; id: string }
	actions: { primary: BookingAction | null; secondary: BookingAction | null }
}

export interface BookingsPage {
	items: BookingItem[]
	counts: Record<BookingsCategoryFilter, number>
	summary: { upcoming: number; today: number }
	page: number
	limit: number
	total: number
	pages: number
}

export const getMyBookings = async (params: {
	when: BookingsWhen
	category?: BookingsCategoryFilter
	page?: number
	limit?: number
}): Promise<BookingsPage> => {
	const res = await ApiService.getWithParams<Envelope<BookingsPage>>(API_ENDPOINTS.PATIENT.BOOKINGS, {
		when: params.when,
		category: params.category ?? 'all',
		page: params.page ?? 1,
		limit: params.limit ?? 20,
	})
	return res.data.data
}
