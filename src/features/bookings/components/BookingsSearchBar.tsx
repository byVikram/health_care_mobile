import React from 'react'
import { StyleSheet, TouchableOpacity, View } from 'react-native'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import AppSearchBar from '../../../components/common/inputs/AppSearchBar'
import { SearchContextKey } from '../../../config/searchContexts'

// The single reusable search bar for the Bookings flow: the shared AppSearchBar pill plus the filter button.
// Every booking category (Doctor Appointments, Ancillary, Lab, Medicine, Radiology) renders this, and says
// what it searches through `context` (config/searchContexts.ts) so the prompt follows the screen and viewer.
interface BookingsSearchBarProps {
	value: string
	onChangeText: (text: string) => void
	context?: SearchContextKey
	/** Overrides the context prompt; leave out to use the context's. */
	placeholder?: string
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
	context,
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
				<AppSearchBar
					context={context}
					placeholder={placeholder}
					value={value}
					onChangeText={onChangeText}
					showMicrophone={showMicrophone}
					tone="onLight"
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
	filterIconButton: {
		width: 48,
		height: 48,
		borderRadius: 24,
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
