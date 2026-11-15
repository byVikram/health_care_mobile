// "Filters" sheet of the Find a doctor screen: the shared AppFilterSheet given the doctor filter categories (doctorFilters.ts).

import React from 'react'
import { AppFilterSheet } from '../../../../components/common'
import {
	FILTER_GROUPS,
	groupCount,
	selectedValues,
	withOption,
	type DoctorFilters,
	type FilterGroupKey,
} from '../doctorFilters'

export type DoctorFilterSheetProps = {
	visible: boolean
	filters: DoctorFilters
	onChange: (next: DoctorFilters) => void
	onClearAll: () => void
	onClose: () => void
}

export function DoctorFilterSheet({ visible, filters, onChange, onClearAll, onClose }: DoctorFilterSheetProps) {
	return (
		<AppFilterSheet
			visible={visible}
			groups={FILTER_GROUPS}
			selected={(key) => selectedValues(filters, key as FilterGroupKey)}
			count={(key) => groupCount(filters, key as FilterGroupKey)}
			onSelect={(key, value) => onChange(withOption(filters, key as FilterGroupKey, value))}
			onClearAll={onClearAll}
			onClose={onClose}
		/>
	)
}

export default DoctorFilterSheet
