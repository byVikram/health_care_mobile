import React, { useState } from 'react'
import {
	Image,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
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
import { ServiceProcedureItem } from '../components/AllServiceCard'

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
	const initialServices =
		routeParams.services && routeParams.services.length > 0
			? routeParams.services
			: DEFAULT_MOCK_SERVICES

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
								<View key={item.id} style={styles.serviceCard}>
									{item.image ? (
										<Image source={{ uri: item.image }} style={styles.serviceImage} resizeMode="cover" />
									) : null}

									<View style={styles.serviceContent}>
										<View style={styles.cardHeaderRow}>
											<AppTypography variant="h4" style={styles.serviceName} numberOfLines={1}>
												{item.title}
											</AppTypography>
											<TouchableOpacity
												style={styles.removeBtn}
												onPress={() => handleRemoveService(item.id)}
												activeOpacity={0.7}
											>
												<Ionicons name="trash-outline" size={18} color="#D32F2F" />
											</TouchableOpacity>
										</View>

										{/* Badges Row */}
										<View style={styles.badgeRow}>
											{item.verified && (
												<View style={styles.verifiedBadge}>
													<Ionicons name="checkmark-circle" size={11} color="#1F5F68" />
													<AppTypography variant="caption" style={styles.verifiedText}>
														Verified
													</AppTypography>
												</View>
											)}

											{item.premiumBadgeText && (
												<View style={styles.premiumBadge}>
													<AppTypography variant="caption" style={styles.premiumText}>
														{item.premiumBadgeText}
													</AppTypography>
												</View>
											)}
										</View>

										<AppTypography variant="caption" style={styles.serviceDesc} numberOfLines={2}>
											{item.description}
										</AppTypography>

										<View style={styles.cardFooterRow}>
											<View style={styles.durationRow}>
												<Ionicons name="time-outline" size={13} color="#64748B" />
												<AppTypography variant="caption" style={styles.durationText}>
													{item.duration}
												</AppTypography>
											</View>

											<AppTypography variant="body" style={styles.priceText}>
												{item.price}
											</AppTypography>
										</View>
									</View>
								</View>
							))}
						</View>

						{/* 3. Booking Summary Breakdown Card */}
						<View style={styles.summaryCard}>
							<AppTypography variant="h3" style={styles.summaryTitle}>
								Summary Breakdown
							</AppTypography>

							<View style={styles.summaryRow}>
								<AppTypography variant="body" style={styles.summaryLabel}>
									Total Services
								</AppTypography>
								<AppTypography variant="body" style={styles.summaryValue}>
									{services.length} Service{services.length > 1 ? 's' : ''}
								</AppTypography>
							</View>

							<View style={styles.summaryRow}>
								<AppTypography variant="body" style={styles.summaryLabel}>
									Est. Starting Total
								</AppTypography>
								<AppTypography variant="h4" style={styles.totalPriceValue}>
									{calculateEstimatedTotal()}
								</AppTypography>
							</View>

							<View style={styles.divider} />

							<View style={styles.noteRow}>
								<MaterialCommunityIcons
									name="information-outline"
									size={18}
									color="#1F5F68"
									style={styles.noteIcon}
								/>
								<AppTypography variant="caption" style={styles.noteText}>
									Estimated total starting price. Final pricing will be determined based on specific case severity and service requirements.
								</AppTypography>
							</View>
						</View>

						{/* 4. Continue Button */}
						<View style={styles.ctaWrapper}>
							<AppButton variant="primary" formAction style={styles.continueBtn} onPress={handleContinue}>
								Continue
							</AppButton>
						</View>
					</>
				) : (
					/* 5. Empty State when all services are removed */
					<View style={styles.emptyContainer}>
						<View style={styles.emptyIconCircle}>
							<MaterialCommunityIcons name="medical-bag" size={48} color="#1F5F68" />
						</View>

						<AppTypography variant="h2" style={styles.emptyTitle}>
							No Services Selected
						</AppTypography>

						<AppTypography variant="body" style={styles.emptySubtitle}>
							Your booking summary is currently empty. Please browse our healthcare services and select a service to proceed.
						</AppTypography>

						<AppButton
							variant="primary"
							formAction
							style={styles.browseBtn}
							onPress={handleBrowseServices}
						>
							Browse Services
						</AppButton>
					</View>
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
	serviceCard: {
		flexDirection: 'row',
		backgroundColor: '#FFFFFF',
		borderRadius: 14,
		padding: 12,
		borderWidth: 1,
		borderColor: '#E8ECEC',
		elevation: 1,
		shadowColor: '#000000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.04,
		shadowRadius: 3,
	},
	serviceImage: {
		width: 76,
		height: 76,
		borderRadius: 10,
		backgroundColor: '#F1F5F9',
	},
	serviceContent: {
		flex: 1,
		marginLeft: 12,
		justifyContent: 'space-between',
	},
	cardHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	serviceName: {
		fontSize: 15,
		fontWeight: '700',
		color: '#191C1D',
		flex: 1,
		lineHeight: 20,
	},
	removeBtn: {
		padding: 4,
		marginLeft: 8,
	},
	badgeRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		marginTop: 2,
		marginBottom: 4,
	},
	verifiedBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#E6F3F4',
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 10,
		gap: 2,
	},
	verifiedText: {
		fontSize: 10,
		fontWeight: '600',
		color: '#1F5F68',
	},
	premiumBadge: {
		backgroundColor: '#CFF4F5',
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 10,
	},
	premiumText: {
		fontSize: 9,
		fontWeight: '700',
		color: '#0D474D',
		letterSpacing: 0.3,
	},
	serviceDesc: {
		fontSize: 11,
		color: '#5E6B70',
		lineHeight: 15,
	},
	cardFooterRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginTop: 6,
	},
	durationRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	durationText: {
		fontSize: 11,
		color: '#64748B',
	},
	priceText: {
		fontSize: 13,
		fontWeight: '700',
		color: '#1F5F68',
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
	summaryTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#191C1D',
		marginBottom: 14,
	},
	summaryRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 10,
	},
	summaryLabel: {
		fontSize: 13,
		color: '#526062',
	},
	summaryValue: {
		fontSize: 14,
		fontWeight: '600',
		color: '#191C1D',
	},
	totalPriceValue: {
		fontSize: 16,
		fontWeight: '700',
		color: '#1F5F68',
	},
	divider: {
		height: 1,
		backgroundColor: '#E8ECEC',
		marginVertical: 12,
	},
	noteRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		backgroundColor: '#F0F9F9',
		borderRadius: 10,
		padding: 10,
	},
	noteIcon: {
		marginRight: 8,
		marginTop: 1,
	},
	noteText: {
		flex: 1,
		fontSize: 11,
		color: '#1F5F68',
		lineHeight: 15,
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
	emptyIconCircle: {
		width: 80,
		height: 80,
		borderRadius: 40,
		backgroundColor: '#F0F9F9',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 16,
	},
	emptyTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: '#191C1D',
		marginBottom: 8,
	},
	emptySubtitle: {
		fontSize: 13,
		color: '#526062',
		textAlign: 'center',
		lineHeight: 18,
		marginBottom: 24,
	},
	browseBtn: {
		minWidth: 180,
		borderRadius: 14,
	},
})
