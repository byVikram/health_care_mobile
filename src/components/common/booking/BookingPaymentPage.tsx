import AsyncStorage from '@react-native-async-storage/async-storage'
import React, { useState } from 'react'
import {
	Image,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from 'react-native'
import { useRoute } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { AppButton } from '../buttons/AppButton'
import AppScreenHeader from '../layout/AppScreenHeader'
import { AppTypography } from '../display/AppTypography'
import { BookingProgressStepper, BookingStepperTheme } from './BookingProgressStepper'
import { ServiceProcedureItem } from './ServiceCatalogCard'
import StatusModal from '../feedback/StatusModal'
import { safeJsonParse } from '../../../utils/jsonUtils'

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

export interface BookingPaymentCharges {
	totalAmount: string
	basePrice: string
	visitFee: string
	taxes: string
}

export interface BookingPaymentVisit {
	date: string
	timeSlot: string
	address: string
	latitude?: number
	longitude?: number
}

export interface BookingPaymentSubmitContext {
	/** The raw `bookingPayload` this screen was opened with (`route.params.bookingPayload`). */
	bookingPayload: any
	services: ServiceProcedureItem[]
	charges: BookingPaymentCharges
	visit: BookingPaymentVisit
	selectedMethodId: string
	/** A client-generated reference, stable for this submit attempt — pass it
	 *  through as the request's idempotency/public id when your API wants one,
	 *  or return it verbatim as `bookingId` if there's no real backend call yet. */
	clientReference: string
	/** Patient identity already resolved (and validated as non-placeholder) by
	 *  this component — from `bookingPayload.patient`, with an `AsyncStorage`
	 *  fallback, exactly like every existing caller already relied on. */
	patient: { publicId: string; name: string }
}

export interface BookingPaymentSuccessContext {
	bookingId: string
	bookingPayload: any
	charges: BookingPaymentCharges
	selectedMethodId: string
}

/** Throw an error shaped like this from `onSubmit` to trigger the active-task
 *  conflict modal instead of the generic "Unable to Book" one. */
export interface BookingPaymentActiveTaskError {
	isActiveTaskConflict: true
	activeTaskId?: string
}

export function isActiveTaskConflictError(error: any): error is BookingPaymentActiveTaskError {
	return !!error && error.isActiveTaskConflict === true
}

export interface BookingPaymentStepperConfig {
	steps: { label: string }[]
	currentIndex: number
	theme?: BookingStepperTheme
	onStepPress?: (index: number) => void
	style?: any
	/** Wrap the stepper in this screen's own horizontally-padded container.
	 *  Defaults to `true`. Set `false` when the stepper should render with
	 *  zero extra wrapper (e.g. Laboratory, where the stepper's own default
	 *  padding already matches every other Laboratory screen exactly). */
	wrapInContainer?: boolean
}

export interface BookingPaymentPageConfig {
	/** `AppScreenHeader` title. Defaults to "Complete Payment". */
	screenTitle?: string
	/** Singular unit shown in the order-summary subtitle, e.g. "Procedure" / "Test". */
	orderSummaryUnitLabel: string
	/** Appended after each expanded item's duration, e.g. " • Home Visit" (or '' to show nothing extra). */
	itemMetaSuffix?: string
	/** Label for the visit/handling fee row in the expanded cost breakdown. */
	visitFeeLabel: string
	/** Copy shown in the "256-bit Encrypted Security & Guarantee" box. */
	securityNoticeText: string
	/** Sticky-footer CTA label (shown only while not submitting). */
	payButtonLabel: string
	stepper: BookingPaymentStepperConfig
	/** Optional extra info rendered inside the Order Summary block, right after
	 *  the schedule bar — e.g. Nursing's "Preferred Nurse" bar. Receives the raw
	 *  `bookingPayload` so the caller can decide whether/what to render. */
	renderExtraSummaryInfo?: (bookingPayload: any) => React.ReactNode
	activeTaskModal: { title: string; description: string; submitText: string }
	/** Performs the actual booking-creation call (or a local no-op) and
	 *  resolves with the booking id to carry forward. Throw a
	 *  `BookingPaymentActiveTaskError`-shaped error for the conflict modal, or
	 *  any other error for the generic "Unable to Book" modal (its message is
	 *  derived from `error.response` the same way every existing caller's
	 *  booking API already responds). */
	onSubmit: (ctx: BookingPaymentSubmitContext) => Promise<{ bookingId: string }>
	/** Called once `onSubmit` resolves — decide where to navigate next. */
	onSuccess: (ctx: BookingPaymentSuccessContext) => void
	/** Called when the active-task conflict modal's CTA is pressed. */
	onActiveTaskConflict: (activeTaskId: string) => void
}

const PLACEHOLDER_PATIENT_NAMES = ['Patient Account Holder', 'John Doe', 'Patient Recipient', 'Patient', 'Eleanor Vance']

/**
 * Shared, configurable payment screen for every booking flow (Nursing/
 * Ancillary, Laboratory, and any future service type). Owns the order
 * summary, payment method selection, security notice, sticky checkout bar,
 * and the generic patient/service/address/schedule validation guards +
 * error/active-task modals — everything that isn't specific to one service
 * type. What IS specific (copy, stepper config, the actual submit call, and
 * where to navigate on success) is supplied via `config` by a thin per-feature
 * wrapper screen (see `AncillaryPaymentPage.tsx`), so this component has no
 * dependency on any feature's API/service layer.
 */
export const BookingPaymentPage: React.FC<{ config: BookingPaymentPageConfig }> = ({ config }) => {
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
	const charges: BookingPaymentCharges =
		bookingPayload.charges || { totalAmount: '₹667', basePrice: '₹499', visitFee: '₹150', taxes: '₹18' }
	const isInstant = bookingPayload.bookingType === 'INSTANT' || (!bookingPayload.bookingType && !bookingPayload.visit?.date)

	const todayDynamic = `Today, ${new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}`
	const visit: BookingPaymentVisit = bookingPayload.visit || {
		date: todayDynamic,
		timeSlot: '09:00 AM - 10:00 AM',
		address: 'User Selected Location',
	}

	const scheduleDisplayText = isInstant
		? 'Instant Care: Dispatch within 15 - 30 minutes'
		: `${visit.date} • ${visit.timeSlot}`

	const [selectedMethodId, setSelectedMethodId] = useState('upi')
	const [submitting, setSubmitting] = useState(false)
	const [summaryExpanded, setSummaryExpanded] = useState(false)

	const [activeTaskModalVisible, setActiveTaskModalVisible] = useState(false)
	const [bookingErrorModalVisible, setBookingErrorModalVisible] = useState(false)
	const [bookingErrorTitle, setBookingErrorTitle] = useState('Unable to Book')
	const [bookingErrorMessage, setBookingErrorMessage] = useState(
		"We couldn't retrieve the patient details required to complete this booking. Please try again."
	)
	const [existingActiveBookingId, setExistingActiveBookingId] = useState('')

	const patientInfo = bookingPayload.patient || null

	const handlePaySecurely = async () => {
		if (submitting) return

		// 1. Strict Patient Validation Guard
		let targetPublicId = patientInfo?.publicId || patientInfo?.id || bookingPayload.patientPublicId
		let patientName = patientInfo?.name

		if ((!targetPublicId || !patientName || patientName.trim() === '') && typeof AsyncStorage !== 'undefined') {
			try {
				const userRaw = await AsyncStorage.getItem('user')
				const userData = safeJsonParse<any>(userRaw, null)
				if (userData) {
					if (!targetPublicId) {
						targetPublicId = userData.publicId || userData.public_id || userData.id
					}
					if (!patientName || patientName.trim() === '') {
						patientName = userData.name || userData.full_name
					}
				}
			} catch (e) {
				console.log('[BookingPaymentPage] User storage fallback notice:', e)
			}
		}

		if (
			!patientName ||
			typeof patientName !== 'string' ||
			patientName.trim() === '' ||
			!targetPublicId ||
			PLACEHOLDER_PATIENT_NAMES.includes(patientName.trim())
		) {
			setBookingErrorTitle('Unable to Book')
			setBookingErrorMessage("We couldn't retrieve the patient details required to complete this booking. Please try again.")
			setBookingErrorModalVisible(true)
			return
		}

		// 2. Strict Service / Procedure Guard
		if (!services || services.length === 0) {
			setBookingErrorTitle('Unable to Book')
			setBookingErrorMessage('Please select at least one healthcare service or procedure to continue.')
			setBookingErrorModalVisible(true)
			return
		}

		// 3. Strict Address Guard
		if (!visit || !visit.address || typeof visit.address !== 'string' || visit.address.trim() === '' || visit.address.includes('Detecting')) {
			setBookingErrorTitle('Unable to Book')
			setBookingErrorMessage('A valid delivery address is required for doorstep care. Please select your address.')
			setBookingErrorModalVisible(true)
			return
		}

		// 4. Strict Schedule Guard (if Scheduled)
		if (bookingPayload.bookingType === 'SCHEDULED' && (!visit.date || !visit.timeSlot || visit.date.trim() === '')) {
			setBookingErrorTitle('Unable to Book')
			setBookingErrorMessage('Please select an appointment date and time slot for your scheduled visit.')
			setBookingErrorModalVisible(true)
			return
		}

		setSubmitting(true)
		const clientReference = `BK-${Math.floor(100000 + Math.random() * 900000)}`

		try {
			const { bookingId } = await config.onSubmit({
				bookingPayload,
				services,
				charges,
				visit,
				selectedMethodId,
				clientReference,
				patient: { publicId: targetPublicId, name: patientName },
			})

			setSubmitting(false)
			config.onSuccess({ bookingId, bookingPayload, charges, selectedMethodId })
		} catch (error: any) {
			setSubmitting(false)

			if (isActiveTaskConflictError(error)) {
				setExistingActiveBookingId(error.activeTaskId || '')
				setActiveTaskModalVisible(true)
				return
			}

			const errDetail = error?.response?.data?.detail || error?.response?.data

			// Conflict / Active Task Case surfaced directly via an axios-style error
			if (error?.response?.status === 409 || errDetail?.code === 'ACTIVE_TASK_EXISTS') {
				const activeId = errDetail?.activeTask?.requestId || errDetail?.activeTask?.publicBookingId || ''
				setExistingActiveBookingId(activeId)
				setActiveTaskModalVisible(true)
				return
			}

			// Format Meaningful User-Friendly Message
			let userMessage = "We're unable to complete your booking right now. Please try again."
			if (errDetail?.code === 'PATIENT_NOT_FOUND') {
				userMessage = "We couldn't retrieve the patient details required to complete this booking. Please try again."
			} else if (errDetail?.code === 'PATIENT_NAME_REQUIRED') {
				userMessage = 'Patient name is required to complete this booking. Please update your patient profile and try again.'
			} else if (errDetail?.code === 'ADDRESS_REQUIRED') {
				userMessage = 'A valid delivery address is required for doorstep care. Please provide your address.'
			} else if (errDetail?.code === 'SCHEDULE_DATE_REQUIRED') {
				userMessage = 'Scheduled care bookings require a valid appointment date and time slot.'
			} else if (errDetail?.message && typeof errDetail.message === 'string') {
				userMessage = errDetail.message
			} else if (error?.response?.status === 401) {
				userMessage = 'Your session has expired. Please log in again to complete your booking.'
			} else if (error?.response?.status === 500) {
				userMessage = 'Our booking service is temporarily unavailable. Please try again in a few moments.'
			} else if (!error?.response) {
				userMessage = 'Unable to connect to the server. Please check your internet connection and try again.'
			}

			setBookingErrorTitle('Unable to Book')
			setBookingErrorMessage(userMessage)
			setBookingErrorModalVisible(true)
		}
	}

	return (
		<View style={styles.container}>
			<AppScreenHeader title={config.screenTitle || 'Complete Payment'} />

			<ScrollView
				contentContainerStyle={[
					styles.scrollContent,
					isTablet && styles.scrollContentTablet,
					{ paddingBottom: insets.bottom + 120 },
				]}
				showsVerticalScrollIndicator={false}
			>
				{/* STEP PROGRESS INDICATOR */}
				{config.stepper.wrapInContainer === false ? (
					<BookingProgressStepper
						steps={config.stepper.steps}
						currentIndex={config.stepper.currentIndex}
						theme={config.stepper.theme}
						onStepPress={config.stepper.onStepPress}
						style={config.stepper.style}
					/>
				) : (
					<View style={styles.stepperContainer}>
						<BookingProgressStepper
							steps={config.stepper.steps}
							currentIndex={config.stepper.currentIndex}
							theme={config.stepper.theme}
							onStepPress={config.stepper.onStepPress}
							style={config.stepper.style}
						/>
					</View>
				)}

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
									{services.length} {config.orderSummaryUnitLabel}{services.length > 1 ? 's' : ''} • {charges.totalAmount}
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

					{/* Optional extra summary info (e.g. Nursing's "Preferred Nurse" bar) */}
					{config.renderExtraSummaryInfo?.(bookingPayload)}

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
											{item.duration || '30 - 45 mins'}{config.itemMetaSuffix || ''}
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
										{config.visitFeeLabel}
									</AppTypography>
									<AppTypography variant="caption" style={styles.costVal}>
										{charges.visitFee}
									</AppTypography>
								</View>
								<View style={styles.costRow}>
									<AppTypography variant="caption" style={styles.costLabel}>
										Taxes & GST (3%)
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
								{config.securityNoticeText}
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
					{submitting ? 'Confirming...' : config.payButtonLabel}
				</AppButton>
			</View>

			{/* ACTIVE TASK CONFLICT MODAL */}
			<StatusModal
				visible={activeTaskModalVisible}
				status="error"
				title={config.activeTaskModal.title}
				description={config.activeTaskModal.description}
				submitText={config.activeTaskModal.submitText}
				onSubmit={() => {
					setActiveTaskModalVisible(false)
					config.onActiveTaskConflict(existingActiveBookingId)
				}}
			/>
			{/* BOOKING ERROR MODAL */}
			<StatusModal
				visible={bookingErrorModalVisible}
				status="error"
				title={bookingErrorTitle}
				description={bookingErrorMessage}
				submitText="Try Again"
				onSubmit={() => {
					setBookingErrorModalVisible(false)
					handlePaySecurely()
				}}
				cancelText="Close"
				onCancel={() => setBookingErrorModalVisible(false)}
			/>
		</View>
	)
}

export default BookingPaymentPage

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
		backgroundColor: '#F1F5F9',
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 8,
		marginTop: 10,
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
