// src/features/Pharmacy/components/PharmacyFilters.tsx
import React, { useState } from 'react'
import {
	View,
	Text,
	Switch,
	StyleSheet,
	Platform,
	TouchableOpacity,
	Modal,
	ScrollView,
	SafeAreaView,
} from 'react-native'

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

export default function PharmacyFilters({ filters, onChange }: Props) {
	const [cityModalVisible, setCityModalVisible] = useState(false)

	const handleToggle = (key: keyof Omit<PharmacyFilterState, 'city'>) => (value: boolean) => {
		onChange({ ...filters, [key]: value })
	}

	const selectedCityLabel = CITY_OPTIONS.find((o) => o.value === filters.city)?.label ?? 'All Cities'

	return (
		<View style={styles.card}>
			<Text style={styles.title}>Filters</Text>

			{/* City Selector */}
			<View style={styles.pickerWrapper}>
				<Text style={styles.label}>City</Text>
				<TouchableOpacity
					style={styles.citySelector}
					onPress={() => setCityModalVisible(true)}
					activeOpacity={0.7}
				>
					<Text style={[styles.citySelectorText, !filters.city && styles.citySelectorPlaceholder]}>
						{selectedCityLabel}
					</Text>
					<Text style={styles.chevron}>▾</Text>
				</TouchableOpacity>
			</View>

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

			{/* City Modal */}
			<Modal
				visible={cityModalVisible}
				animationType="slide"
				transparent
				onRequestClose={() => setCityModalVisible(false)}
			>
				<View style={styles.modalOverlay}>
					<TouchableOpacity style={styles.modalBackdrop} onPress={() => setCityModalVisible(false)} />
					<SafeAreaView style={styles.modalSheet}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Select City</Text>
							<TouchableOpacity onPress={() => setCityModalVisible(false)}>
								<Text style={styles.modalClose}>✕</Text>
							</TouchableOpacity>
						</View>
						<ScrollView>
							{CITY_OPTIONS.map((opt) => (
								<TouchableOpacity
									key={opt.value}
									style={[styles.cityOption, filters.city === opt.value && styles.cityOptionSelected]}
									onPress={() => {
										onChange({ ...filters, city: opt.value })
										setCityModalVisible(false)
									}}
								>
									<Text
										style={[
											styles.cityOptionText,
											filters.city === opt.value && styles.cityOptionTextSelected,
										]}
									>
										{opt.label}
									</Text>
									{filters.city === opt.value && <Text style={styles.cityOptionCheck}>✓</Text>}
								</TouchableOpacity>
							))}
						</ScrollView>
					</SafeAreaView>
				</View>
			</Modal>
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
	return (
		<View style={[styles.toggleRow, last && styles.toggleRowLast]}>
			<Text style={styles.toggleLabel}>{label}</Text>
			<Switch
				value={value}
				onValueChange={onValueChange}
				trackColor={{ false: '#E0E0E0', true: '#2B6F71' }}
				thumbColor={Platform.OS === 'android' ? (value ? '#fff' : '#f4f3f4') : undefined}
			/>
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
		...StyleSheet.absoluteFillObject,
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
