import React, { useState } from 'react'
import {
	Modal,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../../../context/AuthContext'
import { USER_ROLES } from '../../../../constants/constants'
import { AppToggle } from '../../../../components/common'
import { AppTypography } from '../../../../components/common/AppTypography'

interface NurseAvailabilityCardProps {
	initialAvailable?: boolean
	initialStartTime?: string
	initialEndTime?: string
	onAvailabilityChange?: (isAvailable: boolean) => void
	onTimeChange?: (startTime: string, endTime: string) => void
	onManageSchedulePress?: () => void
}

const COMMON_START_TIMES = [
	'06:00 AM',
	'07:00 AM',
	'08:00 AM',
	'09:00 AM',
	'10:00 AM',
	'11:00 AM',
	'12:00 PM',
]

const COMMON_END_TIMES = [
	'02:00 PM',
	'04:00 PM',
	'05:00 PM',
	'06:00 PM',
	'07:00 PM',
	'08:00 PM',
	'09:00 PM',
	'10:00 PM',
]

export default function NurseAvailabilityCard({
	initialAvailable = true,
	initialStartTime = '8:00 AM',
	initialEndTime = '6:00 PM',
	onAvailabilityChange,
	onTimeChange,
	onManageSchedulePress,
}: NurseAvailabilityCardProps) {
	const { role } = useAuth()
	const { width } = useWindowDimensions()
	const isTablet = width >= 768

	const [isAvailable, setIsAvailable] = useState(initialAvailable)
	const [startTime, setStartTime] = useState(initialStartTime)
	const [endTime, setEndTime] = useState(initialEndTime)
	const [timeModalVisible, setTimeModalVisible] = useState(false)
	const [activeTimeEditing, setActiveTimeEditing] = useState<'start' | 'end'>('start')

	// Strict Role Guard: Only visible when logged-in user is a Nurse / Ancillary
	const isNurse = role === USER_ROLES.ANCILLARY || role === USER_ROLES.NURSE
	if (!isNurse) {
		return null
	}

	const handleToggle = (value: boolean) => {
		setIsAvailable(value)
		onAvailabilityChange?.(value)
	}

	const handleSelectTime = (selected: string) => {
		if (activeTimeEditing === 'start') {
			setStartTime(selected)
			onTimeChange?.(selected, endTime)
		} else {
			setEndTime(selected)
			onTimeChange?.(startTime, selected)
		}
		setTimeModalVisible(false)
	}

	const openTimeSelector = (type: 'start' | 'end') => {
		setActiveTimeEditing(type)
		setTimeModalVisible(true)
	}

	return (
		<View style={styles.cardContainer}>
			{/* Top Header Row: Title + Status Pill + Master Toggle */}
			<View style={styles.headerRow}>
				<View style={styles.titleWithStatusCol}>
					<View style={styles.titleRow}>
						<View style={styles.iconBox}>
							<Ionicons name="calendar" size={16} color="#0C7C7C" />
						</View>
						<AppTypography variant="h3" style={styles.sectionTitle}>
							Today's Availability
						</AppTypography>
					</View>

					{/* Live Status Pill */}
					<View
						style={[
							styles.statusPill,
							isAvailable ? styles.statusPillActive : styles.statusPillInactive,
						]}
					>
						<View
							style={[
								styles.statusDot,
								isAvailable ? styles.statusDotActive : styles.statusDotInactive,
							]}
						/>
						<AppTypography
							variant="caption"
							style={[
								styles.statusPillText,
								isAvailable ? styles.statusTextActive : styles.statusTextInactive,
							]}
						>
							{isAvailable ? 'Available' : 'Unavailable'}
						</AppTypography>
					</View>
				</View>

				{/* Availability Master Toggle */}
				<View style={styles.toggleBox}>
					<AppToggle
						value={isAvailable}
						onValueChange={handleToggle}
						showStatusText={false}
						size="small"
						activeColor="#0C7C7C"
						inactiveColor="#CBD5E1"
						accessibilityLabel="Toggle Today's Availability"
					/>
				</View>
			</View>

			{/* Center Divider */}
			<View style={styles.horizontalDivider} />

			{/* Time Range Selector Strip: Start Time -> End Time */}
			<View style={styles.timeControlsContainer}>
				{/* Start Time Field */}
				<TouchableOpacity
					style={[styles.timeBox, !isAvailable && styles.timeBoxDisabled]}
					onPress={() => isAvailable && openTimeSelector('start')}
					activeOpacity={0.75}
					disabled={!isAvailable}
				>
					<View style={styles.timeLabelRow}>
						<Ionicons name="sunny-outline" size={13} color={isAvailable ? '#D97706' : '#94A3B8'} />
						<AppTypography variant="caption" style={styles.timeLabel}>
							START TIME
						</AppTypography>
					</View>
					<View style={styles.timeValueRow}>
						<AppTypography
							variant="body"
							style={[styles.timeValueText, !isAvailable && styles.textDisabled]}
						>
							{startTime}
						</AppTypography>
						{isAvailable && <Ionicons name="chevron-down" size={13} color="#64748B" />}
					</View>
				</TouchableOpacity>

				{/* Arrow Divider */}
				<View style={styles.arrowBox}>
					<Ionicons
						name="arrow-forward"
						size={15}
						color={isAvailable ? '#0C7C7C' : '#CBD5E1'}
					/>
				</View>

				{/* End Time Field */}
				<TouchableOpacity
					style={[styles.timeBox, !isAvailable && styles.timeBoxDisabled]}
					onPress={() => isAvailable && openTimeSelector('end')}
					activeOpacity={0.75}
					disabled={!isAvailable}
				>
					<View style={styles.timeLabelRow}>
						<Ionicons name="moon-outline" size={13} color={isAvailable ? '#4F46E5' : '#94A3B8'} />
						<AppTypography variant="caption" style={styles.timeLabel}>
							END TIME
						</AppTypography>
					</View>
					<View style={styles.timeValueRow}>
						<AppTypography
							variant="body"
							style={[styles.timeValueText, !isAvailable && styles.textDisabled]}
						>
							{endTime}
						</AppTypography>
						{isAvailable && <Ionicons name="chevron-down" size={13} color="#64748B" />}
					</View>
				</TouchableOpacity>
			</View>

			{/* Footer Action: Manage Availability Link */}
			<View style={styles.footerRow}>
				<AppTypography variant="caption" style={styles.subHintText}>
					{isAvailable
						? `Receiving visits between ${startTime} – ${endTime}`
						: 'Turn on toggle to start receiving on-demand requests'}
				</AppTypography>

				<TouchableOpacity
					onPress={onManageSchedulePress}
					activeOpacity={0.7}
					style={styles.manageScheduleLink}
				>
					<AppTypography variant="caption" style={styles.manageLinkText}>
						Manage Availability
					</AppTypography>
					<Ionicons name="chevron-forward" size={13} color="#0C7C7C" />
				</TouchableOpacity>
			</View>

			{/* Simple Quick Time Selection Modal */}
			<Modal
				transparent
				visible={timeModalVisible}
				animationType="fade"
				onRequestClose={() => setTimeModalVisible(false)}
			>
				<TouchableOpacity
					style={styles.modalOverlay}
					activeOpacity={1}
					onPress={() => setTimeModalVisible(false)}
				>
					<View style={[styles.modalContent, isTablet && styles.modalContentTablet]}>
						<View style={styles.modalHeader}>
							<AppTypography variant="h3" style={styles.modalTitle}>
								Select {activeTimeEditing === 'start' ? 'Start Time' : 'End Time'}
							</AppTypography>
							<TouchableOpacity
								onPress={() => setTimeModalVisible(false)}
								style={styles.modalCloseBtn}
							>
								<Ionicons name="close" size={18} color="#64748B" />
							</TouchableOpacity>
						</View>

						<ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
							<View style={styles.timeOptionsGrid}>
								{(activeTimeEditing === 'start' ? COMMON_START_TIMES : COMMON_END_TIMES).map(
									(t) => {
										const isSelected =
											(activeTimeEditing === 'start' ? startTime : endTime) === t
										return (
											<TouchableOpacity
												key={t}
												style={[
													styles.timeOptionPill,
													isSelected && styles.timeOptionPillSelected,
												]}
												onPress={() => handleSelectTime(t)}
												activeOpacity={0.7}
											>
												<Ionicons
													name="time-outline"
													size={14}
													color={isSelected ? '#FFFFFF' : '#0C7C7C'}
												/>
												<AppTypography
													variant="body"
													style={[
														styles.timeOptionText,
														isSelected && styles.timeOptionTextSelected,
													]}
												>
													{t}
												</AppTypography>
											</TouchableOpacity>
										)
									}
								)}
							</View>
						</ScrollView>
					</View>
				</TouchableOpacity>
			</Modal>
		</View>
	)
}

const styles = StyleSheet.create({
	cardContainer: {
		backgroundColor: '#FFFFFF',
		borderColor: '#E2E8F0',
		borderWidth: 1,
		borderRadius: 14,
		padding: 12,
		shadowColor: '#0F172A',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.02,
		shadowRadius: 3,
		elevation: 1,
		gap: 10,
		flex: 1,
		justifyContent: 'space-between',
	},

	/* Header Row */
	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 8,
	},
	titleWithStatusCol: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		flexWrap: 'wrap',
		gap: 6,
		minWidth: 0,
	},
	titleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		flexShrink: 1,
	},
	iconBox: {
		width: 28,
		height: 28,
		borderRadius: 8,
		backgroundColor: '#E6F4F1',
		alignItems: 'center',
		justifyContent: 'center',
		flexShrink: 0,
	},
	sectionTitle: {
		fontSize: 14.5,
		fontWeight: '700',
		color: '#0F172A',
	},
	statusPill: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 7,
		paddingVertical: 2.5,
		borderRadius: 12,
		gap: 4,
		flexShrink: 0,
	},
	statusPillActive: {
		backgroundColor: '#ECFDF5',
		borderColor: '#A7F3D0',
		borderWidth: 1,
	},
	statusPillInactive: {
		backgroundColor: '#FEF2F2',
		borderColor: '#FECACA',
		borderWidth: 1,
	},
	statusDot: {
		width: 6,
		height: 6,
		borderRadius: 3,
	},
	statusDotActive: {
		backgroundColor: '#10B981',
	},
	statusDotInactive: {
		backgroundColor: '#EF4444',
	},
	statusPillText: {
		fontSize: 10.5,
		fontWeight: '700',
	},
	statusTextActive: {
		color: '#047857',
	},
	statusTextInactive: {
		color: '#B91C1C',
	},
	toggleBox: {
		flexShrink: 0,
	},

	/* Divider */
	horizontalDivider: {
		height: 1,
		backgroundColor: '#F1F5F9',
	},

	/* Time Range Controls */
	timeControlsContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	timeBox: {
		flex: 1,
		backgroundColor: '#F8FAFC',
		borderColor: '#E2E8F0',
		borderWidth: 1,
		borderRadius: 10,
		paddingHorizontal: 8,
		paddingVertical: 7,
		gap: 3,
		minWidth: 0,
	},
	timeBoxDisabled: {
		backgroundColor: '#F1F5F9',
		borderColor: '#E2E8F0',
		opacity: 0.65,
	},
	timeLabelRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	timeLabel: {
		fontSize: 9,
		fontWeight: '800',
		color: '#64748B',
		letterSpacing: 0.4,
		textTransform: 'uppercase',
	},
	timeValueRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	timeValueText: {
		fontSize: 13,
		fontWeight: '700',
		color: '#0F172A',
	},
	textDisabled: {
		color: '#94A3B8',
	},
	arrowBox: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 2,
		flexShrink: 0,
	},

	/* Footer Row */
	footerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		flexWrap: 'wrap',
		gap: 6,
		marginTop: 2,
	},
	subHintText: {
		fontSize: 11,
		color: '#64748B',
		flex: 1,
		minWidth: 130,
	},
	manageScheduleLink: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 2,
		paddingVertical: 2,
		flexShrink: 0,
	},
	manageLinkText: {
		fontSize: 11.5,
		fontWeight: '700',
		color: '#0C7C7C',
	},

	/* Time Selection Modal */
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(15, 23, 42, 0.45)',
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 20,
	},
	modalContent: {
		width: '100%',
		maxWidth: 380,
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		padding: 16,
		shadowColor: '#0F172A',
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.2,
		shadowRadius: 16,
		elevation: 10,
	},
	modalContentTablet: {
		maxWidth: 420,
		padding: 20,
	},
	modalHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 12,
	},
	modalTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#0F172A',
	},
	modalCloseBtn: {
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: '#F1F5F9',
		alignItems: 'center',
		justifyContent: 'center',
	},
	timeOptionsGrid: {
		gap: 8,
	},
	timeOptionPill: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		backgroundColor: '#F8FAFC',
		borderColor: '#E2E8F0',
		borderWidth: 1,
		borderRadius: 10,
		paddingHorizontal: 14,
		paddingVertical: 10,
	},
	timeOptionPillSelected: {
		backgroundColor: '#0C7C7C',
		borderColor: '#0C7C7C',
	},
	timeOptionText: {
		fontSize: 13.5,
		fontWeight: '600',
		color: '#0F172A',
	},
	timeOptionTextSelected: {
		color: '#FFFFFF',
		fontWeight: '700',
	},
})
