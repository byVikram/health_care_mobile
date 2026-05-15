import React from 'react'
import { Image, StyleSheet, View } from 'react-native'
import { AppTypography } from '../../../components/common'
import InfoBlock from './InfoBlock'

const TEAL = '#0c7c7c'
const TEXT = '#111827'
const MUTED = '#64707d'
const BORDER = '#e5eaef'
const SURFACE = '#ffffff'

export type MobileAppointmentRow = {
	id: string
	patientName: string
	patientAvatar: string
	doctorName?: string
	doctorAvatar?: string
	appointmentDate: string
	startTime: string
	endTime: string | null
	appointmentMode: string
	status: string
	hospitalName: string | null
}

type AppMobileAPTProps = {
	row: MobileAppointmentRow
	displayRole?: 'doctor' | 'patient'
}

const getInitial = (name: string) => name.trim().charAt(0).toUpperCase() || 'P'

const formatDate = (value: string) => {
	if (!value) return '-'
	const parsed = new Date(value)
	if (Number.isNaN(parsed.getTime())) return value

	return parsed.toLocaleDateString(undefined, {
		month: 'short',
		day: '2-digit',
		year: 'numeric',
	})
}

const formatMode = (value: string) => {
	if (!value) return '-'
	return value.replace(/_/g, ' ').toLowerCase()
}

const statusColors = (status: string) => {
	const normalized = status.toLowerCase()
	if (normalized.includes('confirm') || normalized.includes('complete')) {
		return { color: '#087f5b', backgroundColor: '#e8f7f1' }
	}
	if (normalized.includes('cancel') || normalized.includes('reject')) {
		return { color: '#b42318', backgroundColor: '#fff1f0' }
	}
	if (normalized.includes('pending')) {
		return { color: '#946200', backgroundColor: '#fff7df' }
	}
	return { color: TEAL, backgroundColor: '#edfafa' }
}

function PersonCell({ row, displayRole = 'doctor' }: AppMobileAPTProps) {
	const name = displayRole === 'patient' ? row.doctorName || 'Unknown doctor' : row.patientName
	const avatar = displayRole === 'patient' ? row.doctorAvatar : row.patientAvatar

	return (
		<View style={styles.personCell}>
			{avatar ? (
				<Image source={{ uri: avatar }} style={styles.avatar} />
			) : (
				<View style={styles.avatarFallback}>
					<AppTypography style={styles.avatarText}>{getInitial(name)}</AppTypography>
				</View>
			)}

			<View style={styles.personTextWrap}>
				<AppTypography style={styles.personName} numberOfLines={1}>
					{name}
				</AppTypography>
			</View>
		</View>
	)
}

function StatusPill({ status }: { status: string }) {
	const colors = statusColors(status)
	return (
		<View style={[styles.statusPill, colors]}>
			<AppTypography style={[styles.statusText, { color: colors.color }]} numberOfLines={1}>
				{status}
			</AppTypography>
		</View>
	)
}

export default function AppMobileAPT({ row, displayRole = 'doctor' }: AppMobileAPTProps) {
	return (
		<View style={styles.mobileCard}>
			<View style={styles.mobileCardTop}>
				<PersonCell row={row} displayRole={displayRole} />
				<StatusPill status={row.status} />
			</View>

			<View style={styles.mobileDivider} />

			<View style={styles.mobileGrid}>
				<InfoBlock icon="calendar-blank-outline" label="Date" value={formatDate(row.appointmentDate)} />
				<InfoBlock
					icon="clock-outline"
					label="Time"
					value={`${row.startTime || '-'}${row.endTime ? ` - ${row.endTime}` : ''}`}
				/>
				<InfoBlock icon="video-outline" label="Mode" value={formatMode(row.appointmentMode)} capitalize />
				<InfoBlock icon="hospital-building" label="Hospital" value={row.hospitalName ?? '-'} />
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	mobileCard: {
		backgroundColor: SURFACE,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: BORDER,
		padding: 14,
		marginBottom: 12,
	},
	mobileCardTop: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	personCell: {
		flex: 1,
		minWidth: 0,
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 4,
	},
	avatar: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: '#d9eeee',
		marginRight: 12,
	},
	avatarFallback: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: TEAL,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 12,
	},
	avatarText: {
		fontSize: 14,
		lineHeight: 18,
		fontWeight: '700',
		color: '#ffffff',
	},
	personTextWrap: {
		flex: 1,
		minWidth: 0,
	},
	personName: {
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '700',
		color: TEXT,
	},
	statusPill: {
		borderRadius: 999,
		paddingHorizontal: 10,
		paddingVertical: 5,
		alignSelf: 'flex-start',
		maxWidth: '100%',
	},
	statusText: {
		fontSize: 12,
		lineHeight: 14,
		fontWeight: '700',
		textTransform: 'capitalize',
	},
	mobileDivider: {
		height: 1,
		backgroundColor: BORDER,
		marginVertical: 12,
	},
	mobileGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		marginHorizontal: -6,
		marginBottom: -10,
	},
})
