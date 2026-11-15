// src/features/medical-records/medicalRecordsFilters.ts
//
// What the Medical records screen can filter and sort by, in the same "Filters" sheet as Find a doctor (AppFilterSheet): the
// record date and the order. Kind (prescription / lab report / my uploads) is the chip bar and the search stays as it is, so
// only what they cannot do is here. Pure, no React: the screen only holds the state.

import type { AppFilterGroup } from '../../components/common'
import { formatDateForApi } from '../../utils/date'
import type { MedicalRecord } from './medicalRecordsTypes'

export type DateRange = 'any' | '30d' | '3m' | '6m' | '1y'
export type SortOrder = 'new' | 'old'

export type RecordFilters = {
	/** The date on the record. */
	date: DateRange
	sort: SortOrder
}

export const NO_RECORD_FILTERS: RecordFilters = { date: 'any', sort: 'new' }

export type RecordFilterKey = keyof RecordFilters

export const RECORD_FILTER_GROUPS: AppFilterGroup[] = [
	{
		key: 'date',
		label: 'Record date',
		title: 'Record date',
		hint: 'The date on the prescription or report',
		multi: false,
		options: [
			{ value: 'any', label: 'Any time' },
			{ value: '30d', label: 'Last 30 days' },
			{ value: '3m', label: 'Last 3 months' },
			{ value: '6m', label: 'Last 6 months' },
			{ value: '1y', label: 'Last year' },
		],
	},
	{
		key: 'sort',
		label: 'Sort by',
		title: 'Sort by',
		multi: false,
		options: [
			{ value: 'new', label: 'Newest first' },
			{ value: 'old', label: 'Oldest first' },
		],
	},
]

/** 1 when a category is not at its default, else 0 (every category here takes one choice). */
export function groupCount(filters: RecordFilters, key: RecordFilterKey): number {
	return filters[key] !== NO_RECORD_FILTERS[key] ? 1 : 0
}

export const activeFilterCount = (filters: RecordFilters): number =>
	RECORD_FILTER_GROUPS.reduce((n, group) => n + groupCount(filters, group.key as RecordFilterKey), 0)

/** The chosen option of a category, for ticking its row. */
export const selectedValues = (filters: RecordFilters, key: RecordFilterKey): string[] => [filters[key]]

/** The filters with one option of one category chosen. */
export const withOption = (filters: RecordFilters, key: RecordFilterKey, value: string): RecordFilters => ({
	...filters,
	[key]: value,
})

/** The oldest YYYY-MM-DD a record may have for a range ('' for "any time"). */
export function dateCutoff(range: DateRange, today: Date = new Date()): string {
	if (range === 'any') return ''
	const from = new Date(today.getFullYear(), today.getMonth(), today.getDate())
	if (range === '30d') from.setDate(from.getDate() - 30)
	else if (range === '3m') from.setMonth(from.getMonth() - 3)
	else if (range === '6m') from.setMonth(from.getMonth() - 6)
	else from.setFullYear(from.getFullYear() - 1)
	return formatDateForApi(from)
}

/** Whether a record is inside the chosen date range (the sort is applied by the list). */
export const matchesFilters = (record: MedicalRecord, cutoff: string): boolean => !cutoff || record.date >= cutoff
