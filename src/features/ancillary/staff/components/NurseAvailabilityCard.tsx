import React, { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../../../context/AuthContext'
import { USER_ROLES } from '../../../../constants/constants'
import { AppToggle } from '../../../../components/common'
import { AppTypography } from '../../../../components/common/AppTypography'

interface NurseAvailabilityCardProps {
	initialAvailable?: boolean
	onAvailabilityChange?: (isAvailable: boolean) => void
}

export default function NurseAvailabilityCard({
	initialAvailable = true,
	onAvailabilityChange,
}: NurseAvailabilityCardProps) {
	const { role } = useAuth()
	const [isAvailable, setIsAvailable] = useState(initialAvailable)

	React.useEffect(() => {
		setIsAvailable(initialAvailable)
	}, [initialAvailable])

	// Strict Role Guard: Only visible when logged-in user is a Nurse / Ancillary
	const isNurse = role === USER_ROLES.ANCILLARY || role === USER_ROLES.NURSE
	if (!isNurse) {
		return null
	}

	const handleToggle = (value: boolean) => {
		setIsAvailable(value)
		onAvailabilityChange?.(value)
	}

	return (
		<View style={styles.cardContainer}>
			{/* Top Header Row: Title + Status Pill + Master Toggle */}
			<View style={styles.headerRow}>
				<View style={styles.titleWithStatusCol}>
					<View style={styles.titleRow}>
						<View style={[styles.iconBox, isAvailable ? styles.iconBoxActive : styles.iconBoxInactive]}>
							<Ionicons name={isAvailable ? 'pulse' : 'moon-outline'} size={18} color={isAvailable ? '#0C7C7C' : '#64748B'} />
						</View>
						<AppTypography variant="h3" style={styles.sectionTitle}>
							Duty Availability
						</AppTypography>
					</View>

					{/* Live Status Pill & Subtitle */}
					<View style={styles.statusMetaRow}>
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
								{isAvailable ? 'ONLINE & AVAILABLE' : 'OFFLINE / ON BREAK'}
							</AppTypography>
						</View>
					</View>

					<AppTypography variant="caption" style={styles.dutySubtitle}>
						{isAvailable
							? '⚡ Receiving instant patient dispatch alerts nearby'
							: '🌙 Dispatch paused. Switch ON to receive patient requests'}
					</AppTypography>
				</View>

				{/* Availability Master Toggle Switch */}
				<View style={styles.toggleBox}>
					<AppToggle
						value={isAvailable}
						onValueChange={handleToggle}
						showStatusText={false}
						size="small"
						activeColor="#0C7C7C"
						inactiveColor="#CBD5E1"
						accessibilityLabel="Toggle Nurse Availability Status"
					/>
				</View>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	cardContainer: {
		backgroundColor: '#FFFFFF',
		borderColor: '#E2E8F0',
		borderWidth: 1,
		borderRadius: 14,
		padding: 14,
		shadowColor: '#0F172A',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.02,
		shadowRadius: 3,
		elevation: 1,
	},
	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 12,
	},
	titleWithStatusCol: {
		flex: 1,
		gap: 6,
	},
	titleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	iconBox: {
		width: 32,
		height: 32,
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
	},
	iconBoxActive: {
		backgroundColor: '#E6F4F1',
	},
	iconBoxInactive: {
		backgroundColor: '#F1F5F9',
	},
	sectionTitle: {
		fontSize: 15,
		fontWeight: '700',
		color: '#0F172A',
	},
	statusMetaRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 2,
	},
	statusPill: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 12,
		gap: 5,
	},
	statusPillActive: {
		backgroundColor: '#ECFDF5',
		borderColor: '#A7F3D0',
		borderWidth: 1,
	},
	statusPillInactive: {
		backgroundColor: '#F1F5F9',
		borderColor: '#E2E8F0',
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
		backgroundColor: '#94A3B8',
	},
	statusPillText: {
		fontSize: 10,
		fontWeight: '700',
	},
	statusTextActive: {
		color: '#047857',
	},
	statusTextInactive: {
		color: '#64748B',
	},
	dutySubtitle: {
		fontSize: 11,
		color: '#64748B',
		marginTop: 2,
	},
	toggleBox: {
		flexShrink: 0,
	},
})
