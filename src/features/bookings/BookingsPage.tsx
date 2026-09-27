import React, { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'

import AppScreenHeader from '../../components/common/layout/AppScreenHeader'
import { ROUTES } from '../../navigation/routes'
import type { BookingsFilterKey, MainTabParamList } from '../../navigation/types'

import AppointmentList from '../appointment/AppointmentList'
import MyBookingsPage from '../ancillary/patient/MyBookingsPage'
import OrderListPage from '../pharmacy/OrderListPage'
import OrderListLaboratoryPage from '../laboratory_duplicated/OrderListLaboratoryPage'
import OrderListRadiologyPage from '../radiology/OrderListRadiologyPage'

const FILTERS: { key: BookingsFilterKey; label: string }[] = [
	{ key: 'doctor', label: 'Doctor Appointments' },
	{ key: 'ancillary', label: 'Ancillary' },
	{ key: 'lab', label: 'Lab' },
	{ key: 'medicine', label: 'Medicine' },
	{ key: 'radiology', label: 'Radiology' },
]

type PortalRouteProp = RouteProp<MainTabParamList, typeof ROUTES.MAIN.PORTAL>

// The consolidated Bookings page. BookingsPage is the parent and single
// owner of the booking-category filter UI: it renders the category chips
// once, here, and swaps in the existing page/tab for whichever category is
// selected. Each child page keeps its own search bar and its own
// category-specific filter icon/sheet (mode filters for Doctor
// Appointments, status tabs for Ancillary, order-status filters for
// Medicine/Lab/Radiology) — those already vary correctly per category
// simply because a different child is mounted. No new booking
// functionality is implemented here; every category below reuses its
// existing component, service, and API calls unchanged, and none of them
// receive a serviceFilterRow prop anymore.
export default function BookingsPage() {
	const navigation = useNavigation<any>()
	const route = useRoute<PortalRouteProp>()

	const [filter, setFilter] = useState<BookingsFilterKey>(route.params?.filter ?? 'doctor')

	// If the Side Drawer (or anything else) re-navigates to this same tab
	// with a different filter param while it's already mounted, sync state.
	useEffect(() => {
		if (route.params?.filter) {
			setFilter(route.params.filter)
		}
	}, [route.params?.filter])

	return (
		<View style={styles.container}>
			<AppScreenHeader title="Bookings" onBack={() => navigation.navigate(ROUTES.MAIN.HOME)} />

			{/* Parent-level, category-switching filter row. This is the single
				owned instance — it is rendered directly here, always visible,
				and is never passed down into a child. */}
			<View style={styles.filterRowWrapper}>
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					style={styles.filterScroller}
					contentContainerStyle={styles.filterRow}
				>
					{FILTERS.map((option) => {
						const selected = option.key === filter
						return (
							<TouchableOpacity
								key={option.key}
								style={[styles.filterChip, selected && styles.filterChipActive]}
								onPress={() => setFilter(option.key)}
								activeOpacity={0.82}
							>
								<Text style={[styles.filterChipText, selected && styles.filterChipTextActive]}>
									{option.label}
								</Text>
							</TouchableOpacity>
						)
					})}
				</ScrollView>
			</View>

			<View style={styles.content}>
				{filter === 'doctor' && <AppointmentList />}
				{filter === 'ancillary' && <MyBookingsPage showHeader={false} />}
				{filter === 'lab' && <OrderListLaboratoryPage />}
				{filter === 'medicine' && <OrderListPage />}
				{filter === 'radiology' && <OrderListRadiologyPage />}
			</View>
		</View>
	)
}

const CHIP_ROW_HEIGHT = 62 // 38px chip + 12px top/bottom padding

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f8fafc',
	},
	// Pinned height + flexGrow/flexShrink 0 so this row can't be stretched
	// vertically by a parent's default alignItems:'stretch'.
	filterRowWrapper: {
		height: CHIP_ROW_HEIGHT,
		flexGrow: 0,
		flexShrink: 0,
		backgroundColor: '#ffffff',
	},
	filterScroller: {
		flexGrow: 0,
		flexShrink: 0,
	},
	filterRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		paddingHorizontal: 16,
		paddingVertical: 12,
	},
	// Values intentionally match the app's established filterChip pattern
	// (see renderFilterChips in OrderListPage / OrderListLaboratoryPage /
	// OrderListRadiologyPage / DoctorSearchPage) so this row reads as the
	// same compact chip used elsewhere in the app, not a one-off style.
	// height + alignSelf pin the chip so it can never inherit a stretched
	// cross-axis size from its row.
	filterChip: {
		height: 38,
		minWidth: 74,
		borderRadius: 19,
		paddingHorizontal: 18,
		alignItems: 'center',
		justifyContent: 'center',
		alignSelf: 'center',
		backgroundColor: '#f0f7f7',
	},
	filterChipActive: {
		backgroundColor: '#1f5f68',
	},
	filterChipText: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '700',
		color: '#64707d',
	},
	filterChipTextActive: {
		color: '#ffffff',
	},
	content: {
		flex: 1,
	},
})
