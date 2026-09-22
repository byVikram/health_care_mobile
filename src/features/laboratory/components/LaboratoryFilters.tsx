// src/features/laboratory/component/LaboratoryFilters.tsx
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { AppSelect, AppToggle } from '../../../components/common'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface LaboratoryFilterState {
	city: string
	homeCollection: boolean
	is24x7: boolean
	nablAccredited: boolean
	emergencyTests: boolean
}

export interface LaboratoryItem {
	id: string
	name: string
	owner_name: string
	avatar_s3_key: string | null
	address: string
	city: string
	operating_hours: {
		open: string
		close: string
		[key: string]: string
	}
	home_collection_available: boolean
	is_24_x_7: boolean
	is_nabl_accredited: boolean
	emergency_tests_available: boolean
	image?: any
}

interface Props {
	filters: LaboratoryFilterState
	onChange: (newFilters: LaboratoryFilterState) => void
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const CITY_OPTIONS = [
	{ label: 'All Cities', value: '' },
	{ label: 'Ahmedabad', value: 'Ahmedabad' },
	{ label: 'Bangalore', value: 'Bangalore' },
	{ label: 'Chennai', value: 'Chennai' },
	{ label: 'Delhi', value: 'Delhi' },
	{ label: 'Hyderabad', value: 'Hyderabad' },
	{ label: 'Jaipur', value: 'Jaipur' },
	{ label: 'Kolkata', value: 'Kolkata' },
	{ label: 'Mumbai', value: 'Mumbai' },
	{ label: 'Pune', value: 'Pune' },
	{ label: 'Surat', value: 'Surat' },
]

// ─────────────────────────────────────────────
// FilterToggle helper
// ─────────────────────────────────────────────

interface FilterToggleProps {
	label: string
	value: boolean
	onValueChange: (val: boolean) => void
	last?: boolean
}

function FilterToggle({ label, value, onValueChange, last = false }: FilterToggleProps) {
	return (
		<View style={[styles.toggleRow, last && styles.toggleRowLast]}>
			<Text style={styles.toggleLabel}>{label}</Text>
			<AppToggle
				value={value}
				onValueChange={onValueChange}
				showStatusText={false}
				size="small"
				activeColor="#2B6F71"
				inactiveColor="#D0D5DD"
			/>
		</View>
	)
}

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────

export default function LaboratoryFilters({ filters, onChange }: Props) {
	const handleToggle = (key: keyof Omit<LaboratoryFilterState, 'city'>) => (value: boolean) => {
		onChange({ ...filters, [key]: value })
	}

	return (
		<View style={styles.container}>
			{/* City selector */}
			<View style={styles.group}>
				<Text style={styles.groupLabel}>City</Text>
				<AppSelect
					placeholder="All Cities"
					value={filters.city}
					options={CITY_OPTIONS}
					onSelect={(value) => onChange({ ...filters, city: value })}
					size="form"
					noMargin
					customCardStyle={styles.selectCard}
					borderColor="#EAECF0"
					maxDropdownHeight={240}
				/>
			</View>

			{/* Boolean toggles */}
			<View style={styles.group}>
				<Text style={styles.groupLabel}>Features</Text>
				<View style={styles.toggleCard}>
					<FilterToggle
						label="Home Collection Available"
						value={filters.homeCollection}
						onValueChange={handleToggle('homeCollection')}
					/>
					<FilterToggle label="Open 24×7" value={filters.is24x7} onValueChange={handleToggle('is24x7')} />
					<FilterToggle
						label="NABL Accredited"
						value={filters.nablAccredited}
						onValueChange={handleToggle('nablAccredited')}
					/>
					<FilterToggle
						label="Emergency Tests Available"
						value={filters.emergencyTests}
						onValueChange={handleToggle('emergencyTests')}
						last
					/>
				</View>
			</View>
		</View>
	)
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
	container: {
		gap: 20,
	},
	group: {
		gap: 8,
	},
	groupLabel: {
		fontSize: 11,
		fontWeight: '800',
		color: '#64707d',
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	selectCard: {
		height: 50,
		borderRadius: 10,
		backgroundColor: '#ffffff',
	},
	toggleCard: {
		backgroundColor: '#ffffff',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#EAECF0',
		paddingHorizontal: 14,
		overflow: 'hidden',
	},
	toggleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 12,
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
		paddingRight: 12,
		fontWeight: '500',
	},
})
