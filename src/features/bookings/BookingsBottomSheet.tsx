import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useNavigation, type NavigationProp } from '@react-navigation/native'
import { useTheme } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppBottomSheet } from '../../components/common/AppBottomSheet'
import BookingOptionCard from './components/BookingOptionCard'
import { ROUTES } from '../../navigation/routes'
import type { AppStackParamList } from '../../navigation/types'
import AppointmentsIcon from '../../assets/quick-services/appointments.svg'

const SIDEBAR_ICON_COLOR = '#41565c'
const SIDEBAR_ICON_BG_COLOR = 'transparent'

interface BookingsBottomSheetProps {
	visible: boolean
	onClose: () => void
}

interface BookingOption {
	id: string
	label: string
	iconName?: keyof typeof MaterialCommunityIcons.glyphMap
	icon?: React.ReactNode
	iconColor: string
	iconBgColor: string
	route: string
}

export default function BookingsBottomSheet({ visible, onClose }: BookingsBottomSheetProps) {
	const navigation = useNavigation<NavigationProp<AppStackParamList>>()
	const theme = useTheme()

	const navigateTo = (route: string) => {
		onClose()
		navigation.navigate(route as any)
	}

	const careOptions: BookingOption[] = [
		{
			id: 'my-appointments',
			label: 'My Appointments',
			icon: <AppointmentsIcon width={30} height={30} />,
			iconColor: theme.colors.primary,
			iconBgColor: SIDEBAR_ICON_BG_COLOR,
			route: ROUTES.STACK.APPOINTMENTS,
		},
		{
			id: 'ancillary-orders',
			label: 'Ancillary Orders',
			icon: <MaterialCommunityIcons name="medical-bag" size={30} color={SIDEBAR_ICON_COLOR} />,
			iconColor: SIDEBAR_ICON_COLOR,
			iconBgColor: SIDEBAR_ICON_BG_COLOR,
			route: ROUTES.STACK.ANCILLARY_MY_BOOKINGS,
		},
	]

	const orderOptions: BookingOption[] = [
		{
			id: 'medicine-orders',
			label: 'Medicine Orders',
			icon: <MaterialCommunityIcons name="pill" size={30} color={SIDEBAR_ICON_COLOR} />,
			iconColor: SIDEBAR_ICON_COLOR,
			iconBgColor: SIDEBAR_ICON_BG_COLOR,
			route: ROUTES.STACK.ORDER_LIST,
		},
		{
			id: 'lab-bookings',
			label: 'Lab Bookings',
			icon: <MaterialCommunityIcons name="clipboard-text-play-outline" size={30} color={SIDEBAR_ICON_COLOR} />,
			iconColor: SIDEBAR_ICON_COLOR,
			iconBgColor: SIDEBAR_ICON_BG_COLOR,
			route: ROUTES.STACK.LABORATORY_ORDERS,
		},
		{
			id: 'radiology-bookings',
			label: 'Radiology Bookings',
			icon: <MaterialCommunityIcons name="clipboard-text-play-outline" size={30} color={SIDEBAR_ICON_COLOR} />,
			iconColor: SIDEBAR_ICON_COLOR,
			iconBgColor: SIDEBAR_ICON_BG_COLOR,
			route: ROUTES.STACK.RADIOLOGY_ORDERS,
		},
	]

	const renderGrid = (options: BookingOption[]) => (
		<View style={styles.grid}>
			{options.map((option) => (
				<BookingOptionCard
					key={option.id}
					label={option.label}
					iconName={option.iconName}
					icon={option.icon}
					iconColor={option.iconColor}
					iconBgColor={option.iconBgColor}
					onPress={() => navigateTo(option.route)}
					width="30%"
				/>
			))}
		</View>
	)

	return (
		<AppBottomSheet visible={visible} title="Bookings" onClose={onClose} maxHeightRatio={0.68}>
			<Text style={styles.sectionTitle}>Care & Appointments</Text>
			{renderGrid(careOptions)}

			<Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>Orders & Reports</Text>
			{renderGrid(orderOptions)}
		</AppBottomSheet>
	)
}

const styles = StyleSheet.create({
	sectionTitle: {
		fontSize: 15,
		fontWeight: '800',
		color: '#16324A',
		marginBottom: 16,
	},
	sectionTitleSpaced: {
		marginTop: 28,
	},
	grid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'center',
		gap: 14,
	},
})
