// src/features/Pharmacy/components/PharmacyFilters.tsx
import React from 'react'
import {
	View,
	Text,
	StyleSheet,
	Platform,
	Pressable,
} from 'react-native'
import { AppSelect, AppToggle } from '../../../components/common'

export interface PharmacyFilterState {
	city: string
	homeDelivery: boolean
	is24x7: boolean
	emergencyMeds: boolean
}

interface Props {
	filters: PharmacyFilterState
	onChange: (newFilters: PharmacyFilterState) => void
}

const CITY_OPTIONS = [
	{ label: 'All Cities', value: '' },
	{ label: 'Mumbai', value: 'Mumbai' },
	{ label: 'Delhi', value: 'Delhi' },
	{ label: 'Bangalore', value: 'Bangalore' },
	{ label: 'Chennai', value: 'Chennai' },
	{ label: 'Kolkata', value: 'Kolkata' },
	{ label: 'Hyderabad', value: 'Hyderabad' },
	{ label: 'Pune', value: 'Pune' },
	{ label: 'Ahmedabad', value: 'Ahmedabad' },
	{ label: 'Jaipur', value: 'Jaipur' },
	{ label: 'Surat', value: 'Surat' },
]

const cityOptions = CITY_OPTIONS.map((city) => ({
	label: city.label,
	value: city.value,
}))

export default function PharmacyFilters({ filters, onChange }: Props) {
	const handleToggle = (key: keyof Omit<PharmacyFilterState, 'city'>) => (value: boolean) => {
		onChange({ ...filters, [key]: value })
	}

	return (
		<View style={styles.card}>
			<Text style={styles.title}>Filters</Text>

			{/* City Selector */}
			<AppSelect
				label="City"
				placeholder="All Cities"
				value={filters.city}
				options={cityOptions}
				onSelect={(value) =>
					onChange({
						...filters,
						city: value,
					})
				}
				size="form"
			/>

			{/* Toggle Rows */}
			<FilterToggle
				label="Home Delivery Available"
				value={filters.homeDelivery}
				onValueChange={handleToggle('homeDelivery')}
			/>
			<FilterToggle label="Open 24×7" value={filters.is24x7} onValueChange={handleToggle('is24x7')} />
			<FilterToggle
				label="Emergency Medicines"
				value={filters.emergencyMeds}
				onValueChange={handleToggle('emergencyMeds')}
				last
			/>

		</View>
	)
}

function FilterToggle({
	label,
	value,
	onValueChange,
	last = false,
}: {
	label: string
	value: boolean
	onValueChange: (val: boolean) => void
	last?: boolean
}) {
	// The whole row is made pressable (not just the small AppToggle switch)
	// so the effective tappable area comfortably meets the ~44dp minimum
	// touch target, without resizing the visible switch itself. AppToggle's
	// own Pressable still captures taps landing directly on it first, so
	// tapping the switch does not double-toggle the value.
	return (
		<Pressable
			style={[styles.toggleRow, last && styles.toggleRowLast]}
			onPress={() => onValueChange(!value)}
			hitSlop={{ left: 4, right: 4 }}
			accessibilityRole="switch"
			accessibilityState={{ checked: value }}
			accessibilityLabel={label}
		>
			<Text style={styles.toggleLabel}>{label}</Text>
			<AppToggle
				value={value}
				onValueChange={onValueChange}
				showStatusText={false}
				size="small"
				activeColor="#2B6F71"
				inactiveColor="#D0D5DD"
				accessibilityLabel={label}
			/>
		</Pressable>
	)
}

const styles = StyleSheet.create({
	card: {
		backgroundColor: '#fff',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#EAECF0',
		padding: 16,
	},
	title: {
		fontSize: 15,
		fontWeight: '600',
		color: '#111',
		marginBottom: 14,
	},
	label: {
		fontSize: 13,
		color: '#555',
		marginBottom: 4,
		fontWeight: '500',
	},
	pickerWrapper: {
		marginBottom: 12,
	},
	// City selector button
	citySelector: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		borderWidth: 1,
		borderColor: '#D0D5DD',
		borderRadius: 8,
		backgroundColor: '#F9FAFB',
		paddingHorizontal: 12,
		paddingVertical: 10,
	},
	citySelectorText: {
		fontSize: 14,
		color: '#101828',
	},
	citySelectorPlaceholder: {
		color: '#9AA0AC',
	},
	chevron: {
		fontSize: 14,
		color: '#667085',
	},
	// Toggle rows
	toggleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		minHeight: 44,
		paddingVertical: 10,
		borderBottomWidth: 1,
		borderBottomColor: '#F2F4F7',
	},
	toggleRowLast: {
		borderBottomWidth: 0,
	},
	toggleLabel: {
		fontSize: 13,
		color: '#344054',
		flex: 1,
		paddingRight: 8,
		fontWeight: '500',
	},
	// City modal
	modalOverlay: {
		flex: 1,
		justifyContent: 'flex-end',
	},
	modalBackdrop: {
		...StyleSheet.absoluteFill,
		backgroundColor: 'rgba(0,0,0,0.4)',
	},
	modalSheet: {
		backgroundColor: '#fff',
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		maxHeight: '60%',
	},
	modalHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 14,
		borderBottomWidth: 1,
		borderBottomColor: '#F2F4F7',
	},
	modalTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#101828',
	},
	modalClose: {
		fontSize: 18,
		color: '#667085',
		padding: 4,
	},
	cityOption: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 14,
		borderBottomWidth: 1,
		borderBottomColor: '#F9FAFB',
	},
	cityOptionSelected: {
		backgroundColor: '#F0FAFA',
	},
	cityOptionText: {
		fontSize: 15,
		color: '#344054',
	},
	cityOptionTextSelected: {
		color: '#2B6F71',
		fontWeight: '600',
	},
	cityOptionCheck: {
		fontSize: 16,
		color: '#2B6F71',
		fontWeight: '700',
	},
})
