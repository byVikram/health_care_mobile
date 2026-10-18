// src/features/laboratory/labService.ts
//
// The lab-test calls of the Lab Tests Ordering flow. Everything goes through our own API (/api/laboratory/...):
// the backend talks to LabStack, so no LabStack id or key ever reaches the app. A test is priced at its MRP; a package at its selling price (MRP shown struck through).

import axios from 'axios'
import ApiService from '../../services/apiService'
import { API_ENDPOINTS } from '../../constants/apiUrls'

export type LabKind = 'test' | 'package'
export type LabServiceType = 'HOME_SAMPLE' | 'CENTER_VISIT'

export type ApiLabTag = { id: string; name: string; category?: string | null }

export type ApiCatalogueItem = {
	id: string
	kind: LabKind
	name: string
	display_name?: string | null
	category?: string | null
	tat?: string | null
	sample_types: string[]
	tags: ApiLabTag[]
	/** Lowest MRP across labs. */
	min_mrp: string | null
	/** Packages only: the lowest selling price across labs (the MRP is shown struck through). */
	min_price?: string | null
	tests_count: number | null
}

export type ApiCatalogueList = {
	items: ApiCatalogueItem[]
	page: number
	limit: number
	total: number
	pages: number
	synced_at: string | null
}

export type ApiOffer = {
	lab_id: number
	lab_name: string | null
	mrp: string | null
	/** Packages only. */
	price?: string | null
	distance_km: number | null
}

export type ApiCatalogueDetail = ApiCatalogueItem & {
	description: string | null
	preparations: string[]
	aliases: string[]
	included_tests: { id: string; name: string }[]
	supports_home_sample: boolean | null
	supports_center_visit: boolean | null
	labs: ApiOffer[]
	live: boolean
}

export type ApiLab = {
	lab_id: number
	lab_name: string | null
	chain_id: number | null
	logo_url?: string | null
	services: string[]
}

export type ApiAvailability = {
	serviceable: boolean
	labs: ApiLab[]
	per_item: { item_id: string; name: string; lab_ids: number[] }[]
}

export type ApiSlotLab = {
	lab_id: number
	lab_name: string | null
	logo_url: string | null
	service: LabServiceType
	times: string[]
	distance_km: number | null
}

export type ApiSlots = { date: string; service: LabServiceType; labs: ApiSlotLab[] }

export type ApiQuoteLab = ApiLab & {
	total_mrp: string
	/** What the patient pays: a package at its selling price, a test at its MRP. */
	total: string
	tat_hours: number | null
	items: { item_id: string; kind: LabKind; name: string; mrp: string; price: string }[]
}

export type ApiQuote = { serviceable: boolean; labs: ApiQuoteLab[] }

export type ApiOrderItem = { kind: LabKind; name: string; price: string | null; mrp: string | null }

export type ApiOrder = {
	id: string
	status: string
	order_type: LabServiceType
	payment_mode: string
	payment_status: string
	appointment_at: string | null
	lab_name: string | null
	lab_logo_url: string | null
	lab_tat_hours: number | null
	patient_name: string | null
	address_line: string | null
	city: string | null
	state: string | null
	pincode: string | null
	total_amount: string | null
	notes: string | null
	items: ApiOrderItem[]
	created_at: string | null
	can_cancel: boolean
	can_reschedule: boolean
}

export type PlaceOrderInput = {
	patientId?: string
	addressId: string
	itemIds: string[]
	labId: number
	service: LabServiceType
	date: string
	time: string
	expectedTotal: number
	note?: string
}

type Envelope<T> = { success?: boolean; data: T }

// Browsing and the live checks are polled while the user types / changes the cart: a failure shows inline,
// not as the global error dialog.
const QUIET = { skipGlobalError: true } as const

const BASE = API_ENDPOINTS.LABS
const csv = (ids: string[]) => ids.join(',')

export async function fetchCatalogue(params: {
	query?: string
	kind?: LabKind
	page?: number
	limit?: number
}): Promise<ApiCatalogueList> {
	const res = await ApiService.get<Envelope<ApiCatalogueList>>(BASE.CATALOGUE, {
		...QUIET,
		params: { query: params.query || undefined, kind: params.kind, page: params.page ?? 1, limit: params.limit ?? 20 },
	})
	return res.data.data
}

export async function fetchCatalogueItem(kind: LabKind, id: string, addressId?: string | null): Promise<ApiCatalogueDetail> {
	const res = await ApiService.get<Envelope<ApiCatalogueDetail>>(BASE.ITEM(kind, id), {
		...QUIET,
		params: { address_id: addressId || undefined },
	})
	return res.data.data
}

export async function fetchAvailability(addressId: string, itemIds: string[]): Promise<ApiAvailability> {
	const res = await ApiService.get<Envelope<ApiAvailability>>(BASE.AVAILABILITY, {
		...QUIET,
		params: { address_id: addressId, items: csv(itemIds) },
	})
	return res.data.data
}

export async function fetchQuote(addressId: string, itemIds: string[]): Promise<ApiQuote> {
	const res = await ApiService.get<Envelope<ApiQuote>>(BASE.QUOTE, {
		...QUIET,
		params: { address_id: addressId, items: csv(itemIds) },
	})
	return res.data.data
}

export async function fetchSlots(params: {
	addressId: string
	itemIds: string[]
	date: string
	service: LabServiceType
	labId?: number
}): Promise<ApiSlots> {
	const res = await ApiService.get<Envelope<ApiSlots>>(BASE.SLOTS, {
		...QUIET,
		params: {
			address_id: params.addressId,
			items: csv(params.itemIds),
			date: params.date,
			service: params.service,
			lab_id: params.labId,
		},
	})
	return res.data.data
}

/** Books the order, pay on collection. The server re-checks the price and the slot (409 when either changed). */
export async function placeOrder(input: PlaceOrderInput): Promise<ApiOrder> {
	const res = await ApiService.post<Envelope<ApiOrder>>(
		BASE.ORDERS,
		{
			patient_id: input.patientId,
			address_id: input.addressId,
			items: input.itemIds,
			lab_id: input.labId,
			service: input.service,
			date: input.date,
			time: input.time,
			expected_total: input.expectedTotal,
			note: input.note || undefined,
		},
		QUIET
	)
	return res.data.data
}

export async function cancelOrder(id: string, reason: string | null): Promise<ApiOrder> {
	const res = await ApiService.post<Envelope<ApiOrder>>(`${BASE.ORDERS}/${id}/cancel`, { reason: reason || undefined }, QUIET)
	return res.data.data
}

export async function rescheduleOrder(id: string, date: string, time: string): Promise<ApiOrder> {
	const res = await ApiService.post<Envelope<ApiOrder>>(`${BASE.ORDERS}/${id}/reschedule`, { date, time }, QUIET)
	return res.data.data
}

/** The free times ('HH:MM') on a day at the order's own lab. */
export async function fetchOrderSlots(id: string, date: string): Promise<string[]> {
	const res = await ApiService.get<Envelope<{ date: string; times: string[] }>>(`${BASE.ORDERS}/${id}/slots`, {
		...QUIET,
		params: { date },
	})
	return res.data.data.times
}

export async function fetchOrder(id: string): Promise<ApiOrder> {
	const res = await ApiService.get<Envelope<ApiOrder>>(`${BASE.ORDERS}/${id}`, QUIET)
	return res.data.data
}

/** A sentence for the user from a failed lab call (our API's message when it sent one, else a generic line). */
export function labErrorMessage(e: unknown): string {
	if (axios.isAxiosError(e)) {
		if (!e.response) return 'No connection. Check your internet and try again.'
		if (e.response.status === 503) return 'The lab service is busy right now. Please try again in a moment.'
		const data = e.response.data as { message?: string; detail?: unknown } | undefined
		if (typeof data?.detail === 'string') return data.detail
		if (data?.message) return data.message
	}
	return 'Something went wrong. Please try again.'
}
