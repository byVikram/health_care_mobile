import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native'
import {
	AppStickyFooter,
	AppTypography,
	StatusModal,
	WorkingHoursSection,
	SECTION_META,
	type WorkingDayKey,
	type SectionSlots,
	type WorkingHoursState,
} from '../../../../components/common'
import {
	saveProviderWeeklyAvailability,
	fetchProviderWeeklyAvailabilityBackend,
	extractApiErrorMessage,
	ProviderAvailabilityDay,
} from '../../../ancillary/ancillaryService'

// ── Data model ──────────────────────────────────────────────────────────
// Mirrors the shape the Doctor Profile → My Hospitals tab saves
// (weeklyWorkingHours keyed by day), minus the clinic/video appointment-type
// dimension, which is doctor-specific and not relevant to nurse availability.
interface NurseAvailabilityData {
	isAvailable: boolean
	weeklyWorkingHours: Record<WorkingDayKey, WorkingHoursState>
}

const PRIMARY = '#2B6F71'

const createEmptyWorkingHoursState = (): WorkingHoursState => ({
	sections: {
		morning: [],
		afternoon: [],
		evening: [],
	},
	slotDuration: 30,
})

const createEmptyWeeklyWorkingHours = (): Record<WorkingDayKey, WorkingHoursState> => ({
	sunday: createEmptyWorkingHoursState(),
	monday: createEmptyWorkingHoursState(),
	tuesday: createEmptyWorkingHoursState(),
	wednesday: createEmptyWorkingHoursState(),
	thursday: createEmptyWorkingHoursState(),
	friday: createEmptyWorkingHoursState(),
	saturday: createEmptyWorkingHoursState(),
})

export default function AvailabilityTab({
	isActive = true,
	onNextTab,
}: {
	isActive?: boolean
	onNextTab?: () => void
}) {
	const { width } = useWindowDimensions()
	const isTablet = width >= 768 && width < 1024
	const isMobile = width < 768
	const contentWidth = useMemo(() => {
		if (width >= 1024) return 760
		if (isTablet) return 600
		return '100%'
	}, [width, isTablet])
	const sectionPadding = isMobile ? 16 : isTablet ? 32 : 48

	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [isAvailable, setIsAvailable] = useState(false)
	const [selectedWorkingDay, setSelectedWorkingDay] = useState<WorkingDayKey>('monday')
	const [weeklyWorkingHours, setWeeklyWorkingHours] = useState<Record<WorkingDayKey, WorkingHoursState>>(
		createEmptyWeeklyWorkingHours
	)
	const savedDataRef = useRef<NurseAvailabilityData>({
		isAvailable: false,
		weeklyWorkingHours: createEmptyWeeklyWorkingHours(),
	})
	const [statusModal, setStatusModal] = useState<{
		visible: boolean
		status: 'success' | 'error' | 'info'
		title: string
		description: string
	} | null>(null)

	useEffect(() => {
		const loadAvailability = async () => {
			try {
				setLoading(true)

				// Initialize UI with empty working hours without fabricating default slots
				const initialHours = createEmptyWeeklyWorkingHours()

				// Fetch authoritative schedules from Backend API
				const backendSchedules = await fetchProviderWeeklyAvailabilityBackend()

				const dayMap: Record<ProviderAvailabilityDay['day_of_week'], WorkingDayKey> = {
					MONDAY: 'monday',
					TUESDAY: 'tuesday',
					WEDNESDAY: 'wednesday',
					THURSDAY: 'thursday',
					FRIDAY: 'friday',
					SATURDAY: 'saturday',
					SUNDAY: 'sunday',
				}

				if (Array.isArray(backendSchedules)) {
					backendSchedules.forEach((item) => {
						const dayKey = dayMap[item.day_of_week]
						const isDayAvailable = item.is_available

						if (dayKey && isDayAvailable && item.start_time && item.end_time) {
							const sTime = item.start_time
							const eTime = item.end_time
							const startHour = Number(sTime.split(':')[0])

							if (!Number.isNaN(startHour)) {
								if (startHour < 12) {
									initialHours[dayKey].sections.morning = [{ start: sTime, end: eTime }]
								} else if (startHour < 17) {
									initialHours[dayKey].sections.afternoon = [{ start: sTime, end: eTime }]
								} else {
									initialHours[dayKey].sections.evening = [{ start: sTime, end: eTime }]
								}
							}

							if (typeof item.slot_duration_mins === 'number' && item.slot_duration_mins > 0) {
								initialHours[dayKey].slotDuration = item.slot_duration_mins
							}
						}
					})
				}

				const hasAvailability =
					Array.isArray(backendSchedules) &&
					backendSchedules.some((item) => item.is_available && item.start_time && item.end_time)

				const authoritativeData: NurseAvailabilityData = {
					isAvailable: hasAvailability,
					weeklyWorkingHours: initialHours,
				}
				setIsAvailable(hasAvailability)
				setWeeklyWorkingHours(authoritativeData.weeklyWorkingHours)
				savedDataRef.current = authoritativeData
			} catch (e) {
				console.log('[Nurse AvailabilityTab] failed to load availability:', e)
				setStatusModal({
					visible: true,
					status: 'error',
					title: 'Load Failed',
					description: extractApiErrorMessage(e),
				})
			} finally {
				setLoading(false)
			}
		}
		loadAvailability()
	}, [])

	// This tab stays mounted inside the profile pager alongside the other
	// tabs, so switching away and back does not remount it. Discard any
	// unsaved draft the moment the tab loses focus, same as the other
	// ancillary profile tabs (see CapabilitiesTab).
	const wasActiveRef = useRef(isActive)
	useEffect(() => {
		const wasActive = wasActiveRef.current
		wasActiveRef.current = isActive
		if (wasActive && !isActive) {
			setIsAvailable(savedDataRef.current.isAvailable)
			setWeeklyWorkingHours(savedDataRef.current.weeklyWorkingHours)
		}
	}, [isActive])

	const selectedWorkingHours = weeklyWorkingHours[selectedWorkingDay]

	const addSlot = (sectionKey: keyof SectionSlots) => {
		setWeeklyWorkingHours((prev) => {
			const current = prev[selectedWorkingDay]
			const slots = current.sections[sectionKey]
			if (slots.length >= 3) return prev

			const previousEnd = slots[slots.length - 1].end
			const [endHour, endMinute] = previousEnd.split(':').map(Number)
			const newEndMins = endHour * 60 + endMinute + current.slotDuration
			const section = SECTION_META.find((item) => item.key === sectionKey)!
			const clampedMins = Math.min(newEndMins, section.endHour * 60)
			const newEnd = `${String(Math.floor(clampedMins / 60)).padStart(2, '0')}:${String(clampedMins % 60).padStart(2, '0')}`

			return {
				...prev,
				[selectedWorkingDay]: {
					...current,
					sections: {
						...current.sections,
						[sectionKey]: [...slots, { start: previousEnd, end: newEnd }],
					},
				},
			}
		})
	}

	const removeSlot = (sectionKey: keyof SectionSlots, slotIndex: number) => {
		setWeeklyWorkingHours((prev) => {
			const current = prev[selectedWorkingDay]
			if (slotIndex === 0) return prev

			return {
				...prev,
				[selectedWorkingDay]: {
					...current,
					sections: {
						...current.sections,
						[sectionKey]: current.sections[sectionKey].filter((_, index) => index !== slotIndex),
					},
				},
			}
		})
	}

	const updateSlotTime = (
		sectionKey: keyof SectionSlots,
		slotIndex: number,
		field: 'start' | 'end',
		value: string
	) => {
		setWeeklyWorkingHours((prev) => {
			const current = prev[selectedWorkingDay]

			return {
				...prev,
				[selectedWorkingDay]: {
					...current,
					sections: {
						...current.sections,
						[sectionKey]: current.sections[sectionKey].map((slot, index) =>
							index === slotIndex ? { ...slot, [field]: value } : slot
						),
					},
				},
			}
		})
	}


	const handleSave = async () => {
		try {
			setSaving(true)

			// Format weekly availabilities payload for Phase 1 Backend API
			const daysMap: Record<WorkingDayKey, ProviderAvailabilityDay['day_of_week']> = {
				monday: 'MONDAY',
				tuesday: 'TUESDAY',
				wednesday: 'WEDNESDAY',
				thursday: 'THURSDAY',
				friday: 'FRIDAY',
				saturday: 'SATURDAY',
				sunday: 'SUNDAY',
			}

			const availabilities: ProviderAvailabilityDay[] = []

			for (const dayKey of Object.keys(weeklyWorkingHours) as WorkingDayKey[]) {
				const dayData = weeklyWorkingHours[dayKey]
				const allSlots = [
					...(dayData?.sections.morning || []),
					...(dayData?.sections.afternoon || []),
					...(dayData?.sections.evening || []),
				]

				if (allSlots.length > 0) {
					const firstSlot = allSlots[0]
					const lastSlot = allSlots[allSlots.length - 1]
					if (firstSlot?.start && lastSlot?.end) {
						availabilities.push({
							day_of_week: daysMap[dayKey],
							start_time: firstSlot.start,
							end_time: lastSlot.end,
							slot_duration_mins: dayData?.slotDuration || 30,
						})
					}
				}
			}

			const saveResult = await saveProviderWeeklyAvailability({ availabilities })

			// Update savedDataRef only after backend save succeeds
			const hasSavedSlots = availabilities.length > 0
			setIsAvailable(hasSavedSlots)
			savedDataRef.current = { isAvailable: hasSavedSlots, weeklyWorkingHours }

			setStatusModal({
				visible: true,
				status: 'success',
				title: 'Schedule Saved',
				description: saveResult?.message || '',
			})
		} catch (e) {
			console.log('[Nurse AvailabilityTab] failed to save availability:', e)
			setStatusModal({
				visible: true,
				status: 'error',
				title: 'Save Failed',
				description: extractApiErrorMessage(e),
			})
		} finally {
			setSaving(false)
		}
	}

	if (loading) {
		return (
			<View style={styles.center}>
				<ActivityIndicator size="small" color={PRIMARY} />
			</View>
		)
	}

	return (
		<View style={{ flex: 1 }}>
			<ScrollView
				style={styles.container}
				contentContainerStyle={[
					styles.contentContainer,
					{ paddingHorizontal: sectionPadding, paddingTop: sectionPadding, paddingBottom: 100 },
				]}
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
			>
				<View style={[styles.contentShell, { maxWidth: contentWidth }]}>
					{/* ── Working hours ── */}
					<View style={styles.card}>
						<AppTypography variant="h4" style={styles.title}>
							Working Hours
						</AppTypography>
						<AppTypography variant="body" style={styles.subtitle}>
							Define specific days and time intervals when you are available. This is optional if you
							only want to use your availability status.
						</AppTypography>

						<WorkingHoursSection
							title={null}
							selectedWorkingDay={selectedWorkingDay}
							onWorkingDayChange={setSelectedWorkingDay}
							showAppointmentType={false}
							showSlotDuration={false}
							selectedWorkingHours={selectedWorkingHours}
							onAddSlot={addSlot}
							onRemoveSlot={removeSlot}
							onUpdateSlotTime={updateSlotTime}
							stacked={isMobile}
						/>
					</View>
				</View>
			</ScrollView>

			<AppStickyFooter
				centered
				contentStyle={styles.footerContent}
				contentMaxWidth={typeof contentWidth === 'number' ? contentWidth : undefined}
				onPress={handleSave}
				loading={saving}
				disabled={saving}
			>
				Save Details
			</AppStickyFooter>

			{statusModal && (
				<StatusModal
					visible={statusModal.visible}
					status={statusModal.status}
					title={statusModal.title}
					description={statusModal.description}
					submitText="OK"
					onSubmit={() => {
						setStatusModal(null)
						if (onNextTab) {
							onNextTab()
						}
					}}
					onCancel={() => setStatusModal(null)}
				/>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f8fafc',
	},
	contentContainer: {
		flexGrow: 1,
		alignItems: 'center',
	},
	contentShell: {
		width: '100%',
	},
	center: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#f8fafc',
	},
	card: {
		backgroundColor: '#ffffff',
		borderWidth: 1,
		borderColor: '#eceeee',
		borderRadius: 12,
		padding: 16,
		marginBottom: 16,
	},
	title: {
		color: '#191c1d',
		fontWeight: '700',
		marginBottom: 4,
	},
	subtitle: {
		fontSize: 13,
		color: '#62707a',
		lineHeight: 18,
		marginBottom: 16,
	},
	footerContent: {
		width: '100%',
	},
})
