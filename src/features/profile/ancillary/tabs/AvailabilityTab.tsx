import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
	AppStickyFooter,
	AppTypography,
	StatusModal,
	WorkingHoursSection,
	SECTION_META,
	createWorkingHoursState,
	type WorkingDayKey,
	type SectionSlots,
	type WorkingHoursState,
} from '../../../../components/common'
import {
	saveProviderWeeklyAvailability,
	saveProviderDateOverride,
	fetchProviderWeeklyAvailabilityBackend,
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

const STORAGE_KEY = 'ancillary_availability_v2'

const PRIMARY = '#2B6F71'

const createWeeklyWorkingHours = (): Record<WorkingDayKey, WorkingHoursState> => ({
	sunday: createWorkingHoursState(),
	monday: createWorkingHoursState(),
	tuesday: createWorkingHoursState(),
	wednesday: createWorkingHoursState(),
	thursday: createWorkingHoursState(),
	friday: createWorkingHoursState(),
	saturday: createWorkingHoursState(),
})

const DEFAULT_DATA: NurseAvailabilityData = {
	isAvailable: true,
	weeklyWorkingHours: createWeeklyWorkingHours(),
}


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
	const [isAvailable, setIsAvailable] = useState(DEFAULT_DATA.isAvailable)
	const [selectedWorkingDay, setSelectedWorkingDay] = useState<WorkingDayKey>('monday')
	const [weeklyWorkingHours, setWeeklyWorkingHours] = useState(DEFAULT_DATA.weeklyWorkingHours)
	const savedDataRef = useRef<NurseAvailabilityData>(DEFAULT_DATA)
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

				// 1. Initial cached/fallback values
				let initialHours = createWeeklyWorkingHours()
				try {
					const stored = await AsyncStorage.getItem(STORAGE_KEY)
					if (stored) {
						const parsed: NurseAvailabilityData = JSON.parse(stored)
						initialHours = {
							...initialHours,
							...parsed.weeklyWorkingHours,
						}
					}
				} catch (e) {}

				// 2. Fetch authoritative schedules from Backend API
				try {
					const backendSchedules = await fetchProviderWeeklyAvailabilityBackend()
					if (Array.isArray(backendSchedules) && backendSchedules.length > 0) {
						const dayMap: Record<ProviderAvailabilityDay['day_of_week'], WorkingDayKey> = {
							MONDAY: 'monday',
							TUESDAY: 'tuesday',
							WEDNESDAY: 'wednesday',
							THURSDAY: 'thursday',
							FRIDAY: 'friday',
							SATURDAY: 'saturday',
							SUNDAY: 'sunday',
						}

						backendSchedules.forEach((item) => {
							const dayKey = dayMap[item.day_of_week]
							if (dayKey && item.is_available) {
								const sTime = item.start_time || '08:00'
								const eTime = item.end_time || '17:00'
								const startH = Number(sTime.split(':')[0]) || 8
								if (startH < 12) {
									initialHours[dayKey].sections.morning = [{ start: sTime, end: eTime }]
								} else if (startH < 17) {
									initialHours[dayKey].sections.afternoon = [{ start: sTime, end: eTime }]
								} else {
									initialHours[dayKey].sections.evening = [{ start: sTime, end: eTime }]
								}
								if (item.slot_duration_mins) {
									initialHours[dayKey].slotDuration = item.slot_duration_mins
								}
							}
						})
					}
				} catch (e) {
					console.log('[Nurse AvailabilityTab] backend fetch error:', e)
				}

				const normalized: NurseAvailabilityData = {
					isAvailable: true,
					weeklyWorkingHours: initialHours,
				}
				setIsAvailable(true)
				setWeeklyWorkingHours(normalized.weeklyWorkingHours)
				savedDataRef.current = normalized
			} catch (e) {
				console.log('[Nurse AvailabilityTab] failed to load availability:', e)
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
			const payload: NurseAvailabilityData = { isAvailable, weeklyWorkingHours }
			await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
			savedDataRef.current = payload

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

			const availabilities: ProviderAvailabilityDay[] = (Object.keys(weeklyWorkingHours) as WorkingDayKey[]).map((dayKey) => {
				const dayData = weeklyWorkingHours[dayKey]
				const hasSlots = Boolean(
					dayData?.sections.morning?.length ||
					dayData?.sections.afternoon?.length ||
					dayData?.sections.evening?.length
				)
				const morningSlot = dayData.sections.morning?.[0]
				return {
					day_of_week: daysMap[dayKey],
					is_available: hasSlots,
					start_time: morningSlot?.start || '09:00',
					end_time: morningSlot?.end || '17:00',
					slot_duration_mins: dayData.slotDuration || 30,
					break_start_time: '13:00',
					break_end_time: '14:00',
				}
			})

			await saveProviderWeeklyAvailability({ availabilities })

			setStatusModal({
				visible: true,
				status: 'success',
				title: 'Schedule Saved',
				description: 'Your availability schedule has been saved successfully.',
			})
		} catch (e) {
			console.log('[Nurse AvailabilityTab] failed to save availability:', e)
			setStatusModal({
				visible: true,
				status: 'info',
				title: 'Schedule Saved',
				description: 'Availability saved locally.',
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
