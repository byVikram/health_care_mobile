import React from 'react'
import { StyleSheet, TouchableOpacity, View } from 'react-native'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { AppInput } from '../../../components/common/AppInput'

// The single reusable search bar for the Bookings flow. This is the exact
// markup/styling that AppointmentList (Doctor Appointments) originally
// implemented inline — extracted here so every booking category (Doctor
// Appointments, Ancillary, Lab, Medicine, Radiology) renders the same
// component instead of separately styled copies.
interface BookingsSearchBarProps {
	value: string
	onChangeText: (text: string) => void
	placeholder: string
	onFilterPress?: () => void
	filterActive?: boolean
	showFilterButton?: boolean
	showMicrophone?: boolean
	accessibilityLabel?: string
	testID?: string
}

export default function BookingsSearchBar({
	value,
	onChangeText,
	placeholder,
	onFilterPress,
	filterActive = false,
	showFilterButton = true,
	showMicrophone = true,
	accessibilityLabel = 'Filter',
	testID,
}: BookingsSearchBarProps) {
	return (
		<View style={styles.searchRow}>
			<View style={styles.searchInputWrap}>
				<AppInput
					isSearch
					showMicrophone={showMicrophone}
					value={value}
					onChangeText={onChangeText}
					placeholder={placeholder}
					placeholderTextColor="#98a1aa"
					containerStyle={styles.searchInputContainer}
					style={styles.searchInput}
					contentStyle={styles.searchInputContent}
					outlineStyle={styles.searchInputOutline}
					outlineColor="#2e7b7d"
					activeOutlineColor="#2e7b7d"
					textColor="#1b2d3c"
					autoCorrect={false}
					returnKeyType="search"
					noMargin
					testID={testID}
				/>
			</View>
			{showFilterButton && (
				<TouchableOpacity
					style={[styles.filterIconButton, filterActive && styles.filterIconButtonActive]}
					onPress={onFilterPress}
					activeOpacity={0.8}
					accessibilityRole="button"
					accessibilityLabel={accessibilityLabel}
				>
					<MaterialCommunityIcons name="tune" size={22} color="#1f5f68" />
				</TouchableOpacity>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	searchRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginLeft: 22,
		marginRight: 12,
		marginTop: 12,
		marginBottom: 12,
	},
	searchInputWrap: {
		flex: 1,
	},
	searchInputContainer: {
		width: '100%',
	},
	searchInput: {
		backgroundColor: '#ffffff',
	},
	searchInputContent: {
		height: 48,
		minHeight: 48,
		paddingVertical: 0,
		fontSize: 14,
	},
	searchInputOutline: {
		borderRadius: 12,
	},
	filterIconButton: {
		width: 48,
		height: 48,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#EAECF0',
		backgroundColor: '#ffffff',
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 4,
		elevation: 1,
	},
	filterIconButtonActive: {
		backgroundColor: '#eaf8f9',
		borderColor: '#1f5f68',
	},
})
