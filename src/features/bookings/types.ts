// Shared contract between BookingsPage (parent) and each booking-category
// child screen (AppointmentList, MyBookingsPage, OrderListPage,
// OrderListLaboratoryPage, OrderListRadiologyPage) for the consolidated
// search/filter UI.

import type { Ref } from 'react'

export interface BookingsChildHandle {
	/** Opens this child's own existing filter sheet/modal, unchanged. */
	openFilterSheet?: () => void
}

export interface DoctorFilterState {
	hospital: string
	mode: string
}

export interface AncillaryFilterState {
	activeTab: 'upcoming' | 'completed' | 'cancelled'
}

export interface CommonOrderFilterState {
	status: string
	date: string
	fromDate: string
	toDate: string
}

export interface BookingsChildControlledProps {
	/** True when rendered inside BookingsPage: hides this child's own
	 *  search bar + filter icon row so only the parent's single copy is
	 *  visible. Defaults to false for standalone screen usage. */
	embedded?: boolean
	/** Parent-owned search query text. */
	searchQuery?: string
	/** Legacy search value property alias */
	searchValue?: string
	/** Callback to report active filter state */
	onFilterActiveChange?: (active: boolean) => void
}

export type BookingsChildRef = Ref<BookingsChildHandle>

