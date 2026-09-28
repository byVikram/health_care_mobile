// RadiologyFilter.tsx
import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { AppSelect, AppToggle } from '../../../components/common'
import { RadiologyFilters, PricingModel, ScanType } from '../radiology'
import { fetchScanTypes } from '../radiologyService'

interface RadiologyFilterProps {
	filters: RadiologyFilters
	onChange: (filters: RadiologyFilters) => void
	resultCount?: number
}

const PRICING_OPTIONS: { label: string; value: PricingModel | 'all' }[] = [
	{ label: 'All pricing types', value: 'all' },
	{ label: 'Starting from', value: 'starting_from' },
	{ label: 'Quote required', value: 'quote_required' },
	{ label: 'Fixed price', value: 'fixed' },
]

const SORT_OPTIONS: { label: string; value: RadiologyFilters['sortBy'] }[] = [
	{ label: 'Name (A–Z)', value: 'name_asc' },
	{ label: 'Name (Z–A)', value: 'name_desc' },
	{ label: 'Price (low to high)', value: 'price_asc' },
	{ label: 'Price (high to low)', value: 'price_desc' },
]

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

export default function RadiologyFilter({ filters, onChange, resultCount }: RadiologyFilterProps) {
	const [scanTypes, setScanTypes] = useState<ScanType[]>([])
	const [loadingScanTypes, setLoadingScanTypes] = useState(false)

	useEffect(() => {
		loadScanTypes()
	}, [])

	const loadScanTypes = async () => {
		setLoadingScanTypes(true)
		try {
			const types = await fetchScanTypes()
			setScanTypes(types)
		} catch (error) {
			console.error('Failed to load scan types:', error)
		} finally {
			setLoadingScanTypes(false)
		}
	}

	const update = (patch: Partial<RadiologyFilters>) => {
		onChange({ ...filters, ...patch })
	}

	const reset = () => {
		onChange({
			search: '',
			city: '',
			pricingModel: 'all',
			availableOnly: false,
			sortBy: 'name_asc',
			scanType: undefined,
		})
	}

	const scanTypeOptions = [
		{ label: 'All Scan Types', value: '' },
		...scanTypes.map((type) => ({
			label: type.name,
			value: String(type.id),
		})),
	]

	return (
		<View style={styles.card}>
			<Text style={styles.title}>Filters</Text>

			{/* City Selector */}
			<AppSelect
				label="City"
				placeholder="All Cities"
				value={filters.city}
				options={CITY_OPTIONS}
				onSelect={(value) => update({ city: value })}
				size="form"
			/>

			{/* Scan Type Selector */}
			<AppSelect
				label="Scan Type"
				placeholder="All Scan Types"
				value={filters.scanType?.toString()}
				options={scanTypeOptions}
				onSelect={(value) => update({ scanType: value ? parseInt(value) : undefined })}
				size="form"
			/>

			{/* Pricing Selector */}
			{/* <AppSelect
				label="Pricing"
				placeholder="All pricing types"
				value={filters.pricingModel}
				options={PRICING_OPTIONS}
				onSelect={(value) => update({ pricingModel: value as PricingModel | 'all' })}
				size="form"
			/> */}

			{/* Sort By */}
			<AppSelect
				label="Sort by"
				placeholder="Name (A–Z)"
				value={filters.sortBy}
				options={SORT_OPTIONS}
				onSelect={(value) => update({ sortBy: value as RadiologyFilters['sortBy'] })}
				size="form"
			/>

			{/* Toggle */}
			{/* <View style={styles.toggleRow}>
				<Text style={styles.toggleLabel}>Available only</Text>
				<AppToggle
					value={filters.availableOnly}
					onValueChange={(val) => update({ availableOnly: val })}
					showStatusText={false}
					size="small"
					activeColor="#2B6F71"
					inactiveColor="#D0D5DD"
				/>
			</View> */}

			{/* Reset */}
			<TouchableOpacity
				style={styles.resetButton}
				onPress={reset}
				hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
				accessibilityRole="button"
				accessibilityLabel="Reset filters"
			>
				<Text style={styles.resetText}>Reset filters</Text>
			</TouchableOpacity>

			{/* Result Count */}
			{/* {typeof resultCount === 'number' && (
				<Text style={styles.count}>
					{resultCount} {resultCount === 1 ? 'scan' : 'scans'} found
				</Text>
			)} */}
		</View>
	)
}

const styles = StyleSheet.create({
	card: {
		backgroundColor: '#fff',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#EAECF0',
		padding: 16,
		marginBottom: 16,
	},
	title: {
		fontSize: 15,
		fontWeight: '600',
		color: '#111',
		marginBottom: 14,
	},
	toggleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 10,
		borderBottomWidth: 1,
		borderBottomColor: '#F2F4F7',
	},
	toggleLabel: {
		fontSize: 13,
		color: '#344054',
		flex: 1,
		paddingRight: 8,
		fontWeight: '500',
	},
	resetButton: {
		marginTop: 12,
		alignItems: 'flex-end',
		justifyContent: 'center',
		minHeight: 44,
		paddingHorizontal: 4,
	},
	resetText: {
		fontSize: 13,
		color: '#2B6F71',
		fontWeight: '600',
	},
	count: {
		marginTop: 8,
		fontSize: 12,
		color: '#667085',
	},
})
