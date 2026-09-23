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
import AppScreenHeader from '../../../components/common/AppScreenHeader'
import { AppTypography } from '../../../components/common/AppTypography'
import { AppButton } from '../../../components/common/AppButton'
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

export default function BookingSummaryPage() {
	const navigation = useNavigation<any>()
	const route = useRoute<any>()
	const insets = useSafeAreaInsets()
	const { width } = useWindowDimensions()
	const isTablet = width >= 768

	const routeParams = route.params || {}
	const payloadObj = routeParams.bookingPayload || routeParams.payload || {}
	const initialServices: ServiceProcedureItem[] =
		(payloadObj.services && Array.isArray(payloadObj.services) && payloadObj.services.length > 0)
			? payloadObj.services
			: (routeParams.services && Array.isArray(routeParams.services) && routeParams.services.length > 0)
				? routeParams.services
				: (routeParams.selectedServices && Array.isArray(routeParams.selectedServices) && routeParams.selectedServices.length > 0)
					? routeParams.selectedServices
					: (routeParams.service ? [routeParams.service] : DEFAULT_MOCK_SERVICES)

	const [services, setServices] = useState<ServiceProcedureItem[]>(initialServices)

	const handleRemoveService = (serviceId: string) => {
		setServices((prev) => prev.filter((s) => s.id !== serviceId))
	}

	const handleContinue = () => {
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

	// Price summary calculation (numeric sum when possible)
	const calculateEstimatedTotal = () => {
		let total = 0
		let hasCustomPricing = false

		services.forEach((s) => {
			if (s.price && s.price.includes('₹')) {
				const num = parseInt(s.price.replace(/[^0-9]/g, ''), 10)
				if (!isNaN(num)) total += num
			} else {
				hasCustomPricing = true
			}
		})

		if (hasCustomPricing && total === 0) return 'Custom Pricing'
		if (hasCustomPricing && total > 0) return `From ₹${total} + Custom`
		return `₹${total}`
	}

	return (
		<View style={styles.container}>
			<AppScreenHeader title="Booking Summary" />

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
								Selected Services ({services.length})
							</AppTypography>
							<AppTypography variant="caption" style={styles.subTitle}>
								Review selected healthcare services before providing patient details
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
									durationLabel={item.duration}
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

						{/* 3. Booking Summary Breakdown Card */}
						<BillingSummaryCard
							title="Summary Breakdown"
							style={styles.summaryCard}
							rows={[
								{ label: 'Total Services', value: `${services.length} Service${services.length > 1 ? 's' : ''}` },
								{
									label: 'Est. Starting Total',
									value: calculateEstimatedTotal(),
									valueStyle: styles.totalPriceValue,
								},
							]}
							note={{
								icon: <MaterialCommunityIcons name="information-outline" size={18} color="#1F5F68" />,
								text: 'Estimated total starting price. Final pricing will be determined based on specific case severity and service requirements.',
							}}
						/>

						{/* 4. Continue Button */}
						<View style={styles.ctaWrapper}>
							<AppButton variant="primary" formAction style={styles.continueBtn} onPress={handleContinue}>
								Continue
							</AppButton>
						</View>
					</>
				) : (
					/* 5. Empty State when all services are removed */
					<SummaryEmptyState
						icon={<MaterialCommunityIcons name="medical-bag" size={48} color="#1F5F68" />}
						title="No Services Selected"
						subtitle="Your booking summary is currently empty. Please browse our healthcare services and select a service to proceed."
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
	totalPriceValue: {
		fontSize: 16,
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
