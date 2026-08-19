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
import {
	AppButton,
	AppScreenHeader,
	AppTypography,
} from '../../../components/common'
import { BookingProgressStepper } from '../components/BookingProgressStepper'
import { ServiceProcedureItem } from '../components/AllServiceCard'
import ApiService from '../../../services/apiService'
import { API_ENDPOINTS } from '../../../constants/apiUrls'
import { generateIdempotencyKey } from '../ancillaryService'
import StatusModal from '../../../components/common/StatusModal'

interface PaymentMethodItem {
	id: string
	title: string
	subtitle: string
	iconName: keyof typeof MaterialCommunityIcons.glyphMap
	badge?: string
	brandIcons?: string[]
}

const PAYMENT_METHODS: PaymentMethodItem[] = [
	{
		id: 'upi',
		title: 'UPI',
		subtitle: 'Pay via GPay, PhonePe, or Paytm',
		iconName: 'qrcode-scan',
		brandIcons: ['GPay', 'PhonePe', 'Paytm'],
		badge: 'Recommended',
	},
	{
		id: 'card',
		title: 'Credit / Debit Card',
		subtitle: 'Visa, Mastercard, RuPay & more',
		iconName: 'credit-card-outline',
		brandIcons: ['Visa', 'Mastercard', 'RuPay'],
	},
	{
		id: 'netbanking',
		title: 'Net Banking',
		subtitle: 'All major Indian banks supported',
		iconName: 'bank-outline',
	},
	{
		id: 'wallet',
		title: 'Digital Wallets',
		subtitle: 'Amazon Pay, Paytm Wallet & more',
		iconName: 'wallet-outline',
	},
	{
		id: 'cash',
		title: 'Cash After Service',
		subtitle: 'Pay cash to the practitioner at visit completion',
		iconName: 'cash-multiple',
		badge: 'No Extra Fee',
	},
]

export default function AncillaryPaymentPage() {
	const navigation = useNavigation<any>()
	const route = useRoute<any>()
	const insets = useSafeAreaInsets()
	const { width } = useWindowDimensions()
	const isTablet = width >= 768

	const bookingPayload = route.params?.bookingPayload || {}
	const services: ServiceProcedureItem[] = bookingPayload.services || [
		{
			id: 'gen1',
			title: 'Wound Dressing & Care',
			description: 'Sterile dressing for surgical, burn or chronic diabetic wounds',
			price: '₹499',
			image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=500&q=80',
		},
	]
	const charges = bookingPayload.charges || { totalAmount: '₹667', basePrice: '₹499', visitFee: '₹150', taxes: '₹18' }
	const visit = bookingPayload.visit || { date: 'Today, Aug 10, 2025', timeSlot: '09:00 AM - 10:00 AM' }

	const [selectedMethodId, setSelectedMethodId] = useState('upi')
	const [submitting, setSubmitting] = useState(false)
	const [summaryExpanded, setSummaryExpanded] = useState(false)

	const [activeTaskModalVisible, setActiveTaskModalVisible] = useState(false)
	const [existingActiveBookingId, setExistingActiveBookingId] = useState<string>('')

	const handlePaySecurely = async () => {
		setSubmitting(true)
		const idempotencyKey = generateIdempotencyKey()
		const publicId = `BK-${Math.floor(100000 + Math.random() * 900000)}`

		try {
			await ApiService.post(
				API_ENDPOINTS.ANCILLARY.REQUESTS,
				{
					publicBookingId: publicId,
					serviceTypeId: services[0]?.id || 'srv-01',
					bookingType: bookingPayload.bookingType || 'INSTANT',
					scheduledStartTime: bookingPayload.bookingType === 'SCHEDULED' ? visit.date : null,
					paymentMethod: selectedMethodId,
					address: {
						streetAddress: visit.address || 'User Address',
						latitude: 12.9716,
						longitude: 77.5946,
					},
					totalAmount: charges.totalAmount,
				},
				{ headers: { 'Idempotency-Key': idempotencyKey } }
			)
			setSubmitting(false)
			navigation.navigate(ROUTES.STACK.ANCILLARY_TRACK_APPOINTMENT, {
				bookingId: publicId,
				status: 'SEARCHING',
				bookingPayload: {
					...bookingPayload,
					paymentMethod: selectedMethodId,
				},
			})
		} catch (error: any) {
			setSubmitting(false)
			const errData = error.response?.data?.detail || error.response?.data
			if (error.response?.status === 409 || errData?.code === 'ACTIVE_TASK_EXISTS') {
				const activeId = errData?.activeTask?.requestId || errData?.activeTask?.publicBookingId || 'BK-ACTIVE'
				setExistingActiveBookingId(activeId)
				setActiveTaskModalVisible(true)
				return
			}
			navigation.navigate(ROUTES.STACK.ANCILLARY_TRACK_APPOINTMENT, {
				bookingId: publicId,
				status: 'SEARCHING',
				bookingPayload: {
					...bookingPayload,
					paymentMethod: selectedMethodId,
				},
			})
		}
	}

	return (
		<View style={styles.container}>
			<AppScreenHeader title="Complete Your Booking" />

			<ScrollView
				contentContainerStyle={[
					styles.scrollContent,
					isTablet && styles.scrollContentTablet,
					{ paddingBottom: insets.bottom + 120 },
				]}
				showsVerticalScrollIndicator={false}
			>
				{/* Booking Stage Progress */}
				<BookingProgressStepper currentStep={3} style={styles.progressStepper} />

				{/* SECTION 1: DYNAMIC ORDER OVERVIEW */}
				<View style={styles.overviewContainer}>
					<View style={styles.overviewHeaderRow}>
						<View style={styles.overviewSummaryCol}>
							<AppTypography variant="h3" style={styles.overviewTitle}>
								Booking Overview
							</AppTypography>
							<AppTypography variant="caption" style={styles.overviewSub}>
								{services.length} Service{services.length > 1 ? 's' : ''}  •  {charges.totalAmount}
							</AppTypography>
						</View>
						<TouchableOpacity
							style={styles.expandToggleBtn}
							onPress={() => setSummaryExpanded((prev) => !prev)}
							activeOpacity={0.7}
						>
							<AppTypography variant="caption" style={styles.expandToggleText}>
								{summaryExpanded ? 'Hide Details' : 'Show Details'}
							</AppTypography>
							<Ionicons
								name={summaryExpanded ? 'chevron-up' : 'chevron-down'}
								size={14}
								color="#1F5F68"
							/>
						</TouchableOpacity>
					</View>

					{/* Booking Date/Time Schedule row */}
					<View style={styles.scheduleRow}>
						<MaterialCommunityIcons name="calendar-clock" size={16} color="#1F5F68" />
						<AppTypography variant="body" style={styles.scheduleText}>
							{visit.date}  •  {visit.timeSlot}
						</AppTypography>
					</View>

					{/* Expandable Services list */}
					{summaryExpanded && (
						<View style={styles.expandedListContainer}>
							<View style={styles.horizontalLine} />
							{services.map((item, idx) => (
								<View key={item.id || idx} style={styles.compactServiceItem}>
									<View style={styles.compactServiceItemRow}>
										<Image source={{ uri: item.image }} style={styles.compactServiceImg} />
										<View style={styles.compactServiceTextCol}>
											<AppTypography variant="h4" style={styles.compactServiceTitle} numberOfLines={1}>
												{item.title}
											</AppTypography>
											<AppTypography variant="caption" style={styles.compactServiceDuration}>
												{item.duration || '30 - 45 mins'} • At Home
											</AppTypography>
										</View>
										<AppTypography variant="h4" style={styles.compactServicePrice}>
											{item.price}
										</AppTypography>
									</View>
								</View>
							))}

							<View style={styles.horizontalLine} />
							{/* Cost breakdown */}
							<View style={styles.pricingBreakdown}>
								<View style={styles.pricingRow}>
									<AppTypography variant="caption" style={styles.pricingLabel}>
										Treatment Fee
									</AppTypography>
									<AppTypography variant="caption" style={styles.pricingVal}>
										{charges.basePrice}
									</AppTypography>
								</View>
								<View style={styles.pricingRow}>
									<AppTypography variant="caption" style={styles.pricingLabel}>
										Home Visit & Sanitization
									</AppTypography>
									<AppTypography variant="caption" style={styles.pricingVal}>
										{charges.visitFee}
									</AppTypography>
								</View>
								<View style={styles.pricingRow}>
									<AppTypography variant="caption" style={styles.pricingLabel}>
										Taxes & Medical Admin
									</AppTypography>
									<AppTypography variant="caption" style={styles.pricingVal}>
										{charges.taxes}
									</AppTypography>
								</View>
							</View>
						</View>
					)}
				</View>

				{/* SECTION 2: CHOOSE PAYMENT METHOD */}
				<AppTypography variant="h3" style={styles.sectionHeading}>
					Select Payment Method
				</AppTypography>

				<View style={styles.paymentSelectorContainer}>
					{/* Group 1: Cash Options */}
					<View style={styles.paymentGroup}>
						<AppTypography variant="caption" style={styles.groupLabel}>
							Pay After Visit
						</AppTypography>
						{PAYMENT_METHODS.filter((m) => m.id === 'cash').map((method) => {
							const isSelected = selectedMethodId === method.id
							return (
								<TouchableOpacity
									key={method.id}
									style={[styles.methodRow, isSelected && styles.methodRowSelected]}
									onPress={() => setSelectedMethodId(method.id)}
									activeOpacity={0.8}
								>
									<View style={styles.methodIconBox}>
										<MaterialCommunityIcons name={method.iconName} size={20} color={isSelected ? '#1F5F68' : '#607D8B'} />
									</View>
									<View style={styles.methodDetailsCol}>
										<View style={styles.methodHeaderRow}>
											<AppTypography variant="h4" style={styles.methodTitle}>
												{method.title}
											</AppTypography>
											{method.badge && (
												<View style={styles.badgeChip}>
													<AppTypography variant="caption" style={styles.badgeChipText}>
														{method.badge}
													</AppTypography>
												</View>
											)}
										</View>
										<AppTypography variant="caption" style={styles.methodSub}>
											{method.subtitle}
										</AppTypography>
									</View>
									<View style={[styles.radioButton, isSelected && styles.radioButtonSelected]}>
										{isSelected && <View style={styles.radioDot} />}
									</View>
								</TouchableOpacity>
							)
						})}
					</View>

					{/* Group 2: Online Options (Simulated) */}
					<View style={styles.paymentGroup}>
						<AppTypography variant="caption" style={styles.groupLabel}>
							Prepay Online (Simulated)
						</AppTypography>
						{PAYMENT_METHODS.filter((m) => m.id !== 'cash').map((method) => {
							const isSelected = selectedMethodId === method.id
							return (
								<TouchableOpacity
									key={method.id}
									style={[styles.methodRow, isSelected && styles.methodRowSelected]}
									onPress={() => setSelectedMethodId(method.id)}
									activeOpacity={0.8}
								>
									<View style={styles.methodIconBox}>
										<MaterialCommunityIcons name={method.iconName} size={20} color={isSelected ? '#1F5F68' : '#607D8B'} />
									</View>
									<View style={styles.methodDetailsCol}>
										<View style={styles.methodHeaderRow}>
											<AppTypography variant="h4" style={styles.methodTitle}>
												{method.title}
											</AppTypography>
											{method.badge && (
												<View style={styles.recommendChip}>
													<AppTypography variant="caption" style={styles.recommendChipText}>
														{method.badge}
													</AppTypography>
												</View>
											)}
										</View>
										<AppTypography variant="caption" style={styles.methodSub}>
											{method.subtitle}
										</AppTypography>
										{method.brandIcons && (
											<View style={styles.brandLogosRow}>
												{method.brandIcons.map((brand) => (
													<View key={brand} style={styles.brandLogoTag}>
														<AppTypography variant="caption" style={styles.brandLogoText}>
															{brand}
														</AppTypography>
													</View>
												))}
											</View>
										)}
									</View>
									<View style={[styles.radioButton, isSelected && styles.radioButtonSelected]}>
										{isSelected && <View style={styles.radioDot} />}
									</View>
								</TouchableOpacity>
							)
						})}
					</View>
				</View>

				{/* Simulated Payment Notice Banner */}
				<View style={styles.simulatedNoticeBox}>
					<MaterialCommunityIcons name="information-outline" size={18} color="#0D9488" />
					<AppTypography variant="caption" style={styles.simulatedNoticeText}>
						You will not be billed immediately. Confirming now finalizes your scheduled nursing visit. Online payments can be completed at service conclusion.
					</AppTypography>
				</View>
			</ScrollView>

			{/* Sticky Bottom Footer */}
			<View style={[styles.stickyFooter, { paddingBottom: Math.max(insets.bottom, 12) }]}>
				<View style={styles.stickyLeft}>
					<AppTypography variant="caption" style={styles.stickyPayLabel}>
						Total Amount
					</AppTypography>
					<AppTypography variant="h2" style={styles.stickyPayVal}>
						{charges.totalAmount}
					</AppTypography>
					<AppTypography variant="caption" style={styles.stickyPaySub}>
						{selectedMethodId === 'cash' ? 'Pay after treatment' : 'Charged after visit'}
					</AppTypography>
				</View>

				<View style={styles.stickyActionCol}>
					<AppButton
						variant="primary"
						disabled={submitting}
						onPress={handlePaySecurely}
						style={styles.payBtn}
					>
						{submitting ? 'Confirming...' : selectedMethodId === 'cash' ? 'Confirm Booking' : 'Confirm & Proceed'}
					</AppButton>
					
					<View style={styles.termsWrapper}>
						<MaterialCommunityIcons name="shield-lock-outline" size={10} color="#78909C" />
						<AppTypography variant="caption" style={styles.termsText}>
							Secure Booking • Agreement to terms
						</AppTypography>
					</View>
				</View>
			</View>
			{/* Active Task Restriction Warning Modal */}
			<StatusModal
				visible={activeTaskModalVisible}
				status="error"
				title="Active Task in Progress"
				description="You already have a nurse task in progress. Please wait until it is completed before booking another task."
				submitText="View Active Task"
				onSubmit={() => {
					setActiveTaskModalVisible(false)
					navigation.navigate(ROUTES.STACK.ANCILLARY_TRACK_APPOINTMENT, {
						bookingId: existingActiveBookingId,
					})
				}}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#FFFFFF',
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
		paddingTop: 20,
	},
	progressStepper: {
		marginBottom: 20,
	},
	overviewContainer: {
		backgroundColor: '#F8FAFC',
		borderRadius: 16,
		borderWidth: 1,
		borderColor: '#ECEFF1',
		padding: 16,
		marginBottom: 20,
	},
	overviewHeaderRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	overviewSummaryCol: {
		flex: 1,
	},
	overviewTitle: {
		fontSize: 15,
		fontWeight: '800',
		color: '#1A2E35',
	},
	overviewSub: {
		fontSize: 12,
		color: '#546E7A',
		fontWeight: '600',
		marginTop: 2,
	},
	expandToggleBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 2,
		backgroundColor: '#E6F3F4',
		paddingHorizontal: 10,
		paddingVertical: 5,
		borderRadius: 8,
	},
	expandToggleText: {
		fontSize: 11,
		fontWeight: '700',
		color: '#1F5F68',
	},
	scheduleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginTop: 12,
	},
	scheduleText: {
		fontSize: 12,
		fontWeight: '700',
		color: '#1A2E35',
	},
	horizontalLine: {
		height: 1,
		backgroundColor: '#ECEFF1',
		marginVertical: 12,
	},
	expandedListContainer: {
		marginTop: 2,
	},
	compactServiceItem: {
		paddingVertical: 4,
	},
	compactServiceItemRow: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	compactServiceImg: {
		width: 32,
		height: 32,
		borderRadius: 6,
		backgroundColor: '#E2E8F0',
	},
	compactServiceTextCol: {
		flex: 1,
		marginLeft: 10,
	},
	compactServiceTitle: {
		fontSize: 13,
		fontWeight: '700',
		color: '#1A2E35',
	},
	compactServiceDuration: {
		fontSize: 10.5,
		color: '#78909C',
		marginTop: 1,
	},
	compactServicePrice: {
		fontSize: 13,
		fontWeight: '700',
		color: '#1A2E35',
		marginLeft: 8,
	},
	pricingBreakdown: {
		gap: 6,
	},
	pricingRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	pricingLabel: {
		fontSize: 11.5,
		color: '#78909C',
	},
	pricingVal: {
		fontSize: 12,
		fontWeight: '600',
		color: '#546E7A',
	},
	sectionHeading: {
		fontSize: 15,
		fontWeight: '800',
		color: '#1A2E35',
		marginBottom: 12,
	},
	paymentSelectorContainer: {
		gap: 16,
		marginBottom: 16,
	},
	paymentGroup: {
		gap: 8,
	},
	groupLabel: {
		fontSize: 11,
		fontWeight: '800',
		color: '#78909C',
		textTransform: 'uppercase',
		letterSpacing: 0.5,
		marginBottom: 2,
	},
	methodRow: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		padding: 14,
		borderWidth: 1,
		borderColor: '#ECEFF1',
	},
	methodRowSelected: {
		backgroundColor: '#F0F9F9',
		borderColor: '#1F5F68',
	},
	methodIconBox: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: '#ECEFF1',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 12,
	},
	methodDetailsCol: {
		flex: 1,
		marginRight: 8,
	},
	methodHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	methodTitle: {
		fontSize: 14,
		fontWeight: '800',
		color: '#1A2E35',
	},
	methodSub: {
		fontSize: 11,
		color: '#607D8B',
		marginTop: 1,
		lineHeight: 14,
	},
	badgeChip: {
		backgroundColor: '#E6F3F4',
		paddingHorizontal: 6,
		paddingVertical: 1.5,
		borderRadius: 6,
	},
	badgeChipText: {
		fontSize: 9,
		fontWeight: '700',
		color: '#1F5F68',
	},
	recommendChip: {
		backgroundColor: '#FFE0B2',
		paddingHorizontal: 6,
		paddingVertical: 1.5,
		borderRadius: 6,
	},
	recommendChipText: {
		fontSize: 9,
		fontWeight: '700',
		color: '#E65100',
	},
	brandLogosRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		marginTop: 4,
	},
	brandLogoTag: {
		backgroundColor: '#ECEFF1',
		paddingHorizontal: 5,
		paddingVertical: 1.5,
		borderRadius: 4,
	},
	brandLogoText: {
		fontSize: 9,
		fontWeight: '700',
		color: '#546E7A',
	},
	radioButton: {
		width: 18,
		height: 18,
		borderRadius: 9,
		borderWidth: 1.5,
		borderColor: '#CFD8DC',
		alignItems: 'center',
		justifyContent: 'center',
	},
	radioButtonSelected: {
		borderColor: '#1F5F68',
	},
	radioDot: {
		width: 10,
		height: 10,
		borderRadius: 5,
		backgroundColor: '#1F5F68',
	},
	simulatedNoticeBox: {
		flexDirection: 'row',
		backgroundColor: '#F0F9F9',
		borderRadius: 12,
		padding: 12,
		marginTop: 12,
		marginBottom: 24,
		alignItems: 'center',
		gap: 10,
	},
	simulatedNoticeText: {
		flex: 1,
		fontSize: 10.5,
		color: '#1F5F68',
		lineHeight: 14.5,
		fontWeight: '500',
	},
	stickyFooter: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		backgroundColor: '#FFFFFF',
		borderTopWidth: 1,
		borderTopColor: '#ECEFF1',
		paddingHorizontal: 16,
		paddingTop: 12,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		elevation: 8,
		shadowColor: '#000000',
		shadowOffset: { width: 0, height: -3 },
		shadowOpacity: 0.08,
		shadowRadius: 6,
	},
	stickyLeft: {
		flex: 1,
		marginRight: 12,
	},
	stickyPayLabel: {
		fontSize: 10,
		color: '#78909C',
		fontWeight: '700',
		textTransform: 'uppercase',
	},
	stickyPayVal: {
		fontSize: 20,
		fontWeight: '800',
		color: '#1F5F68',
		lineHeight: 24,
	},
	stickyPaySub: {
		fontSize: 10.5,
		color: '#78909C',
		marginTop: 1,
	},
	stickyActionCol: {
		alignItems: 'center',
		gap: 4,
	},
	payBtn: {
		backgroundColor: '#1F5F68',
		borderRadius: 12,
		minWidth: 180,
		height: 48,
		justifyContent: 'center',
	},
	termsWrapper: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 3,
		marginTop: 2,
	},
	termsText: {
		fontSize: 9.5,
		color: '#78909C',
		fontWeight: '500',
	},
})
