import React, { useState } from 'react'
import {
	ScrollView,
	StyleSheet,
	View,
	useWindowDimensions,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { ROUTES } from '../../../navigation/routes'
import AppScreenHeader from '../../../components/common/layout/AppScreenHeader'
import { AppTypography } from '../../../components/common/display/AppTypography'
import { AppButton } from '../../../components/common/buttons/AppButton'
import {
	BillingSummaryCard,
	SelectedItemCard,
	ServiceProcedureItem,
	SummaryEmptyState,
} from '../../../components/common'

const DEFAULT_MOCK_SERVICES: ServiceProcedureItem[] = [
	{
		id: 'gen1',
		title: 'Wound Dressing & Care',
		description: 'Sterile dressing for surgical, burn, or chronic diabetic wounds',
		duration: '30 - 45 mins',
		price: '₹499',
		image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=500&q=80',
		verified: true,
	},
	{
		id: 'gen2',
		title: 'IV Fluids & Medication Drip',
		description: 'Intravenous fluid infusion & saline drip under doctor prescription',
		duration: '45 - 60 mins',
		price: '₹799',
		image: 'https://images.unsplash.com/photo-1631815588090-d4bfec5b1cdb?auto=format&fit=crop&w=500&q=80',
		verified: true,
	},
]

export default function BookingCartPage() {
	const navigation = useNavigation<any>()
	const route = useRoute<any>()
	const insets = useSafeAreaInsets()
	const { width } = useWindowDimensions()
	const isTablet = width >= 768

	const routeParams = route.params || {}
	const initialServices =
		routeParams.services && routeParams.services.length > 0
			? routeParams.services
			: DEFAULT_MOCK_SERVICES

	const [services, setServices] = useState<ServiceProcedureItem[]>(initialServices)

	const handleRemoveService = (serviceId: string) => {
		setServices((prev) => prev.filter((s) => s.id !== serviceId))
	}

	const handleContinueBooking = () => {
		navigation.navigate(ROUTES.STACK.ANCILLARY_BOOKING_DETAILS, {
			services,
			serviceName: services[0]?.title || 'Healthcare Service',
			description: services.map((s) => s.title).join(', '),
			price: services[0]?.price,
			image: services[0]?.image,
		})
	}

	const handleBrowseServices = () => {
		if (navigation.canGoBack()) {
			navigation.goBack()
		} else {
			navigation.navigate(ROUTES.STACK.ANCILLARY_SERVICES, {
				serviceKey: 'nursing',
				serviceLabel: 'Nursing Care',
			})
		}
	}

	return (
		<View style={styles.container}>
			<AppScreenHeader title="Booking Cart" />

			<ScrollView
				contentContainerStyle={[
					styles.scrollContent,
					isTablet && styles.scrollContentTablet,
					{ paddingBottom: insets.bottom + 24 },
				]}
				showsVerticalScrollIndicator={false}
			>
				{services.length > 0 ? (
					<>
						{/* 1. Header Title */}
						<View style={styles.sectionHeader}>
							<AppTypography variant="h2" style={styles.mainTitle}>
								Your Booking Cart ({services.length})
							</AppTypography>
							<AppTypography variant="caption" style={styles.subTitle}>
								Review selected healthcare services before proceeding to patient details
							</AppTypography>
						</View>

						{/* 2. Selected Services List */}
						<View style={styles.servicesList}>
							{services.map((item) => (
								<SelectedItemCard
									key={item.id}
									image={item.image}
									title={item.title}
									description={item.description}
									durationLabel={item.duration || 'Flexible duration'}
									price={item.price}
									onRemove={() => handleRemoveService(item.id)}
									badges={[
										...(item.verified
											? [
													{
														icon: <Ionicons name="checkmark-circle" size={11} color="#1F5F68" />,
														text: 'Verified',
														backgroundColor: '#E6F3F4',
														textColor: '#1F5F68',
													},
												]
											: []),
										...(item.premiumBadgeText
											? [
													{
														text: item.premiumBadgeText,
														backgroundColor: '#CFF4F5',
														textColor: '#0D474D',
													},
												]
											: []),
									]}
								/>
							))}
						</View>

						{/* 3. Cart Summary Card */}
						<BillingSummaryCard
							title="Selected Services Breakdown"
							style={styles.summaryCard}
							rows={[
								{
									label: 'Total Selected Services',
									value: `${services.length} Service${services.length > 1 ? 's' : ''}`,
									valueStyle: styles.summaryValue,
								},
							]}
							note={{
								icon: <MaterialCommunityIcons name="information-outline" size={18} color="#1F5F68" />,
								text: 'Final pricing will be calculated after entering patient information, case severity details, visit location, date, and appointment time slot.',
							}}
						/>

						{/* 4. Continue Booking Button */}
						<View style={styles.ctaWrapper}>
							<AppButton
								variant="primary"
								formAction
								style={styles.continueBtn}
								onPress={handleContinueBooking}
							>
								Continue Booking
							</AppButton>
						</View>
					</>
				) : (
					/* 5. Empty Cart State */
					<SummaryEmptyState
						icon={<MaterialCommunityIcons name="shopping-outline" size={48} color="#1F5F68" />}
						title="Booking Cart Empty"
						subtitle="You currently have no services selected. Browse our nursing procedures to add a service to your booking."
						ctaLabel="Browse Services"
						onPress={handleBrowseServices}
						ctaFormAction
						style={styles.emptyContainer}
					/>
				)}
			</ScrollView>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F8FAFC',
	},
	scrollContent: {
		paddingHorizontal: 16,
		paddingTop: 16,
	},
	scrollContentTablet: {
		maxWidth: 720,
		width: '100%',
		alignSelf: 'center',
		paddingHorizontal: 24,
		paddingTop: 24,
	},
	sectionHeader: {
		marginBottom: 16,
	},
	mainTitle: {
		fontSize: 20,
		fontWeight: '700',
		color: '#191C1D',
		lineHeight: 26,
	},
	subTitle: {
		fontSize: 13,
		color: '#526062',
		marginTop: 2,
	},
	servicesList: {
		marginBottom: 16,
		gap: 12,
	},
	summaryCard: {
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		padding: 16,
		marginBottom: 20,
		borderWidth: 1,
		borderColor: '#E8ECEC',
		elevation: 1,
		shadowColor: '#000000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.04,
		shadowRadius: 4,
	},
	summaryValue: {
		fontSize: 15,
		fontWeight: '700',
		color: '#1F5F68',
	},
	ctaWrapper: {
		marginTop: 4,
		marginBottom: 16,
	},
	continueBtn: {
		width: '100%',
		borderRadius: 14,
	},
	emptyContainer: {
		backgroundColor: '#FFFFFF',
		borderRadius: 20,
		padding: 24,
		alignItems: 'center',
		marginTop: 40,
		borderWidth: 1,
		borderColor: '#E8ECEC',
	},
})
