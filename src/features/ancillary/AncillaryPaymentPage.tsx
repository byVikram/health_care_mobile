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
import { ROUTES } from '../../navigation/routes'
import AppScreenHeader from '../../components/common/AppScreenHeader'
import { AppTypography } from '../../components/common/AppTypography'
import { AppButton } from '../../components/common/AppButton'

interface PaymentMethodItem {
	id: string
	title: string
	subtitle: string
	iconName: string
	badge?: string
	brandIcons?: string[]
}

const PAYMENT_METHODS: PaymentMethodItem[] = [
	{
		id: 'upi',
		title: 'UPI',
		subtitle: 'Pay using any UPI app',
		iconName: 'qrcode-scan',
		brandIcons: ['GPay', 'PhonePe', 'Paytm'],
	},
	{
		id: 'card',
		title: 'Credit / Debit Card',
		subtitle: 'Visa, Mastercard, RuPay & more',
		iconName: 'credit-card-outline',
		brandIcons: ['VISA', 'MC', 'RuPay'],
	},
	{
		id: 'netbanking',
		title: 'Net Banking',
		subtitle: 'All major banks supported',
		iconName: 'bank-outline',
	},
	{
		id: 'wallet',
		title: 'Wallets',
		subtitle: 'Mobikwik, Freecharge, Amazon Pay & more',
		iconName: 'wallet-outline',
	},
	{
		id: 'cash',
		title: 'Cash After Service',
		subtitle: 'Pay in cash to the nurse',
		iconName: 'cash-multiple',
		badge: 'Available',
	},
]

export default function AncillaryPaymentPage() {
	const navigation = useNavigation<any>()
	const route = useRoute<any>()
	const insets = useSafeAreaInsets()
	const { width } = useWindowDimensions()
	const isTablet = width >= 768

	const bookingPayload = route.params?.bookingPayload || {}
	const services = bookingPayload.services || [
		{
			id: 'gen1',
			title: 'Wound Dressing & Care',
			description: 'Sterile dressing for surgical, burn or chronic diabetic wounds',
			price: '₹499',
			image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=500&q=80',
		},
	]
	const charges = bookingPayload.charges || { totalAmount: '₹667' }
	const visit = bookingPayload.visit || { date: 'Today, Aug 10, 2025', timeSlot: '09:00 AM - 10:00 AM' }

	const [selectedMethodId, setSelectedMethodId] = useState('upi')
	const [submitting, setSubmitting] = useState(false)

	const handlePaySecurely = () => {
		setSubmitting(true)
		setTimeout(() => {
			setSubmitting(false)
			navigation.navigate(ROUTES.STACK.ANCILLARY_CONFIRMATION, {
				bookingId: `BK-${Math.floor(100000 + Math.random() * 900000)}`,
				bookingPayload: {
					...bookingPayload,
					paymentMethod: selectedMethodId,
				},
			})
		}, 800)
	}

	return (
		<View style={styles.container}>
			<AppScreenHeader title="Payment" />

			<ScrollView
				contentContainerStyle={[
					styles.scrollContent,
					isTablet && styles.scrollContentTablet,
					{ paddingBottom: insets.bottom + 110 },
				]}
				showsVerticalScrollIndicator={false}
			>
				{/* 1. Header Progress Stepper */}
				<View style={styles.stepperContainer}>
					<View style={styles.stepperRow}>
						<View style={styles.stepItemCompleted}>
							<View style={styles.stepCircleCompleted}>
								<Ionicons name="checkmark" size={14} color="#FFFFFF" />
							</View>
							<AppTypography variant="caption" style={styles.stepLabelCompleted}>
								Appointment Details
							</AppTypography>
						</View>

						<View style={styles.stepLineActive} />

						<View style={styles.stepItemActive}>
							<View style={styles.stepCircleActive}>
								<AppTypography variant="caption" style={styles.stepNumActive}>
									2
								</AppTypography>
							</View>
							<AppTypography variant="caption" style={styles.stepLabelActive}>
								Payment
							</AppTypography>
						</View>
					</View>
				</View>

				{/* 2. Security Banner */}
				<View style={styles.securityBanner}>
					<MaterialCommunityIcons name="lock-outline" size={18} color="#0D9488" />
					<AppTypography variant="caption" style={styles.securityBannerText}>
						All transactions are 100% secure and encrypted
					</AppTypography>
				</View>

				{/* 3. Choose a Payment Method */}
				<View style={styles.sectionHeaderRow}>
					<AppTypography variant="h3" style={styles.sectionTitle}>
						Choose a Payment Method
					</AppTypography>
				</View>

				<View style={styles.methodsList}>
					{PAYMENT_METHODS.map((method) => {
						const isSelected = selectedMethodId === method.id
						return (
							<TouchableOpacity
								key={method.id}
								style={[styles.methodCard, isSelected && styles.methodCardSelected]}
								onPress={() => setSelectedMethodId(method.id)}
								activeOpacity={0.8}
							>
								<View style={styles.methodIconBox}>
									<MaterialCommunityIcons
										name={method.iconName as any}
										size={22}
										color={isSelected ? '#1F5F68' : '#526062'}
									/>
								</View>

								<View style={styles.methodTextCol}>
									<View style={styles.methodTitleRow}>
										<AppTypography variant="h4" style={styles.methodTitle}>
											{method.title}
										</AppTypography>

										{/* Brand Icons or Badges */}
										{method.brandIcons && (
											<View style={styles.brandRow}>
												{method.brandIcons.map((b) => (
													<View key={b} style={styles.brandBadge}>
														<AppTypography variant="caption" style={styles.brandBadgeText}>
															{b}
														</AppTypography>
													</View>
												))}
											</View>
										)}

										{method.badge && (
											<View style={styles.availBadge}>
												<AppTypography variant="caption" style={styles.availBadgeText}>
													{method.badge}
												</AppTypography>
											</View>
										)}
									</View>

									<AppTypography variant="caption" style={styles.methodSubtitle}>
										{method.subtitle}
									</AppTypography>
								</View>

								<View
									style={[
										styles.radioOuter,
										isSelected && styles.radioOuterSelected,
									]}
								>
									{isSelected && <View style={styles.radioInnerDot} />}
								</View>
							</TouchableOpacity>
						)
					})}
				</View>

				{/* 4. Booking Summary Card (Renders ALL Selected Services) */}
				<View style={styles.card}>
					<View style={styles.cardHeaderRow}>
						<AppTypography variant="h3" style={styles.cardTitle}>
							Booking Summary ({services.length})
						</AppTypography>
						<TouchableOpacity
							onPress={() => navigation.goBack()}
							activeOpacity={0.7}
						>
							<AppTypography variant="caption" style={styles.editLink}>
								Edit
							</AppTypography>
						</TouchableOpacity>
					</View>

					<View style={styles.summaryListContainer}>
						{services.map((item: any, idx: number) => (
							<View key={item.id || idx} style={styles.summaryItemRow}>
								<Image
									source={{ uri: item.image }}
									style={styles.summaryImage}
									resizeMode="cover"
								/>

								<View style={styles.summaryTextCol}>
									<AppTypography variant="h4" style={styles.summaryTitle}>
										{item.title}
									</AppTypography>

									<View style={styles.summaryMetaRow}>
										<Ionicons name="calendar-outline" size={13} color="#64748B" />
										<AppTypography variant="caption" style={styles.summaryMetaText}>
											{visit.date} • {visit.timeSlot}
										</AppTypography>
									</View>

									<View style={styles.summaryMetaRow}>
										<Ionicons name="home-outline" size={13} color="#64748B" />
										<AppTypography variant="caption" style={styles.summaryMetaText}>
											At Home Service ({item.duration || '30-45 mins'})
										</AppTypography>
									</View>
								</View>

								<AppTypography variant="h4" style={styles.summaryPrice}>
									{item.price}
								</AppTypography>
							</View>
						))}
					</View>
				</View>

				{/* 5. Notice Banner Card */}
				<View style={styles.noticeCard}>
					<Ionicons name="shield-checkmark-outline" size={22} color="#1F5F68" />
					<View style={styles.noticeTextCol}>
						<AppTypography variant="h4" style={styles.noticeHeading}>
							You won't be charged now
						</AppTypography>
						<AppTypography variant="caption" style={styles.noticeSubtext}>
							Payment will be processed after service confirmation
						</AppTypography>
					</View>
				</View>
			</ScrollView>

			{/* 6. Sticky Bottom Action Footer */}
			<View style={[styles.stickyFooter, { paddingBottom: Math.max(insets.bottom, 12) }]}>
				<View style={styles.stickyLeftCol}>
					<AppTypography variant="caption" style={styles.stickyLabel}>
						Total Amount
					</AppTypography>
					<AppTypography variant="h2" style={styles.stickyPrice}>
						{charges.totalAmount}
					</AppTypography>
					<TouchableOpacity style={styles.priceDetailsLinkRow} activeOpacity={0.7}>
						<AppTypography variant="caption" style={styles.priceDetailsText}>
							View price details
						</AppTypography>
						<Ionicons name="chevron-down" size={12} color="#1F5F68" />
					</TouchableOpacity>
					<View style={styles.termsRow}>
						<MaterialCommunityIcons name="lock-outline" size={11} color="#94A3B8" />
						<AppTypography variant="caption" style={styles.termsText}>
							By proceeding, you agree to our Terms & Conditions
						</AppTypography>
					</View>
				</View>

				<AppButton
					variant="primary"
					style={styles.payBtn}
					labelStyle={styles.payBtnLabel}
					contentStyle={styles.payBtnContent}
					disabled={submitting}
					onPress={handlePaySecurely}
				>
					{submitting ? 'Processing...' : '🔒 Pay Securely →'}
				</AppButton>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F4F7F8',
	},
	scrollContent: {
		paddingHorizontal: 16,
		paddingTop: 12,
	},
	scrollContentTablet: {
		maxWidth: 720,
		width: '100%',
		alignSelf: 'center',
		paddingHorizontal: 24,
		paddingTop: 20,
	},
	stepperContainer: {
		marginBottom: 14,
	},
	stepperRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 20,
	},
	stepItemCompleted: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	stepCircleCompleted: {
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: '#1F5F68',
		alignItems: 'center',
		justifyContent: 'center',
	},
	stepLabelCompleted: {
		fontSize: 13,
		fontWeight: '600',
		color: '#1F5F68',
	},
	stepLineActive: {
		flex: 1,
		height: 2,
		backgroundColor: '#1F5F68',
		marginHorizontal: 12,
	},
	stepItemActive: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	stepCircleActive: {
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: '#1F5F68',
		alignItems: 'center',
		justifyContent: 'center',
	},
	stepNumActive: {
		color: '#FFFFFF',
		fontSize: 12,
		fontWeight: '700',
	},
	stepLabelActive: {
		fontSize: 13,
		fontWeight: '700',
		color: '#1F5F68',
	},
	securityBanner: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#E6F7F0',
		borderRadius: 12,
		paddingHorizontal: 14,
		paddingVertical: 10,
		marginBottom: 18,
		gap: 8,
	},
	securityBannerText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#0F766E',
	},
	sectionHeaderRow: {
		marginBottom: 12,
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#191C1D',
	},
	methodsList: {
		gap: 12,
		marginBottom: 18,
	},
	methodCard: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#FFFFFF',
		borderRadius: 14,
		padding: 14,
		borderWidth: 1,
		borderColor: '#E8ECEC',
		elevation: 1,
		shadowColor: '#000000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.04,
		shadowRadius: 3,
	},
	methodCardSelected: {
		borderColor: '#1F5F68',
		backgroundColor: '#F0F9F9',
		borderWidth: 1.5,
	},
	methodIconBox: {
		width: 38,
		height: 38,
		borderRadius: 10,
		backgroundColor: '#F1F5F9',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 12,
	},
	methodTextCol: {
		flex: 1,
	},
	methodTitleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginRight: 10,
	},
	methodTitle: {
		fontSize: 14,
		fontWeight: '700',
		color: '#191C1D',
	},
	methodSubtitle: {
		fontSize: 11,
		color: '#526062',
		marginTop: 2,
	},
	brandRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	brandBadge: {
		backgroundColor: '#F1F5F9',
		paddingHorizontal: 5,
		paddingVertical: 2,
		borderRadius: 4,
	},
	brandBadgeText: {
		fontSize: 9,
		fontWeight: '700',
		color: '#475569',
	},
	availBadge: {
		backgroundColor: '#E6F3F4',
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 6,
	},
	availBadgeText: {
		fontSize: 10,
		fontWeight: '700',
		color: '#1F5F68',
	},
	radioOuter: {
		width: 20,
		height: 20,
		borderRadius: 10,
		borderWidth: 1.5,
		borderColor: '#CBD5E1',
		alignItems: 'center',
		justifyContent: 'center',
	},
	radioOuterSelected: {
		borderColor: '#1F5F68',
	},
	radioInnerDot: {
		width: 11,
		height: 11,
		borderRadius: 5.5,
		backgroundColor: '#1F5F68',
	},
	card: {
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		padding: 16,
		marginBottom: 14,
		borderWidth: 1,
		borderColor: '#E8ECEC',
		elevation: 1,
		shadowColor: '#000000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.04,
		shadowRadius: 3,
	},
	cardHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 12,
	},
	cardTitle: {
		fontSize: 15,
		fontWeight: '700',
		color: '#191C1D',
	},
	editLink: {
		fontSize: 13,
		fontWeight: '600',
		color: '#1F5F68',
	},
	summaryListContainer: {
		gap: 12,
	},
	summaryItemRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 4,
	},
	summaryImage: {
		width: 60,
		height: 60,
		borderRadius: 10,
		backgroundColor: '#F1F5F9',
	},
	summaryTextCol: {
		flex: 1,
		marginLeft: 12,
	},
	summaryTitle: {
		fontSize: 14,
		fontWeight: '700',
		color: '#191C1D',
	},
	summaryMetaRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		marginTop: 3,
	},
	summaryMetaText: {
		fontSize: 11,
		color: '#526062',
	},
	summaryPrice: {
		fontSize: 17,
		fontWeight: '700',
		color: '#1F5F68',
		marginLeft: 10,
	},
	noticeCard: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#FFFBEB',
		borderRadius: 14,
		padding: 14,
		borderWidth: 1,
		borderColor: '#FDE68A',
		marginBottom: 16,
		gap: 12,
	},
	noticeTextCol: {
		flex: 1,
	},
	noticeHeading: {
		fontSize: 13,
		fontWeight: '700',
		color: '#92400E',
	},
	noticeSubtext: {
		fontSize: 11,
		color: '#B45309',
		marginTop: 2,
	},
	stickyFooter: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		backgroundColor: '#FFFFFF',
		borderTopWidth: 1,
		borderTopColor: '#E2E8F0',
		paddingHorizontal: 16,
		paddingTop: 12,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		elevation: 8,
		shadowColor: '#000000',
		shadowOffset: { width: 0, height: -2 },
		shadowOpacity: 0.1,
		shadowRadius: 6,
	},
	stickyLeftCol: {
		flex: 1,
		marginRight: 12,
	},
	stickyLabel: {
		fontSize: 10,
		color: '#64748B',
		fontWeight: '600',
	},
	stickyPrice: {
		fontSize: 18,
		fontWeight: '700',
		color: '#1F5F68',
		lineHeight: 22,
	},
	priceDetailsLinkRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 2,
		marginTop: 1,
	},
	priceDetailsText: {
		fontSize: 10,
		fontWeight: '600',
		color: '#1F5F68',
	},
	termsRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 3,
		marginTop: 2,
	},
	termsText: {
		fontSize: 9,
		color: '#94A3B8',
	},
	payBtn: {
		backgroundColor: '#1F5F68',
		borderRadius: 12,
		minWidth: 150,
	},
	payBtnLabel: {
		color: '#FFFFFF',
		fontSize: 13,
		fontWeight: '700',
	},
	payBtnContent: {
		height: 44,
		paddingHorizontal: 16,
	},
})
