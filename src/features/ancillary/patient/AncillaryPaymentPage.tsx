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
		title: 'UPI Payment',
		subtitle: 'Instant pay via GPay, PhonePe, or Paytm',
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
		id: 'cash',
		title: 'Cash / Pay After Service',
		subtitle: 'Pay practitioner directly upon visit completion',
		iconName: 'cash-multiple',
		badge: 'No Extra Fee',
	},
	{
		id: 'netbanking',
		title: 'Net Banking',
		subtitle: 'All major Indian banks supported',
		iconName: 'bank-outline',
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
	const isInstant = bookingPayload.bookingType === 'INSTANT' || (!bookingPayload.bookingType && !bookingPayload.visit?.date)

	const todayDynamic = `Today, ${new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}`
	const visit = bookingPayload.visit || {
		date: todayDynamic,
		timeSlot: '09:00 AM - 10:00 AM',
		address: 'User Selected Location',
	}

	const scheduleDisplayText = isInstant
		? "Instant Care: Dispatch within 15 - 30 minutes"
		: `${visit.date} • ${visit.timeSlot}`

	const [selectedMethodId, setSelectedMethodId] = useState('upi')
	const [submitting, setSubmitting] = useState(false)
	const [summaryExpanded, setSummaryExpanded] = useState(false)

	const [activeTaskModalVisible, setActiveTaskModalVisible] = useState(false)
	const [existingActiveBookingId, setExistingActiveBookingId] = useState<string>('')

	const patientInfo = bookingPayload.patient || {
		publicId: bookingPayload.patientPublicId,
		name: 'Patient Recipient',
		age: 0,
		gender: '',
		relationship: 'Self',
	}

	const handlePaySecurely = async () => {
		setSubmitting(true)
		const idempotencyKey = generateIdempotencyKey()
		const publicId = `BK-${Math.floor(100000 + Math.random() * 900000)}`

		const targetPublicId = patientInfo?.publicId || patientInfo?.id || bookingPayload.patientPublicId

		const requestPayload = {
			publicBookingId: publicId,
			// Send every selected service/procedure so the backend creates one
			// parent request with a child ancillary_request_procedures row per
			// procedure. serviceTypeId is kept as a single-item fallback for any
			// older path that only reads the singular field.
			serviceTypeIds: services.map((s) => s.id),
			serviceTypeId: services[0]?.id || 'srv-01',
			bookingType: bookingPayload.bookingType || 'INSTANT',
			scheduledStartTime: bookingPayload.bookingType === 'SCHEDULED' ? visit.date : null,
			paymentMethod: selectedMethodId,
			patientPublicId: targetPublicId,
			address: {
				streetAddress: visit.address || 'User Address',
				...(visit?.latitude != null ? { latitude: visit.latitude } : {}),
				...(visit?.longitude != null ? { longitude: visit.longitude } : {}),
			},
			totalAmount: charges.totalAmount,
		}

		console.log('\n========================================')
		console.log('🚀 [ANCILLARY_ORDER_FRONTEND] SUBMITTING ORDER PAYLOAD:')
		console.log(JSON.stringify(requestPayload, null, 2))
		console.log('========================================\n')

		try {
			const res = await ApiService.post(
				API_ENDPOINTS.ANCILLARY.REQUESTS,
				requestPayload,
				{ headers: { 'Idempotency-Key': idempotencyKey } }
			)
			console.log('\n========================================')
			console.log('✅ [ANCILLARY_ORDER_FRONTEND] ORDER RESPONSE RECEIVED:')
			console.log(JSON.stringify(res.data, null, 2))
			console.log('========================================\n')

			setSubmitting(false)
			navigation.navigate(ROUTES.STACK.ANCILLARY_SERVICE_MATCHING, {
				bookingId: publicId,
				serviceName: services.map((s) => s.title).filter(Boolean).join(', ') || 'In-Home Care Service',
				addressText: visit.address || 'User Location',
				bookingPayload: {
					...bookingPayload,
					paymentMethod: selectedMethodId,
				},
			})
		} catch (error: any) {
			setSubmitting(false)
			const errData = error.response?.data?.detail || error.response?.data
			console.log('\n========================================')
			console.log('❌ [ANCILLARY_ORDER_FRONTEND] ORDER FAILED:', errData || error.message)
			console.log('========================================\n')
			if (error.response?.status === 409 || errData?.code === 'ACTIVE_TASK_EXISTS') {
				const activeId = errData?.activeTask?.requestId || errData?.activeTask?.publicBookingId || 'BK-ACTIVE'
				setExistingActiveBookingId(activeId)
				setActiveTaskModalVisible(true)
				return
			}
			navigation.navigate(ROUTES.STACK.ANCILLARY_SERVICE_MATCHING, {
				bookingId: publicId,
				serviceName: services.map((s) => s.title).filter(Boolean).join(', ') || 'In-Home Care Service',
				addressText: visit.address || 'User Location',
				bookingPayload: {
					...bookingPayload,
					paymentMethod: selectedMethodId,
				},
			})
		}
	}

	return (
		<View style={styles.container}>
			<AppScreenHeader title="Complete Payment" />

			<ScrollView
				contentContainerStyle={[
					styles.scrollContent,
					isTablet && styles.scrollContentTablet,
					{ paddingBottom: insets.bottom + 120 },
				]}
				showsVerticalScrollIndicator={false}
			>
				{/* STEP PROGRESS INDICATOR */}
				<View style={styles.stepperContainer}>
					<BookingProgressStepper currentStep={3} />
				</View>

				{/* 1. SECTION: ORDER SUMMARY BLOCK */}
				<View style={styles.sectionBlock}>
					<View style={styles.summaryHeaderRow}>
						<View style={styles.summaryTitleGroup}>
							<MaterialCommunityIcons name="receipt-text-outline" size={20} color="#2B6F71" />
							<View>
								<AppTypography variant="h3" style={styles.sectionHeading}>
									Order Summary
								</AppTypography>
								<AppTypography variant="caption" style={styles.summarySub}>
									{services.length} Procedure{services.length > 1 ? 's' : ''} • {charges.totalAmount}
								</AppTypography>
							</View>
						</View>
						<TouchableOpacity
							style={styles.expandBtn}
							onPress={() => setSummaryExpanded((prev) => !prev)}
							activeOpacity={0.7}
						>
							<AppTypography variant="caption" style={styles.expandText}>
								{summaryExpanded ? 'Hide' : 'Details'}
							</AppTypography>
							<Ionicons name={summaryExpanded ? 'chevron-up' : 'chevron-down'} size={14} color="#2B6F71" />
						</TouchableOpacity>
					</View>

					{/* Schedule Info Bar */}
					<View style={styles.scheduleBar}>
						<AppTypography variant="caption" style={styles.scheduleText}>
							{scheduleDisplayText}
						</AppTypography>
					</View>

					{/* Expandable Procedure Details */}
					{summaryExpanded && (
						<View style={styles.expandedDetailsWrap}>
							<View style={styles.dividerLine} />
							{services.map((item, idx) => (
								<View key={item.id || idx} style={styles.procedureItemRow}>
									<Image source={{ uri: item.image }} style={styles.procedureItemImg} resizeMode="cover" />
									<View style={styles.procedureItemTextCol}>
										<AppTypography variant="h4" style={styles.procedureItemTitle} numberOfLines={1}>
											{item.title}
										</AppTypography>
										<AppTypography variant="caption" style={styles.procedureItemMeta}>
											{item.duration || '30 - 45 mins'} • Home Visit
										</AppTypography>
									</View>
									<AppTypography variant="h4" style={styles.procedureItemPrice}>
										{item.price}
									</AppTypography>
								</View>
							))}

							<View style={styles.dividerLine} />
							<View style={styles.costBreakdownList}>
								<View style={styles.costRow}>
									<AppTypography variant="caption" style={styles.costLabel}>
										Base Procedure Charges
									</AppTypography>
									<AppTypography variant="caption" style={styles.costVal}>
										{charges.basePrice}
									</AppTypography>
								</View>
								<View style={styles.costRow}>
									<AppTypography variant="caption" style={styles.costLabel}>
										Specialist Doorstep Visit Fee
									</AppTypography>
									<AppTypography variant="caption" style={styles.costVal}>
										{charges.visitFee}
									</AppTypography>
								</View>
								<View style={styles.costRow}>
									<AppTypography variant="caption" style={styles.costLabel}>
										Taxes & GST (5%)
									</AppTypography>
									<AppTypography variant="caption" style={styles.costVal}>
										{charges.taxes}
									</AppTypography>
								</View>
							</View>
						</View>
					)}
				</View>

				{/* 8px GREY SECTION DIVIDER BAR */}
				<View style={styles.sectionDividerBar} />

				{/* 2. SECTION: PAYMENT METHOD SELECTOR */}
				<View style={styles.sectionBlock}>
					<View style={styles.sectionHeaderRow}>
						<View style={styles.summaryTitleGroup}>
							<MaterialCommunityIcons name="credit-card-settings-outline" size={20} color="#2B6F71" />
							<AppTypography variant="h3" style={styles.sectionHeading}>
								Select Payment Option
							</AppTypography>
						</View>
					</View>

					<View style={styles.paymentMethodsList}>
						{PAYMENT_METHODS.map((method) => {
							const isSelected = selectedMethodId === method.id
							return (
								<TouchableOpacity
									key={method.id}
									style={[styles.methodCard, isSelected && styles.methodCardSelected]}
									onPress={() => setSelectedMethodId(method.id)}
									activeOpacity={0.88}
								>
									<View style={styles.methodIconWrap}>
										<MaterialCommunityIcons
											name={method.iconName}
											size={22}
											color={isSelected ? '#2B6F71' : '#64748B'}
										/>
									</View>

									<View style={styles.methodTextCol}>
										<View style={styles.methodTitleRow}>
											<AppTypography variant="h4" style={styles.methodTitle}>
												{method.title}
											</AppTypography>
											{method.badge && (
												<View style={[styles.badgeChip, method.id === 'cash' ? styles.cashBadge : styles.recommendedBadge]}>
													<AppTypography
														variant="caption"
														style={method.id === 'cash' ? styles.cashBadgeText : styles.recommendedBadgeText}
													>
														{method.badge}
													</AppTypography>
												</View>
											)}
										</View>
										<AppTypography variant="caption" style={styles.methodSub}>
											{method.subtitle}
										</AppTypography>

										{method.brandIcons && (
											<View style={styles.brandRow}>
												{method.brandIcons.map((b) => (
													<View key={b} style={styles.brandChip}>
														<AppTypography variant="caption" style={styles.brandChipText}>
															{b}
														</AppTypography>
													</View>
												))}
											</View>
										)}
									</View>

									{/* Radio Selector Circle */}
									<View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
										{isSelected && <View style={styles.radioDot} />}
									</View>
								</TouchableOpacity>
							)
						})}
					</View>
				</View>

				{/* 8px GREY SECTION DIVIDER BAR */}
				<View style={styles.sectionDividerBar} />

				{/* 3. SECTION: SECURITY & DISPATCH NOTICE */}
				<View style={styles.sectionBlock}>
					<View style={styles.securityBox}>
						<MaterialCommunityIcons name="shield-lock-outline" size={20} color="#2B6F71" />
						<View style={styles.securityTextCol}>
							<AppTypography variant="h4" style={styles.securityTitle}>
								256-bit Encrypted Security & Guarantee
							</AppTypography>
							<AppTypography variant="caption" style={styles.securitySub}>
								Your appointment will be confirmed immediately. Practitioner info and OTP tracking details will be generated upon confirmation.
							</AppTypography>
						</View>
					</View>
				</View>
			</ScrollView>

			{/* FIXED STICKY FOOTER ACTION BAR */}
			<View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
				<View style={styles.bottomBarPriceCol}>
					<AppTypography variant="caption" style={styles.bottomBarTotalLabel}>
						Total Amount
					</AppTypography>
					<AppTypography variant="h3" style={styles.bottomBarTotalVal}>
						{charges.totalAmount}
					</AppTypography>
				</View>

				<AppButton
					variant="primary"
					disabled={submitting}
					onPress={handlePaySecurely}
					style={styles.payBtn}
				>
					{submitting ? 'Confirming...' : 'Confirm & Dispatch Nurse ➔'}
				</AppButton>
			</View>

			{/* ACTIVE TASK CONFLICT MODAL */}
			<StatusModal
				visible={activeTaskModalVisible}
				status="error"
				title="Active Request in Progress"
				description="You already have an active nursing request in progress. Please complete your current visit before booking another."
				submitText="Track Active Request"
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
		paddingHorizontal: 0,
		paddingTop: 12,
	},
	scrollContentTablet: {
		maxWidth: 640,
		alignSelf: 'center',
		width: '100%',
	},
	stepperContainer: {
		paddingHorizontal: 16,
		marginBottom: 4,
	},

	/* MOBILE SECTION BLOCKS */
	sectionBlock: {
		backgroundColor: '#FFFFFF',
		paddingHorizontal: 16,
		paddingVertical: 14,
		gap: 12,
	},
	sectionDividerBar: {
		height: 8,
		backgroundColor: '#F4F6F9',
		borderTopWidth: 1,
		borderBottomWidth: 1,
		borderColor: '#E0E7EF',
	},
	sectionHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	summaryHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	summaryTitleGroup: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	sectionHeading: {
		fontSize: 16,
		fontWeight: '700',
		color: '#181C1D',
	},
	summarySub: {
		fontSize: 12,
		color: '#546E7A',
		marginTop: 1,
	},
	expandBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 2,
	},
	expandText: {
		fontSize: 13,
		fontWeight: '600',
		color: '#2B6F71',
	},
	scheduleBar: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F7FAFA',
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 8,
		gap: 6,
	},
	scheduleText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#2B6F71',
	},

	/* EXPANDED ORDER DETAILS */
	expandedDetailsWrap: {
		gap: 10,
	},
	dividerLine: {
		height: 1,
		backgroundColor: '#E0E7EF',
	},
	procedureItemRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	procedureItemImg: {
		width: 44,
		height: 44,
		borderRadius: 8,
		backgroundColor: '#F1F4F4',
	},
	procedureItemTextCol: {
		flex: 1,
		gap: 2,
	},
	procedureItemTitle: {
		fontSize: 13.5,
		fontWeight: '700',
		color: '#181C1D',
	},
	procedureItemMeta: {
		fontSize: 11.5,
		color: '#546E7A',
	},
	procedureItemPrice: {
		fontSize: 14,
		fontWeight: '700',
		color: '#181C1D',
	},
	costBreakdownList: {
		gap: 6,
	},
	costRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	costLabel: {
		fontSize: 12.5,
		color: '#546E7A',
	},
	costVal: {
		fontSize: 12.5,
		fontWeight: '600',
		color: '#181C1D',
	},

	/* PAYMENT METHOD CARDS */
	paymentMethodsList: {
		gap: 10,
	},
	methodCard: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#FFFFFF',
		borderRadius: 12,
		padding: 12,
		borderWidth: 1,
		borderColor: '#E0E7EF',
		gap: 12,
	},
	methodCardSelected: {
		borderColor: '#2B6F71',
		backgroundColor: 'rgba(43, 111, 113, 0.06)',
	},
	methodIconWrap: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: '#F7FAFA',
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#E0E7EF',
	},
	methodTextCol: {
		flex: 1,
		gap: 2,
	},
	methodTitleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	methodTitle: {
		fontSize: 14,
		fontWeight: '700',
		color: '#181C1D',
	},
	methodSub: {
		fontSize: 11.5,
		color: '#546E7A',
	},
	badgeChip: {
		paddingHorizontal: 6,
		paddingVertical: 1,
		borderRadius: 6,
	},
	recommendedBadge: {
		backgroundColor: 'rgba(43, 111, 113, 0.12)',
	},
	recommendedBadgeText: {
		fontSize: 10,
		fontWeight: '700',
		color: '#2B6F71',
	},
	cashBadge: {
		backgroundColor: '#E0F2FE',
	},
	cashBadgeText: {
		fontSize: 10,
		fontWeight: '700',
		color: '#0369A1',
	},
	brandRow: {
		flexDirection: 'row',
		gap: 4,
		marginTop: 4,
	},
	brandChip: {
		backgroundColor: '#F1F4F4',
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 4,
	},
	brandChipText: {
		fontSize: 10,
		fontWeight: '600',
		color: '#475569',
	},

	/* RADIO BUTTON */
	radioCircle: {
		width: 20,
		height: 20,
		borderRadius: 10,
		borderWidth: 2,
		borderColor: '#CBD5E1',
		justifyContent: 'center',
		alignItems: 'center',
	},
	radioCircleSelected: {
		borderColor: '#2B6F71',
	},
	radioDot: {
		width: 10,
		height: 10,
		borderRadius: 5,
		backgroundColor: '#2B6F71',
	},

	/* SECURITY NOTICE */
	securityBox: {
		flexDirection: 'row',
		backgroundColor: 'rgba(43, 111, 113, 0.06)',
		borderRadius: 12,
		padding: 12,
		gap: 10,
		alignItems: 'center',
	},
	securityTextCol: {
		flex: 1,
		gap: 2,
	},
	securityTitle: {
		fontSize: 13,
		fontWeight: '700',
		color: '#2B6F71',
	},
	securitySub: {
		fontSize: 11.5,
		color: '#475569',
		lineHeight: 16,
	},

	/* STICKY BOTTOM ACTION FOOTER */
	bottomBar: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: '#FFFFFF',
		paddingHorizontal: 20,
		paddingTop: 12,
		borderTopWidth: 1,
		borderTopColor: '#E0E7EF',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: -3 },
		shadowOpacity: 0.06,
		shadowRadius: 6,
		elevation: 8,
	},
	bottomBarPriceCol: {
		justifyContent: 'center',
	},
	bottomBarTotalLabel: {
		fontSize: 11,
		color: '#64748B',
	},
	bottomBarTotalVal: {
		fontSize: 19,
		fontWeight: '800',
		color: '#181C1D',
	},
	payBtn: {
		minWidth: 200,
	},
})
