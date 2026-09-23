import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation, useRoute } from '@react-navigation/native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Toast from 'react-native-toast-message'
import { AppTypography } from '../../components/common/AppTypography'
import { AppButton } from '../../components/common/AppButton'
import { AppInput } from '../../components/common/AppInput'
import { AppSkeleton } from '../../components/common/AppSkeleton'
import { ROUTES } from '../../navigation/routes'
import { LaboratoryResultCard } from './components/LaboratoryResultCard'
import { LabBookingProgressHeader } from './components/LabBookingProgressHeader'
import { getLaboratories } from '../laboratory_duplicated/laboratoryService'
import type { LaboratoryItem } from '../laboratory_duplicated/laboratory'
import type { LabBookingDraft } from './types'
import { HEALTH_CHECKUP_PACKAGES, POPULAR_DIAGNOSTIC_TESTS } from './data/laboratoryMockData'

const TIME_SLOTS = [
	{ label: 'Morning', value: 'Morning (07:00 AM - 11:00 AM)', hint: '7 AM – 11 AM', endHour: 11 },
	{ label: 'Afternoon', value: 'Afternoon (12:00 PM - 04:00 PM)', hint: '12 PM – 4 PM', endHour: 16 },
	{ label: 'Evening', value: 'Evening (05:00 PM - 08:00 PM)', hint: '5 PM – 8 PM', endHour: 20 },
]

const formatDisplayDate = (d: Date): string => {
	const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
	const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
	return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`
}

const formatDateIso = (d: Date): string => {
	const year = d.getFullYear()
	const month = String(d.getMonth() + 1).padStart(2, '0')
	const day = String(d.getDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}

const isSameCalendarDay = (a: Date, b: Date) =>
	a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

const isSlotPast = (d: Date, endHour: number): boolean => {
	const now = new Date()
	if (!isSameCalendarDay(d, now)) return false
	return now.getHours() >= endHour
}

const PROGRESS_STEPS = ['Details', 'Lab & Slot', 'Summary']

export const LabSelectionScreen: React.FC = () => {
	const insets = useSafeAreaInsets()
	const navigation = useNavigation<any>()
	const route = useRoute<any>()
	const draft = route.params?.draft as LabBookingDraft | undefined

	const [labs, setLabs] = useState<LaboratoryItem[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [query, setQuery] = useState('')

	const [selectedLab, setSelectedLab] = useState<LaboratoryItem | null>(null)
	const [changingLab, setChangingLab] = useState(false)
	const [selectedDate, setSelectedDate] = useState<Date>(new Date())
	const [timeSlot, setTimeSlot] = useState<string | null>(TIME_SLOTS[0].value)

	const loadLabs = useCallback(async () => {
		try {
			setLoading(true)
			setError(null)
			const result = await getLaboratories({ limit: 50 })
			setLabs(result.data)
		} catch (err: any) {
			setError(err?.message || 'Failed to load laboratories')
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		loadLabs()
	}, [loadLabs])

	// 7 upcoming dates matching Nursing Care date strip
	const upcomingDates = useMemo(() => {
		return Array.from({ length: 7 }, (_, i) => {
			const d = new Date()
			d.setDate(d.getDate() + i)
			return d
		})
	}, [])

	const filteredLabs = useMemo(() => {
		const q = query.trim().toLowerCase()
		if (!q) return labs
		return labs.filter(
			(lab) =>
				lab.name.toLowerCase().includes(q) ||
				lab.city.toLowerCase().includes(q) ||
				lab.address.toLowerCase().includes(q)
		)
	}, [labs, query])

	const handleSelectLab = (lab: LaboratoryItem) => {
		setSelectedLab(lab)
		setChangingLab(false)
	}

	const handleChangeDate = (d: Date) => {
		setSelectedDate(d)
		if (isSlotPast(d, 11) && timeSlot === TIME_SLOTS[0].value) {
			setTimeSlot(TIME_SLOTS[1].value)
		}
	}

	const effectiveTotal = useMemo(() => {
		if (!draft) return 0
		let sum = 0
		POPULAR_DIAGNOSTIC_TESTS.filter((t) => draft.testIds.includes(t.id)).forEach((t) => { sum += t.price })
		HEALTH_CHECKUP_PACKAGES.filter((p) => draft.packageIds.includes(p.id)).forEach((p) => { sum += p.price })
		return sum
	}, [draft])

	const handleContinue = () => {
		if (!draft) {
			Toast.show({ type: 'error', text1: 'Missing booking details', text2: 'Please start again from your selection.' })
			navigation.navigate(ROUTES.STACK.LABORATORY_LIST)
			return
		}
		if (!selectedLab) {
			Toast.show({ type: 'error', text1: 'Select a diagnostic center', text2: 'Choose which laboratory should handle this booking.' })
			return
		}
		if (!timeSlot) {
			Toast.show({ type: 'error', text1: 'Select a time slot', text2: 'Please choose a preferred time slot to continue.' })
			return
		}

		navigation.navigate(ROUTES.STACK.LABORATORY_BOOKING_SUMMARY, {
			draft,
			labId: selectedLab.id,
			labName: selectedLab.name,
			labAddress: selectedLab.address,
			labCity: selectedLab.city,
			labAvatarKey: selectedLab.avatar_s3_key,
			labOperatingHours: selectedLab.operating_hours,
			labIs24x7: selectedLab.is_24_x_7,
			date: formatDisplayDate(selectedDate),
			timeSlot,
		})
	}

	const showLabList = !selectedLab || changingLab

	return (
		<View style={styles.container}>
			<LabBookingProgressHeader steps={PROGRESS_STEPS} currentIndex={1} />
			<ScrollView
				contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + 96 }]}
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
			>
				{/* SECTION: SELECT DIAGNOSTIC CENTER */}
				<View style={styles.sectionBlock}>
					<View style={styles.sectionHeaderRow}>
						<AppTypography variant="h3" style={styles.sectionHeading}>
							Select Diagnostic Center
						</AppTypography>
						{!showLabList && (
							<TouchableOpacity style={styles.actionBtn} onPress={() => setChangingLab(true)} activeOpacity={0.7}>
								<AppTypography variant="caption" style={styles.actionBtnText}>
									Change
								</AppTypography>
							</TouchableOpacity>
						)}
					</View>
					<AppTypography variant="caption" style={styles.sectionSubheading}>
						Choose an accredited diagnostic center for your visit
					</AppTypography>

					{showLabList ? (
						<>
							<View style={styles.searchInputWrap}>
								<AppInput
									isSearch
									placeholder="Search labs by name or city"
									value={query}
									onChangeText={setQuery}
									fieldSize="form"
									noMargin
								/>
							</View>

							<AppTypography variant="caption" style={styles.resultCount}>
								{loading ? 'Loading laboratories…' : `${filteredLabs.length} diagnostic ${filteredLabs.length === 1 ? 'center' : 'centers'} available`}
							</AppTypography>

							{loading ? (
								<View style={styles.skeletonGroup}>
									{[0, 1, 2].map((i) => (
										<AppSkeleton key={i} height={72} borderRadius={12} style={styles.skeletonCard} />
									))}
								</View>
							) : error ? (
								<View style={styles.emptyState}>
									<MaterialCommunityIcons name="alert-circle-outline" size={36} color="#EF4444" />
									<AppTypography variant="subtitle" style={styles.emptyTitle} align="center">
										Couldn&apos;t load diagnostic centers
									</AppTypography>
									<AppTypography variant="caption" style={styles.emptySubtitle} align="center">
										{error}
									</AppTypography>
									<AppButton variant="primary" compact onPress={loadLabs}>
										Retry
									</AppButton>
								</View>
							) : filteredLabs.length === 0 ? (
								<View style={styles.emptyState}>
									<MaterialCommunityIcons name="hospital-building" size={36} color="#94A3B8" />
									<AppTypography variant="subtitle" style={styles.emptyTitle} align="center">
										No diagnostic centers found
									</AppTypography>
									<AppTypography variant="caption" style={styles.emptySubtitle} align="center">
										Try searching for a different lab name or city.
									</AppTypography>
								</View>
							) : (
								<>
									{changingLab && (
										<TouchableOpacity onPress={() => setChangingLab(false)} style={styles.cancelChangeLink}>
											<AppTypography variant="caption" style={styles.cancelChangeLinkText}>
												Cancel
											</AppTypography>
										</TouchableOpacity>
									)}
									<View style={styles.labCardsGroup}>
										{filteredLabs.map((lab) => (
											<LaboratoryResultCard
												key={lab.id}
												lab={lab}
												selected={selectedLab?.id === lab.id}
												onSelect={handleSelectLab}
											/>
										))}
									</View>
								</>
							)}
						</>
					) : (
						selectedLab && (
							<LaboratoryResultCard lab={selectedLab} selected onSelect={() => setChangingLab(true)} />
						)
					)}
				</View>

				{/* SECTION: SELECT DATE & SLOT (Reusing Nursing Care Date & Slot UI) */}
				{selectedLab && (
					<>
						<View style={styles.sectionDividerBar} />
						<View style={styles.sectionBlock}>
							<View style={styles.sectionHeaderRow}>
								<AppTypography variant="h3" style={styles.sectionHeading}>
									Select Appointment Date
								</AppTypography>
							</View>
							<AppTypography variant="caption" style={styles.sectionSubheading}>
								Choose your preferred visit date
							</AppTypography>

							<View style={styles.dateStripContainer}>
								<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateScrollContent}>
									{upcomingDates.map((d) => {
										const isSelected = formatDateIso(d) === formatDateIso(selectedDate)
										return (
											<TouchableOpacity
												key={d.toISOString()}
												style={[styles.dateChip, isSelected && styles.dateChipSelected]}
												onPress={() => handleChangeDate(d)}
												activeOpacity={0.8}
											>
												<AppTypography variant="caption" style={[styles.dateChipDay, isSelected && styles.dateChipTextSelected]}>
													{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]}
												</AppTypography>
												<AppTypography variant="h4" style={[styles.dateChipNum, isSelected && styles.dateChipTextSelected]}>
													{d.getDate()}
												</AppTypography>
											</TouchableOpacity>
										)
									})}
								</ScrollView>
							</View>
						</View>

						<View style={styles.sectionDividerBar} />
						<View style={styles.sectionBlock}>
							<View style={styles.sectionHeaderRow}>
								<AppTypography variant="h3" style={styles.sectionHeading}>
									Select Time Window
								</AppTypography>
							</View>
							<AppTypography variant="caption" style={styles.sectionSubheading}>
								Choose a slot for your center walk-in
							</AppTypography>

							<View style={styles.slotsGridFlex}>
								{TIME_SLOTS.map((slot) => {
									const isSelected = timeSlot === slot.value
									const disabled = isSlotPast(selectedDate, slot.endHour)
									return (
										<TouchableOpacity
											key={slot.value}
											style={[styles.slotChip, isSelected && styles.slotChipSelected, disabled && styles.slotChipDisabled]}
											onPress={() => !disabled && setTimeSlot(slot.value)}
											disabled={disabled}
											activeOpacity={0.8}
										>
											<AppTypography
												variant="caption"
												style={[
													styles.slotChipText,
													isSelected && styles.slotChipTextSelected,
													disabled && styles.slotChipTextDisabled,
												]}
											>
												{slot.label} ({slot.hint})
											</AppTypography>
										</TouchableOpacity>
									)
								})}
							</View>
						</View>
					</>
				)}
			</ScrollView>

			{/* FIXED BOTTOM CHECKOUT BAR — mirrors Nursing Care */}
			<View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
				<View style={styles.bottomBarPriceCol}>
					<Text style={styles.bottomBarTotalLabel}>Total Amount</Text>
					<Text style={styles.bottomBarTotalVal}>₹{effectiveTotal}</Text>
				</View>
				<AppButton
					variant="primary"
					onPress={handleContinue}
					style={styles.continueBtn}
					disabled={!selectedLab || !timeSlot}
				>
					Proceed to Summary
				</AppButton>
			</View>
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
	cancelChangeLink: {
		alignSelf: 'flex-end',
		marginBottom: 6,
	},
	cancelChangeLinkText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#64748B',
	},
	searchInputWrap: {
		marginBottom: 4,
	},
	resultCount: {
		fontSize: 12,
		color: '#64748B',
	},
	labCardsGroup: {
		gap: 4,
	},
	skeletonGroup: {
		gap: 8,
	},
	skeletonCard: {
		marginBottom: 4,
	},
	dateStripContainer: {
		marginBottom: 6,
	},
	dateScrollContent: {
		gap: 8,
		paddingHorizontal: 2,
	},
	dateChip: {
		width: 54,
		paddingVertical: 8,
		borderRadius: 10,
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#E2E8F0',
		alignItems: 'center',
		justifyContent: 'center',
	},
	dateChipSelected: {
		backgroundColor: '#0C7C7C',
		borderColor: '#0C7C7C',
	},
	dateChipDay: {
		fontSize: 11,
		color: '#64748B',
	},
	dateChipNum: {
		fontSize: 15,
		fontWeight: '700',
		color: '#0F172A',
		marginTop: 2,
	},
	dateChipTextSelected: {
		color: '#FFFFFF',
	},
	slotsGridFlex: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	slotChip: {
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#CBD5E1',
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 8,
	},
	slotChipSelected: {
		backgroundColor: '#0C7C7C',
		borderColor: '#0C7C7C',
	},
	slotChipDisabled: {
		backgroundColor: '#F1F5F9',
		borderColor: '#E2E8F0',
		opacity: 0.6,
	},
	slotChipText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#334155',
	},
	slotChipTextSelected: {
		color: '#FFFFFF',
	},
	slotChipTextDisabled: {
		color: '#94A3B8',
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
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 24,
		paddingVertical: 32,
		gap: 10,
	},
	emptyTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#0F172A',
	},
	emptySubtitle: {
		fontSize: 12.5,
		color: '#64748B',
		marginBottom: 4,
	},
})

export default LabSelectionScreen
