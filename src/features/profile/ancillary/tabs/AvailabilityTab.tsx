import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
	AppStickyFooter,
	AppToggle,
	AppTypography,
	WorkingHoursSection,
	SECTION_META,
	createWorkingHoursState,
	type WorkingDayKey,
	type SectionSlots,
	type WorkingHoursState,
} from '../../../../components/common'

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

	useEffect(() => {
		const loadAvailability = async () => {
			try {
				setLoading(true)
				const stored = await AsyncStorage.getItem(STORAGE_KEY)
				const parsed: NurseAvailabilityData = stored ? JSON.parse(stored) : DEFAULT_DATA
				// Guard against a stored payload missing a day (e.g. schema changed).
				const normalized: NurseAvailabilityData = {
					isAvailable: parsed.isAvailable ?? true,
					weeklyWorkingHours: {
						...createWeeklyWorkingHours(),
						...parsed.weeklyWorkingHours,
					},
				}
				setIsAvailable(normalized.isAvailable)
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
			Alert.alert('Saved', 'Availability saved successfully')
			if (onNextTab) {
				onNextTab()
			}
		} catch (e) {
			console.log('[Nurse AvailabilityTab] failed to save availability:', e)
			Alert.alert('Error', 'Failed to save availability')
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
					{/* ── Availability status ── */}
					<View style={styles.card}>
						<AppTypography variant="h4" style={styles.title}>
							Availability
						</AppTypography>

						<AppTypography variant="body" style={styles.subtitle}>
							Set your availability status to let patients know whether you are currently available for
							bookings.
						</AppTypography>

						<View style={styles.toggleRow}>
							<AppTypography variant="body" style={styles.toggleLabel}>
								{isAvailable ? "I'm Available" : "I'm not Available"}
							</AppTypography>
							<AppToggle
								value={isAvailable}
								onValueChange={setIsAvailable}
								showStatusText={false}
								size="small"
								activeColor={PRIMARY}
								inactiveColor="#d8e0ea"
								accessibilityLabel="I'm Available"
							/>
						</View>
					</View>

					{/* ── Optional working hours (reuses the doctor-profile working-hours UI) ── */}
					<View style={styles.card}>
						<AppTypography variant="h4" style={styles.title}>
							Working Hours (Optional)
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
	toggleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 12,
	},
	toggleLabel: {
		color: '#1f2b33',
		fontWeight: '600',
	},
})
