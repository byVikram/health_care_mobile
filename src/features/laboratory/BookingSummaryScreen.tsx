import React, { useMemo, useState } from 'react'
import {
	Image,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation, useRoute } from '@react-navigation/native'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import Toast from 'react-native-toast-message'
import { AppTypography } from '../../components/common/AppTypography'
import { AppButton } from '../../components/common/AppButton'
import { ROUTES } from '../../navigation/routes'
import { HEALTH_CHECKUP_PACKAGES, POPULAR_DIAGNOSTIC_TESTS } from './data/laboratoryMockData'
import { LabBookingProgressHeader } from './components/LabBookingProgressHeader'
import type { LabBookingDraft } from './types'

interface RouteParams {
	draft: LabBookingDraft
	labId?: string
	labName?: string
	labAddress?: string
	labCity?: string
	labAvatarKey?: string | null
	labOperatingHours?: { open: string; close: string }
	labIs24x7?: boolean
	date?: string
	timeSlot?: string
}

const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN')}`

/**
 * Booking Summary — replicated directly from Nursing Care Booking Details
 * and Booking Summary UI/UX:
 * - Section organization & visual hierarchy
 * - Nursing Care typography, card styling, badges, spacing, and dividers
 * - Soft-tinted recipient and location boxes
 * - Itemized billing breakdown and guarantee box
 * - Fixed bottom checkout bar
 * - Seamless navigation to ROUTES.STACK.ANCILLARY_PAYMENT with standardized bookingPayload
 */
export const BookingSummaryScreen: React.FC = () => {
	const insets = useSafeAreaInsets()
	const navigation = useNavigation<any>()
	const route = useRoute<any>()
	const params = (route.params || {}) as Partial<RouteParams>
	const { draft, labId, labName, labAddress, labCity, date, timeSlot } = params

	const isHomeCollection = draft?.collectionType === 'home_collection'
	const requiresLabAppointment = draft?.requiresLabSelection ?? false

	const progressSteps = requiresLabAppointment ? ['Details', 'Lab & Slot', 'Summary'] : ['Details', 'Summary']
	const progressCurrentIndex = progressSteps.length - 1

	// Internal state for selected test/package IDs so items can be removed dynamically
	const [activeTestIds, setActiveTestIds] = useState<string[]>(draft?.testIds || [])
	const [activePackageIds, setActivePackageIds] = useState<string[]>(draft?.packageIds || [])
	const [expandedItemIds, setExpandedItemIds] = useState<Record<string, boolean>>({})

	const selectedItems = useMemo(() => {
		const tests = POPULAR_DIAGNOSTIC_TESTS.filter((t) => activeTestIds.includes(t.id)).map((t) => ({
			id: t.id,
			name: t.name,
			price: t.price,
			originalPrice: t.originalPrice,
			description: t.description,
			turnaroundTime: t.reportTime ? `Report in ${t.reportTime}` : 'Reports in 24 hrs',
			testCount: undefined as number | undefined,
			includesSummary: undefined as string | undefined,
			image: undefined as string | undefined,
		}))

		const pkgs = HEALTH_CHECKUP_PACKAGES.filter((p) => activePackageIds.includes(p.id)).map((p) => ({
			id: p.id,
			name: p.name,
			price: p.price,
			originalPrice: p.originalPrice,
			description: p.includesSummary || `${p.testCount} Tests Included`,
			turnaroundTime: p.reportTime ? `Report in ${p.reportTime}` : 'Reports in 24 hrs',
			testCount: p.testCount,
			includesSummary: p.includesSummary,
			image: p.image,
		}))

		return [...tests, ...pkgs]
	}, [activeTestIds, activePackageIds])

	const handleRemoveItem = (id: string) => {
		setActiveTestIds((prev) => prev.filter((tId) => tId !== id))
		setActivePackageIds((prev) => prev.filter((pId) => pId !== id))
	}

	const toggleIncludedTests = (id: string) => {
		setExpandedItemIds((prev) => ({ ...prev, [id]: !prev[id] }))
	}

	const subtotal = useMemo(() => selectedItems.reduce((sum, item) => sum + item.price, 0), [selectedItems])
	const totalMrp = useMemo(
		() => selectedItems.reduce((sum, item) => sum + (item.originalPrice ?? item.price), 0),
		[selectedItems]
	)
	const discount = Math.max(0, totalMrp - subtotal)
	const collectionFee = isHomeCollection ? 150 : 0
	const finalPayable = subtotal + collectionFee

	// Scheduled date & slot values
	const appointmentDate = isHomeCollection
		? (draft?.preferredDate || 'Tomorrow')
		: (date || 'Scheduled Date')
	const appointmentTimeSlot = isHomeCollection
		? (draft?.preferredTimeSlot || 'Morning (07:00 AM - 11:00 AM)')
		: (timeSlot || 'Morning')

	const handleProceedToPayment = () => {
		if (!draft || selectedItems.length === 0) {
			Toast.show({ type: 'error', text1: 'Missing details', text2: 'Please select items to proceed.' })
			return
		}

		if (requiresLabAppointment && (!labId || !date || !timeSlot)) {
			Toast.show({ type: 'error', text1: 'Missing appointment details', text2: 'Please complete laboratory and slot selection.' })
			return
		}

		// Standardized bookingPayload structure accepted by AncillaryPaymentPage.tsx
		const bookingPayload = {
			serviceType: 'LABORATORY',
			bookingType: 'SCHEDULED',
			services: selectedItems.map((item) => ({
				id: item.id,
				title: item.name,
				description: item.includesSummary || item.description || 'Diagnostic Test',
				price: formatCurrency(item.price),
				image: item.image || 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=500&q=80',
				duration: item.turnaroundTime || 'Reports in 24 hrs',
			})),
			patient: {
				id: draft.patient.id || draft.patient.publicId || 'pt_primary',
				publicId: draft.patient.publicId || draft.patient.id || 'pt_primary',
				name: draft.patient.name,
				age: draft.patient.age,
				gender: draft.patient.gender,
				relationship: draft.patient.relationship,
				avatar: draft.patient.avatar,
			},
			visit: {
				date: appointmentDate,
				timeSlot: appointmentTimeSlot,
				address: isHomeCollection
					? (draft.collectionAddress ? `${draft.collectionAddress.address_line}, ${draft.collectionAddress.city}` : 'User Selected Address')
					: `${labName || 'Diagnostic Center'}${labAddress ? `, ${labAddress}` : ''}`,
				addressLabel: isHomeCollection ? 'Home Collection' : (labName || 'Diagnostic Center'),
			},
			charges: {
				basePrice: formatCurrency(totalMrp),
				visitFee: isHomeCollection ? '₹150' : '₹0',
				taxes: '₹0',
				discount: discount > 0 ? formatCurrency(discount) : undefined,
				totalAmount: formatCurrency(finalPayable),
			},
		}

		navigation.navigate(ROUTES.STACK.ANCILLARY_PAYMENT, { bookingPayload })
	}

	if (!draft) {
		return (
			<View style={styles.container}>
				<View style={styles.emptyState}>
					<MaterialCommunityIcons name="alert-circle-outline" size={40} color="#EF4444" />
					<AppTypography variant="subtitle" style={styles.emptyTitle} align="center">
						Missing booking details
					</AppTypography>
					<AppTypography variant="caption" style={styles.emptySubtitle} align="center">
						Please start again from your test or package selection.
					</AppTypography>
					<AppButton variant="primary" onPress={() => navigation.navigate(ROUTES.STACK.LABORATORY_LIST)}>
						Browse Tests & Packages
					</AppButton>
				</View>
			</View>
		)
	}

	return (
		<View style={styles.container}>
			<LabBookingProgressHeader steps={progressSteps} currentIndex={progressCurrentIndex} />

			<ScrollView
				contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + 110 }]}
				showsVerticalScrollIndicator={false}
			>
				{selectedItems.length > 0 ? (
					<>
						{/* 1. SECTION: SELECTED SERVICES (Nursing Care BookingSummaryPage style) */}
						<View style={styles.sectionBlock}>
							<View style={styles.sectionHeaderRow}>
								<AppTypography variant="h2" style={styles.mainTitle}>
									Selected Services ({selectedItems.length})
								</AppTypography>
							</View>
							<AppTypography variant="caption" style={styles.subTitle}>
								Review selected diagnostic tests and health packages
							</AppTypography>

							<View style={styles.servicesList}>
								{selectedItems.map((item) => {
									const includedTests = item.includesSummary
										? item.includesSummary
												.split(',')
												.map((s) => s.trim())
												.filter(Boolean)
										: []
									const expanded = expandedItemIds[item.id] ?? false

									return (
										<View key={item.id} style={styles.serviceCard}>
											{item.image ? (
												<Image source={{ uri: item.image }} style={styles.serviceImage} resizeMode="cover" />
											) : (
												<View style={styles.serviceIconPlaceholder}>
													<MaterialCommunityIcons
														name={item.testCount ? 'shield-check-outline' : 'flask-outline'}
														size={26}
														color="#0C7C7C"
													/>
												</View>
											)}

											<View style={styles.serviceContent}>
												<View style={styles.cardHeaderRow}>
													<AppTypography variant="h4" style={styles.serviceName} numberOfLines={1}>
														{item.name}
													</AppTypography>
													{selectedItems.length > 1 && (
														<TouchableOpacity
															style={styles.removeBtn}
															onPress={() => handleRemoveItem(item.id)}
															activeOpacity={0.7}
														>
															<Ionicons name="trash-outline" size={18} color="#D32F2F" />
														</TouchableOpacity>
													)}
												</View>

												{/* Badges Row */}
												<View style={styles.badgeRow}>
													<View style={styles.verifiedBadge}>
														<Ionicons name="checkmark-circle" size={11} color="#0C7C7C" />
														<AppTypography variant="caption" style={styles.verifiedText}>
															NABL Accredited
														</AppTypography>
													</View>
													{item.testCount ? (
														<View style={styles.countBadge}>
															<AppTypography variant="caption" style={styles.countBadgeText}>
																{item.testCount} Tests Included
															</AppTypography>
														</View>
													) : null}
												</View>

												{item.description ? (
													<AppTypography variant="caption" style={styles.serviceDesc} numberOfLines={2}>
														{item.description}
													</AppTypography>
												) : null}

												{/* Included Tests Expandable Link */}
												{includedTests.length > 0 && (
													<TouchableOpacity
														onPress={() => toggleIncludedTests(item.id)}
														style={styles.viewIncludedLink}
														hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
													>
														<Text style={styles.viewIncludedLinkText}>
															{expanded ? 'Hide Included Tests' : 'View Included Tests'}
														</Text>
														<MaterialCommunityIcons
															name={expanded ? 'chevron-up' : 'chevron-down'}
															size={14}
															color="#0C7C7C"
														/>
													</TouchableOpacity>
												)}

												{expanded && includedTests.length > 0 && (
													<View style={styles.includedList}>
														{includedTests.map((testName, idx) => (
															<View key={`${testName}-${idx}`} style={styles.includedRow}>
																<MaterialCommunityIcons name="check-circle" size={13} color="#059669" />
																<Text style={styles.includedText}>{testName}</Text>
															</View>
														))}
													</View>
												)}

												{/* Footer with Turnaround and Price */}
												<View style={styles.cardFooterRow}>
													<View style={styles.durationRow}>
														<Ionicons name="time-outline" size={13} color="#64748B" />
														<AppTypography variant="caption" style={styles.durationText}>
															{item.turnaroundTime}
														</AppTypography>
													</View>
													<AppTypography variant="body" style={styles.priceText}>
														{formatCurrency(item.price)}
													</AppTypography>
												</View>
											</View>
										</View>
									)
								})}
							</View>
						</View>

						<View style={styles.sectionDividerBar} />

						{/* 2. SECTION: PATIENT RECIPIENT PROFILE */}
						<View style={styles.sectionBlock}>
							<View style={styles.sectionHeaderRow}>
								<AppTypography variant="h3" style={styles.sectionHeading}>
									Patient Recipient
								</AppTypography>
							</View>

							<View style={styles.patientProfileBox}>
								<View style={styles.patientAvatarWrap}>
									{draft.patient?.avatar ? (
										<Image source={{ uri: draft.patient.avatar }} style={styles.patientAvatarImg} />
									) : (
										<MaterialCommunityIcons name="account" size={22} color="#0C7C7C" />
									)}
								</View>
								<View style={styles.patientInfoCol}>
									<View style={styles.patientNameRow}>
										<AppTypography variant="h4" style={styles.patientName}>
											{draft.patient?.name}
										</AppTypography>
										<View style={styles.relationChip}>
											<AppTypography variant="caption" style={styles.relationText}>
												{draft.patient?.relationship}
											</AppTypography>
										</View>
									</View>
									<AppTypography variant="caption" style={styles.patientMetaText}>
										{draft.patient?.age} Yrs • {draft.patient?.gender}
									</AppTypography>
								</View>
							</View>
						</View>

						<View style={styles.sectionDividerBar} />

						{/* 3. SECTION: SAMPLE COLLECTION & LOCATION */}
						<View style={styles.sectionBlock}>
							<View style={styles.sectionHeaderRow}>
								<AppTypography variant="h3" style={styles.sectionHeading}>
									Sample Collection & Location
								</AppTypography>
							</View>

							<View style={styles.locationSummaryBox}>
								{/* Method & Address Row */}
								<View style={styles.locationItem}>
									<View style={styles.locationIconWrap}>
										<Ionicons
											name={isHomeCollection ? 'home-outline' : 'business-outline'}
											size={18}
											color="#0C7C7C"
										/>
									</View>
									<View style={styles.locationTextCol}>
										<View style={styles.locationHeaderRow}>
											<AppTypography variant="h4" style={styles.locationTitle}>
												{isHomeCollection ? 'Home Sample Collection' : 'Diagnostic Center Visit'}
											</AppTypography>
											<View style={styles.methodBadge}>
												<AppTypography variant="caption" style={styles.methodBadgeText}>
													{isHomeCollection ? 'DOORSTEP' : 'WALK-IN'}
												</AppTypography>
											</View>
										</View>
										<AppTypography variant="caption" style={styles.locationAddressText}>
											{isHomeCollection
												? draft.collectionAddress
													? `${draft.collectionAddress.address_line}, ${draft.collectionAddress.city}, ${draft.collectionAddress.state || ''} - ${draft.collectionAddress.pincode || ''}`
													: 'User address on file'
												: [labName, labAddress, labCity].filter(Boolean).join(', ')}
										</AppTypography>
									</View>
								</View>

								<View style={styles.locationDivider} />

								{/* Appointment Slot Row */}
								<View style={styles.locationItem}>
									<View style={styles.locationIconWrap}>
										<Ionicons name="time-outline" size={18} color="#0C7C7C" />
									</View>
									<View style={styles.locationTextCol}>
										<AppTypography variant="h4" style={styles.locationTitle}>
											Scheduled Date & Time
										</AppTypography>
										<AppTypography variant="body" style={styles.locationTimeVal}>
											{appointmentDate} • {appointmentTimeSlot}
										</AppTypography>
									</View>
								</View>
							</View>
						</View>

						<View style={styles.sectionDividerBar} />

						{/* 4. SECTION: BILLING BREAKDOWN (Nursing Care BookingDetailsPage style) */}
						<View style={styles.sectionBlock}>
							<View style={styles.sectionHeaderRow}>
								<AppTypography variant="h3" style={styles.sectionHeading}>
									Payment Breakdown
								</AppTypography>
							</View>

							<View style={styles.summaryCard}>
								<View style={styles.billingList}>
									<View style={styles.billingRow}>
										<AppTypography variant="body" style={styles.billingLabel}>
											Item Total ({selectedItems.length} {selectedItems.length === 1 ? 'test' : 'tests'})
										</AppTypography>
										<AppTypography variant="body" style={styles.billingVal}>
											{formatCurrency(totalMrp)}
										</AppTypography>
									</View>

									{discount > 0 && (
										<View style={styles.billingRow}>
											<AppTypography variant="body" style={styles.billingLabel}>
												Special Discount
											</AppTypography>
											<AppTypography variant="body" style={styles.billingDiscount}>
												-{formatCurrency(discount)}
											</AppTypography>
										</View>
									)}

									<View style={styles.billingRow}>
										<AppTypography variant="body" style={styles.billingLabel}>
											{isHomeCollection ? 'Phlebotomist Doorstep Visit Fee' : 'Center Walk-in & Handling Fee'}
										</AppTypography>
										<AppTypography variant="body" style={styles.billingVal}>
											{isHomeCollection ? '₹150' : 'FREE'}
										</AppTypography>
									</View>

									<View style={styles.billingRow}>
										<AppTypography variant="body" style={styles.billingLabel}>
											Taxes & Sanitized Sample Kit
										</AppTypography>
										<AppTypography variant="body" style={styles.billingVal}>
											₹0
										</AppTypography>
									</View>

									<View style={styles.totalDivider} />

									<View style={styles.totalRow}>
										<AppTypography variant="h3" style={styles.totalLabel}>
											Total Payable Amount
										</AppTypography>
										<AppTypography variant="h3" style={styles.totalVal}>
											{formatCurrency(finalPayable)}
										</AppTypography>
									</View>
								</View>
							</View>

							{/* GUARANTEE BADGE */}
							<View style={styles.guaranteeBox}>
								<Ionicons name="shield-checkmark-outline" size={18} color="#059669" />
								<AppTypography variant="caption" style={styles.guaranteeText}>
									100% NABL Accredited Labs • Sanitized Handling • Accurate Reports
								</AppTypography>
							</View>
						</View>
					</>
				) : (
					/* Empty State when all items are removed */
					<View style={styles.emptyContainer}>
						<View style={styles.emptyIconCircle}>
							<MaterialCommunityIcons name="flask-empty-outline" size={48} color="#0C7C7C" />
						</View>
						<AppTypography variant="h2" style={styles.emptyTitle}>
							No Tests Selected
						</AppTypography>
						<AppTypography variant="body" style={styles.emptySubtitle}>
							Your booking summary is currently empty. Please browse our diagnostic catalog and select tests to proceed.
						</AppTypography>
						<AppButton
							variant="primary"
							style={styles.browseBtn}
							onPress={() => navigation.navigate(ROUTES.STACK.LABORATORY_LIST)}
						>
							Browse Diagnostic Catalog
						</AppButton>
					</View>
				)}
			</ScrollView>

			{/* FIXED BOTTOM CHECKOUT BAR — mirrors Nursing Care */}
			{selectedItems.length > 0 && (
				<View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
					<View style={styles.bottomBarPriceCol}>
						<AppTypography variant="caption" style={styles.bottomBarTotalLabel}>
							Total Payable
						</AppTypography>
						<AppTypography variant="h3" style={styles.bottomBarTotalVal}>
							{formatCurrency(finalPayable)}
						</AppTypography>
					</View>
					<AppButton
						variant="primary"
						onPress={handleProceedToPayment}
						style={styles.continueBtn}
					>
						Proceed to Payment
					</AppButton>
				</View>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F8FAFC',
	},
	scrollContent: {
		paddingTop: 4,
	},
	sectionBlock: {
		backgroundColor: '#FFFFFF',
		paddingHorizontal: 16,
		paddingVertical: 16,
		gap: 12,
	},
	sectionDividerBar: {
		height: 8,
		backgroundColor: '#F4F6F9',
		borderTopWidth: 1,
		borderBottomWidth: 1,
		borderColor: '#E2E8F0',
	},
	sectionHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	sectionHeading: {
		fontSize: 16.5,
		fontWeight: '700',
		color: '#0F172A',
		letterSpacing: -0.2,
	},
	mainTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: '#0F172A',
		lineHeight: 24,
	},
	subTitle: {
		fontSize: 12.5,
		color: '#64748B',
		marginTop: -4,
		marginBottom: 4,
	},
	servicesList: {
		gap: 12,
	},
	serviceCard: {
		flexDirection: 'row',
		backgroundColor: '#FFFFFF',
		borderRadius: 14,
		padding: 12,
		borderWidth: 1,
		borderColor: '#E8ECEC',
		shadowColor: '#0F172A',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.04,
		shadowRadius: 3,
		elevation: 1,
	},
	serviceImage: {
		width: 72,
		height: 72,
		borderRadius: 10,
		backgroundColor: '#F1F5F9',
	},
	serviceIconPlaceholder: {
		width: 72,
		height: 72,
		borderRadius: 10,
		backgroundColor: '#E6F4F4',
		alignItems: 'center',
		justifyContent: 'center',
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
		fontSize: 14.5,
		fontWeight: '700',
		color: '#0F172A',
		flex: 1,
		lineHeight: 19,
	},
	removeBtn: {
		padding: 4,
		marginLeft: 8,
	},
	badgeRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		marginTop: 3,
		marginBottom: 3,
		flexWrap: 'wrap',
	},
	verifiedBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		backgroundColor: '#F0F9F9',
		paddingHorizontal: 7,
		paddingVertical: 2,
		borderRadius: 5,
	},
	verifiedText: {
		fontSize: 10.5,
		fontWeight: '600',
		color: '#0C7C7C',
	},
	countBadge: {
		backgroundColor: '#EFF6FF',
		paddingHorizontal: 7,
		paddingVertical: 2,
		borderRadius: 5,
	},
	countBadgeText: {
		fontSize: 10.5,
		fontWeight: '600',
		color: '#1D4ED8',
	},
	serviceDesc: {
		fontSize: 12,
		color: '#64748B',
		lineHeight: 16,
		marginTop: 2,
	},
	viewIncludedLink: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		marginTop: 4,
	},
	viewIncludedLinkText: {
		fontSize: 11.5,
		fontWeight: '700',
		color: '#0C7C7C',
	},
	includedList: {
		marginTop: 6,
		paddingTop: 6,
		borderTopWidth: 1,
		borderTopColor: '#F1F5F9',
		gap: 4,
	},
	includedRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	includedText: {
		fontSize: 11.5,
		color: '#334155',
		flex: 1,
	},
	cardFooterRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginTop: 8,
		paddingTop: 6,
		borderTopWidth: 1,
		borderTopColor: '#F8FAFC',
	},
	durationRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	durationText: {
		fontSize: 11.5,
		color: '#64748B',
	},
	priceText: {
		fontSize: 14.5,
		fontWeight: '800',
		color: '#0F172A',
	},
	patientProfileBox: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F8FAFC',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#E2E8F0',
		padding: 12,
		gap: 12,
	},
	patientAvatarWrap: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: '#E6F4F4',
		alignItems: 'center',
		justifyContent: 'center',
		overflow: 'hidden',
	},
	patientAvatarImg: {
		width: '100%',
		height: '100%',
	},
	patientInfoCol: {
		flex: 1,
		gap: 2,
	},
	patientNameRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	patientName: {
		fontSize: 15,
		fontWeight: '700',
		color: '#0F172A',
	},
	relationChip: {
		backgroundColor: '#E6F4F4',
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 6,
	},
	relationText: {
		fontSize: 11,
		fontWeight: '700',
		color: '#0C7C7C',
	},
	patientMetaText: {
		fontSize: 12,
		color: '#64748B',
	},
	locationSummaryBox: {
		backgroundColor: '#F8FAFC',
		borderRadius: 14,
		borderWidth: 1,
		borderColor: '#E2E8F0',
		padding: 14,
		gap: 10,
	},
	locationItem: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 10,
	},
	locationIconWrap: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: '#E6F4F4',
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 2,
	},
	locationTextCol: {
		flex: 1,
		gap: 2,
	},
	locationHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 8,
	},
	locationTitle: {
		fontSize: 13.5,
		fontWeight: '700',
		color: '#0F172A',
	},
	methodBadge: {
		backgroundColor: '#E6F4F4',
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 4,
	},
	methodBadgeText: {
		fontSize: 9.5,
		fontWeight: '800',
		color: '#0C7C7C',
	},
	locationAddressText: {
		fontSize: 12,
		color: '#64748B',
		lineHeight: 16,
		marginTop: 2,
	},
	locationTimeVal: {
		fontSize: 12.5,
		fontWeight: '600',
		color: '#0C7C7C',
		marginTop: 2,
	},
	locationDivider: {
		height: 1,
		backgroundColor: '#E2E8F0',
		marginVertical: 2,
	},
	summaryCard: {
		backgroundColor: '#FFFFFF',
		borderRadius: 14,
		borderWidth: 1,
		borderColor: '#E2E8F0',
		padding: 14,
	},
	billingList: {
		gap: 10,
	},
	billingRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	billingLabel: {
		fontSize: 13,
		color: '#64748B',
	},
	billingVal: {
		fontSize: 13.5,
		fontWeight: '600',
		color: '#0F172A',
	},
	billingDiscount: {
		fontSize: 13.5,
		fontWeight: '700',
		color: '#059669',
	},
	totalDivider: {
		height: 1,
		backgroundColor: '#E2E8F0',
		marginVertical: 4,
	},
	totalRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	totalLabel: {
		fontSize: 15,
		fontWeight: '800',
		color: '#0F172A',
	},
	totalVal: {
		fontSize: 18,
		fontWeight: '800',
		color: '#0F172A',
	},
	guaranteeBox: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F0FDF4',
		borderRadius: 10,
		borderWidth: 1,
		borderColor: '#DCFCE7',
		paddingHorizontal: 12,
		paddingVertical: 10,
		gap: 8,
		marginTop: 4,
	},
	guaranteeText: {
		flex: 1,
		fontSize: 11.5,
		fontWeight: '600',
		color: '#166534',
		lineHeight: 16,
	},
	bottomBar: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		backgroundColor: '#FFFFFF',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 20,
		paddingTop: 12,
		borderTopWidth: 1,
		borderTopColor: '#E2E8F0',
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
		fontWeight: '600',
		color: '#64748B',
		letterSpacing: 0.5,
	},
	bottomBarTotalVal: {
		fontSize: 20,
		fontWeight: '800',
		color: '#0F172A',
	},
	continueBtn: {
		minWidth: 180,
	},
	emptyContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 24,
		paddingVertical: 48,
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		borderWidth: 1,
		borderColor: '#E2E8F0',
		marginTop: 8,
	},
	emptyIconCircle: {
		width: 68,
		height: 68,
		borderRadius: 34,
		backgroundColor: '#E6F4F4',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 16,
	},
	emptyTitle: {
		color: '#0F172A',
		fontWeight: '700',
		textAlign: 'center',
		fontSize: 18,
	},
	emptySubtitle: {
		marginTop: 8,
		color: '#64748B',
		textAlign: 'center',
		fontSize: 13,
		lineHeight: 19,
		maxWidth: 290,
	},
	browseBtn: {
		marginTop: 20,
		minWidth: 190,
	},
	emptyState: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 24,
		gap: 12,
	},
})

export default BookingSummaryScreen
