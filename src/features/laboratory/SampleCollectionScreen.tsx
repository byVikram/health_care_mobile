import React, { useCallback, useEffect, useMemo, useState } from 'react'
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
import { AppTypography } from '../../components/common/display/AppTypography'
import { AppButton } from '../../components/common/buttons/AppButton'
import { AppInput } from '../../components/common/inputs/AppInput'
import { type PatientAddress } from '../profile/patient/PatientProfileService'
import { resolveSelfPatientIdentity } from '../../utils/resolvePatientIdentity'
import { ROUTES } from '../../navigation/routes'
import { HEALTH_CHECKUP_PACKAGES, POPULAR_DIAGNOSTIC_TESTS } from './data/laboratoryMockData'
import {
	AddressSelectionSheet,
	AppFamilyMemberSheet,
	BookingProgressStepper,
	DateStrip,
	SelectionRowCard,
	SlotChipGrid,
} from '../../components/common'
import { FamilyMemberOption, useFamilyMembers } from '../../hooks/useFamilyMembers'
import type { CollectionMethod, LabBookingDraft, PatientProfile } from './types'

const HOME_TIME_SLOTS = [
	{ label: 'Morning', value: 'Morning (07:00 AM - 11:00 AM)', hint: '7 AM – 11 AM' },
	{ label: 'Afternoon', value: 'Afternoon (12:00 PM - 04:00 PM)', hint: '12 PM – 4 PM' },
	{ label: 'Evening', value: 'Evening (05:00 PM - 08:00 PM)', hint: '5 PM – 8 PM' },
]

const formatDisplayDate = (d: Date): string => {
	const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
	const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
	return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`
}

/** Family-picker member -> the PatientProfile shape the lab draft carries (same fields the old picker set). */
const toPatientProfile = (m: FamilyMemberOption, current: PatientProfile | null): PatientProfile => ({
	// Self without a known public id keeps the id already resolved for the caller.
	id: m.publicId ?? (current?.relationship === 'Self' ? current.id : m.key),
	publicId: m.publicId ?? (current?.relationship === 'Self' ? current.publicId : undefined),
	name: m.name,
	age: m.age ?? '',
	gender: m.gender ?? '',
	relationship: m.apiRelation ?? m.relation,
	avatar: m.avatar ?? undefined,
	bloodGroup: m.bloodGroup,
})

export const SampleCollectionScreen: React.FC = () => {
	const insets = useSafeAreaInsets()
	const navigation = useNavigation<any>()
	const route = useRoute<any>()
	const params = route.params || {}
	const draftParam = params.draft as LabBookingDraft | undefined

	// Support single item or multi-item selections from any entry point
	const routeTestId = params.testId || params.test?.id
	const routePackageId = params.packageId || params.package?.id
	const routeTestIds: string[] = draftParam?.testIds || params.testIds || (params.tests ? params.tests.map((t: any) => t.id) : (routeTestId ? [routeTestId] : []))
	const routePackageIds: string[] = draftParam?.packageIds || params.packageIds || (params.packages ? params.packages.map((p: any) => p.id) : (routePackageId ? [routePackageId] : []))

	const [testIds, setTestIds] = useState<string[]>(routeTestIds)
	const [packageIds, setPackageIds] = useState<string[]>(routePackageIds)

	const isPackageFlow = packageIds.length > 0 && testIds.length === 0

	// Step 1: Sample Collection Preference (Home Collection vs Center Visit)
	const [method, setMethod] = useState<CollectionMethod | null>(draftParam?.collectionType || null)

	// Step 2: Patient Profile (auto-loaded from user profile or draft)
	const [selectedProfile, setSelectedProfile] = useState<PatientProfile | null>(draftParam?.patient || null)
	const [showProfileSheet, setShowProfileSheet] = useState(false)
	const { members: familyMembers } = useFamilyMembers()
	const selectedMemberKey = selectedProfile
		? (familyMembers.find((m) => (m.publicId ?? m.key) === selectedProfile.id)?.key ??
			(selectedProfile.relationship === 'Self' ? 'self' : undefined))
		: undefined

	// Step 3: Address (Home Collection only)
	const [selectedAddress, setSelectedAddress] = useState<PatientAddress | null>(draftParam?.collectionAddress || null)

	// Home slot & date preferences
	const [selectedDate, setSelectedDate] = useState<Date>(new Date())
	const [selectedSlot, setSelectedSlot] = useState<string>(draftParam?.preferredTimeSlot || HOME_TIME_SLOTS[0].value)

	const [notes, setNotes] = useState<string>(draftParam?.notes || '')

	// Auto-fetch profile if not provided. Never fabricates a placeholder name/
	// age/gender when resolution fails — if `resolveSelfPatientIdentity`
	// can't find a genuine identity, `selectedProfile` stays unset and the
	// existing "Select Profile" prompt below is shown instead, matching how
	// Ancillary's booking flow refuses to proceed with an unresolved patient
	// rather than silently booking under a fake name.
	const fetchInitialProfile = useCallback(async () => {
		if (selectedProfile) return
		const identity = await resolveSelfPatientIdentity()
		if (identity) {
			setSelectedProfile({
				id: identity.publicId,
				publicId: identity.publicId,
				name: identity.name,
				relationship: identity.relationship,
				age: identity.age,
				gender: identity.gender,
				avatar: identity.avatar,
			})
		}
	}, [selectedProfile])

	useEffect(() => {
		void fetchInitialProfile()
	}, [fetchInitialProfile])

	const selectedTests = useMemo(
		() => POPULAR_DIAGNOSTIC_TESTS.filter((t) => testIds.includes(t.id)),
		[testIds]
	)
	const selectedPackages = useMemo(
		() => HEALTH_CHECKUP_PACKAGES.filter((p) => packageIds.includes(p.id)),
		[packageIds]
	)

	const hasSelection = selectedTests.length > 0 || selectedPackages.length > 0
	const selectionCount = selectedTests.length + selectedPackages.length
	const selectionNames = [...selectedTests.map((t) => t.name), ...selectedPackages.map((p) => p.name)].join(', ')

	const effectiveTotal = useMemo(() => {
		let sum = 0
		selectedTests.forEach((t) => { sum += t.price })
		selectedPackages.forEach((p) => { sum += p.price })
		return sum
	}, [selectedTests, selectedPackages])

	// Dynamic step progress indicator
	// The full journey, including the Payment step that only actually happens
	// on a later screen — shown from the very first screen so the stepper
	// never grows/shrinks a step between screens, only `currentIndex` moves.
	const progressSteps =
		method === 'home_collection'
			? ['Details', 'Summary', 'Payment']
			: ['Details', 'Lab & Slot', 'Summary', 'Payment']

	const handleContinue = () => {
		if (!hasSelection) {
			Toast.show({
				type: 'error',
				text1: 'No items selected',
				text2: 'Please select a diagnostic test or package to continue.',
			})
			return
		}
		if (!method) {
			Toast.show({
				type: 'error',
				text1: 'Select collection preference',
				text2: 'Choose Home Sample Collection or Visit Diagnostic Center to continue.',
			})
			return
		}
		if (!selectedProfile) {
			Toast.show({
				type: 'error',
				text1: 'Select patient profile',
				text2: 'Choose who this booking is for to continue.',
			})
			return
		}
		if (method === 'home_collection' && !selectedAddress) {
			Toast.show({
				type: 'error',
				text1: 'Select collection address',
				text2: 'Select where our certified phlebotomist should collect your sample.',
			})
			return
		}

		const requiresLabSelection = method === 'walk_in'

		const draft: LabBookingDraft = {
			selectionType: isPackageFlow ? 'package' : 'tests',
			collectionType: method,
			patient: selectedProfile,
			collectionAddressId: method === 'home_collection' ? (selectedAddress?.id ?? null) : null,
			collectionAddress: method === 'home_collection' ? selectedAddress : null,
			notes: notes.trim(),
			testIds,
			packageIds,
			preferredDate: method === 'home_collection' ? formatDisplayDate(selectedDate) : undefined,
			preferredTimeSlot: method === 'home_collection' ? selectedSlot : undefined,
			requiresLabSelection,
		}

		if (requiresLabSelection) {
			// Diagnostic Center Visit Flow
			navigation.navigate(ROUTES.STACK.LABORATORY_SELECT_LAB, { draft })
		} else {
			// Home Sample Collection Flow: goes directly to Summary
			navigation.navigate(ROUTES.STACK.LABORATORY_BOOKING_SUMMARY, { draft })
		}
	}

	if (!hasSelection) {
		return (
			<View style={styles.container}>
				<View style={styles.emptyState}>
					<View style={styles.emptyIconContainer}>
						<MaterialCommunityIcons name="flask-empty-outline" size={42} color="#94A3B8" />
					</View>
					<AppTypography variant="subtitle" style={styles.emptyTitle} align="center">
						No tests or packages selected
					</AppTypography>
					<AppTypography variant="caption" align="center" style={styles.emptySubtitle}>
						Please select a diagnostic test or health checkup package first.
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
			<BookingProgressStepper steps={progressSteps.map((label) => ({ label }))} currentIndex={0} />

			<ScrollView
				contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + 96 }]}
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
			>
				{/* 1. SECTION: YOUR SELECTION SUMMARY */}
				<View style={styles.sectionBlock}>
					<View style={styles.sectionHeaderRow}>
						<AppTypography variant="h3" style={styles.sectionHeading}>
							Selected Services ({selectionCount})
						</AppTypography>
					</View>
					<View style={styles.selectionBox}>
						<View style={styles.selectionIconWrap}>
							<MaterialCommunityIcons
								name={isPackageFlow ? 'shield-check-outline' : 'clipboard-text-outline'}
								size={20}
								color="#0C7C7C"
							/>
						</View>
						<View style={styles.selectionTextCol}>
							<AppTypography variant="body" style={styles.selectionCount}>
								{selectionCount} {isPackageFlow ? (selectionCount === 1 ? 'Package' : 'Packages') : (selectionCount === 1 ? 'Test' : 'Tests')} Selected
							</AppTypography>
							<Text style={styles.selectionNames} numberOfLines={2}>
								{selectionNames}
							</Text>
						</View>
						<Text style={styles.selectionTotal}>₹{effectiveTotal}</Text>
					</View>
				</View>

				<View style={styles.sectionDividerBar} />

				{/* 2. SECTION: SAMPLE COLLECTION PREFERENCE (STEP 1) */}
				<View style={styles.sectionBlock}>
					<View style={styles.sectionHeaderRow}>
						<AppTypography variant="h3" style={styles.sectionHeading}>
							Sample Collection Preference
						</AppTypography>
					</View>
					<AppTypography variant="caption" style={styles.sectionSubheading}>
						Choose how you would like your samples to be collected
					</AppTypography>

					<View style={styles.methodChoiceContainer}>
						<SelectionRowCard
							icon={
								<MaterialCommunityIcons
									name="home-outline"
									size={20}
									color={method === 'home_collection' ? '#FFFFFF' : '#0C7C7C'}
								/>
							}
							title="Home Sample Collection"
							subtitle="A certified phlebotomist visits your doorstep to collect samples."
							badgeText="Convenient"
							selected={method === 'home_collection'}
							onPress={() => setMethod('home_collection')}
						/>
						<SelectionRowCard
							icon={
								<MaterialCommunityIcons
									name="hospital-building"
									size={20}
									color={method === 'walk_in' ? '#FFFFFF' : '#0C7C7C'}
								/>
							}
							title="Diagnostic Center Visit"
							subtitle="Visit an accredited diagnostic laboratory at your chosen time slot."
							selected={method === 'walk_in'}
							onPress={() => setMethod('walk_in')}
						/>
					</View>
				</View>

				<View style={styles.sectionDividerBar} />

				{/* 3. SECTION: PATIENT DETAILS */}
				<View style={styles.sectionBlock}>
					<View style={styles.sectionHeaderRow}>
						<AppTypography variant="h3" style={styles.sectionHeading}>
							Patient Details
						</AppTypography>
						<TouchableOpacity
							style={styles.actionBtn}
							onPress={() => setShowProfileSheet(true)}
							activeOpacity={0.7}
						>
							<AppTypography variant="caption" style={styles.actionBtnText}>
								{selectedProfile ? 'Switch Profile' : 'Select Profile'}
							</AppTypography>
						</TouchableOpacity>
					</View>

					<TouchableOpacity
						style={styles.patientProfileBox}
						onPress={() => setShowProfileSheet(true)}
						activeOpacity={0.85}
					>
						{selectedProfile ? (
							<>
								<View style={styles.patientAvatarWrap}>
									{selectedProfile.avatar ? (
										<Image source={{ uri: selectedProfile.avatar }} style={styles.patientAvatarImg} />
									) : (
										<MaterialCommunityIcons name="account" size={22} color="#0C7C7C" />
									)}
								</View>
								<View style={styles.patientInfoCol}>
									<View style={styles.patientNameRow}>
										<AppTypography variant="h4" style={styles.patientName} numberOfLines={1}>
											{selectedProfile.name}
										</AppTypography>
										<View style={styles.relationChip}>
											<AppTypography variant="caption" style={styles.relationText}>
												{selectedProfile.relationship}
											</AppTypography>
										</View>
									</View>
									<AppTypography variant="caption" style={styles.patientMetaText}>
										{selectedProfile.age} Yrs • {selectedProfile.gender}
									</AppTypography>
								</View>
								<Ionicons name="swap-horizontal" size={18} color="#0C7C7C" />
							</>
						) : (
							<>
								<View style={styles.patientAvatarWrap}>
									<MaterialCommunityIcons name="account-outline" size={22} color="#0C7C7C" />
								</View>
								<Text style={styles.patientPlaceholderText}>Select who this booking is for</Text>
								<MaterialCommunityIcons name="chevron-right" size={20} color="#64748B" />
							</>
						)}
					</TouchableOpacity>
				</View>

				{/* 4. SECTION: ADDRESS & SCHEDULE (HOME SAMPLE COLLECTION ONLY) */}
				{method === 'home_collection' && (
					<>
						<View style={styles.sectionDividerBar} />
						<View style={styles.sectionBlock}>
							<View style={styles.sectionHeaderRow}>
								<AppTypography variant="h3" style={styles.sectionHeading}>
									Collection Address
								</AppTypography>
							</View>
							<AppTypography variant="caption" style={styles.sectionSubheading}>
								Where should our certified phlebotomist visit?
							</AppTypography>

							<AddressSelectionSheet
								selectedAddressId={selectedAddress?.id ?? null}
								onSelectAddress={setSelectedAddress}
							/>

							{/* Home Collection Date & Slot selection */}
							<View style={styles.subsection}>
								<AppTypography variant="subtitle" style={styles.subsectionTitle}>
									Preferred Visit Date
								</AppTypography>
								<DateStrip selectedDate={selectedDate} onSelectDate={setSelectedDate} style={styles.dateStripContainer} />
							</View>

							<View style={styles.subsection}>
								<AppTypography variant="subtitle" style={styles.subsectionTitle}>
									Preferred Time Window
								</AppTypography>
								<SlotChipGrid
									slots={HOME_TIME_SLOTS.map((slot) => ({ value: slot.value, label: `${slot.label} (${slot.hint})` }))}
									selectedValue={selectedSlot}
									onSelectValue={setSelectedSlot}
								/>
							</View>
						</View>
					</>
				)}

				{/* Info note when Diagnostic Center Visit is selected */}
				{method === 'walk_in' && (
					<>
						<View style={styles.sectionDividerBar} />
						<View style={styles.sectionBlock}>
							<View style={styles.infoBox}>
								<MaterialCommunityIcons name="information-outline" size={20} color="#0C7C7C" />
								<View style={styles.infoTextGroup}>
									<Text style={styles.infoTitle}>Diagnostic Center Selection</Text>
									<Text style={styles.infoSubtitle}>
										You will select an accredited diagnostic center and your preferred date & time slot on the next screen.
									</Text>
								</View>
							</View>
						</View>
					</>
				)}

				<View style={styles.sectionDividerBar} />

				{/* 5. SECTION: ADDITIONAL INSTRUCTIONS */}
				<View style={styles.sectionBlock}>
					<View style={styles.sectionHeaderRow}>
						<AppTypography variant="h3" style={styles.sectionHeading}>
							Special Instructions <Text style={styles.optionalText}>(Optional)</Text>
						</AppTypography>
					</View>
					<AppInput
						placeholder="e.g. Fasting sample, landmark, patient mobility notes…"
						value={notes}
						onChangeText={setNotes}
						multiline
						numberOfLines={3}
						fieldSize="form"
						noMargin
						style={styles.notesInput}
					/>
				</View>
			</ScrollView>

			{/* FIXED BOTTOM CHECKOUT BAR — mirrors Nursing Care BookingDetailsPage */}
			<View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
				<View style={styles.bottomBarPriceCol}>
					<Text style={styles.bottomBarTotalLabel}>Total Amount</Text>
					<Text style={styles.bottomBarTotalVal}>₹{effectiveTotal}</Text>
				</View>
				<AppButton
					variant="primary"
					onPress={handleContinue}
					style={styles.continueBtn}
				>
					{method === 'walk_in' ? 'Select Diagnostic Center' : 'Proceed to Summary'}
				</AppButton>
			</View>

			<AppFamilyMemberSheet
				visible={showProfileSheet}
				onClose={() => setShowProfileSheet(false)}
				members={familyMembers}
				selectedKey={selectedMemberKey}
				onSelect={(m) => setSelectedProfile((current) => toPatientProfile(m, current))}
				title="Who is this booking for?"
				subtitle="Pick yourself or a family member"
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
		paddingTop: 4,
	},
	sectionBlock: {
		backgroundColor: '#FFFFFF',
		paddingHorizontal: 16,
		paddingVertical: 16,
		gap: 14,
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
	sectionSubheading: {
		fontSize: 12.5,
		color: '#64748B',
		marginTop: -6,
	},
	actionBtn: {
		paddingVertical: 4,
		paddingHorizontal: 8,
	},
	actionBtnText: {
		fontSize: 12.5,
		fontWeight: '700',
		color: '#0C7C7C',
	},
	selectionBox: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F8FAFC',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#E2E8F0',
		padding: 12,
		gap: 12,
	},
	selectionIconWrap: {
		width: 40,
		height: 40,
		borderRadius: 10,
		backgroundColor: '#E6F4F4',
		alignItems: 'center',
		justifyContent: 'center',
	},
	selectionTextCol: {
		flex: 1,
		gap: 2,
	},
	selectionCount: {
		fontSize: 13.5,
		fontWeight: '700',
		color: '#0F172A',
	},
	selectionNames: {
		fontSize: 12,
		color: '#64748B',
	},
	selectionTotal: {
		fontSize: 16,
		fontWeight: '800',
		color: '#0F172A',
	},
	methodChoiceContainer: {
		gap: 10,
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
	patientPlaceholderText: {
		flex: 1,
		fontSize: 13.5,
		color: '#64748B',
	},
	subsection: {
		marginTop: 8,
		gap: 8,
	},
	subsectionTitle: {
		fontSize: 13,
		fontWeight: '700',
		color: '#334155',
	},
	dateStripContainer: {
		marginBottom: 6,
	},
	infoBox: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		backgroundColor: '#F0FDFA',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#CCFBF1',
		padding: 12,
		gap: 10,
	},
	infoTextGroup: {
		flex: 1,
		gap: 2,
	},
	infoTitle: {
		fontSize: 13.5,
		fontWeight: '700',
		color: '#0F172A',
	},
	infoSubtitle: {
		fontSize: 12,
		color: '#475569',
		lineHeight: 16,
	},
	optionalText: {
		fontSize: 12,
		fontWeight: '400',
		color: '#94A3B8',
	},
	notesInput: {
		height: 72,
		textAlignVertical: 'top',
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
	emptyState: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 24,
		gap: 12,
	},
	emptyIconContainer: {
		width: 72,
		height: 72,
		borderRadius: 36,
		backgroundColor: '#F1F5F9',
		alignItems: 'center',
		justifyContent: 'center',
	},
	emptyTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: '#0F172A',
	},
	emptySubtitle: {
		fontSize: 13,
		color: '#64748B',
		marginBottom: 8,
	},
})

export default SampleCollectionScreen
