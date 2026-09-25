import React from 'react'
import { LayoutAnimation, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppTypography } from '../../../../components/common'
import { openOnMap } from '../../../../utils/maps'
import type { SlotGroup } from '../../doctorService'
import { DETAIL_PRIMARY } from './constants'
import { DoctorSlotPicker } from './DoctorSlotPicker'
import type { AppointmentModeKey, HospitalEntry } from './types'

interface HospitalAppointmentCardProps {
	entry: HospitalEntry
	isExpanded: boolean
	onToggleExpand: () => void
	apptType: 'offline' | 'video' | null
	onAppointmentTypeChange: (type: AppointmentModeKey) => void
	selectedDate: Date
	onDateChange: (date: Date) => void
	selectedTime: string | null
	onTimeChange: (time: string) => void
	availableSlots: SlotGroup[]
	slotsLoading: boolean
	selectedAppointmentType: AppointmentModeKey
}

// Cycled purely for visual variety across clinic cards -- same tone palette
// used elsewhere in the doctor-search/detail screens this pass.
const ICON_TONES = [
	{ bg: '#E3EFEF', ink: DETAIL_PRIMARY },
	{ bg: '#FDE8DC', ink: '#B4532A' },
	{ bg: '#DDEBFA', ink: '#2463A8' },
	{ bg: '#ECE6FA', ink: '#6A4BB5' },
]

function toneForHospital(id: string) {
	let hash = 0
	for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
	return ICON_TONES[hash % ICON_TONES.length]
}

export function HospitalAppointmentCard({
	entry,
	isExpanded,
	onToggleExpand,
	apptType,
	onAppointmentTypeChange,
	selectedDate,
	onDateChange,
	selectedTime,
	onTimeChange,
	availableSlots,
	slotsLoading,
	selectedAppointmentType,
}: HospitalAppointmentCardProps) {
	const { hospital, offline_consultation_fee, video_consultation_fee, available_days } = entry

	const fee = apptType === 'video' ? Number(video_consultation_fee) || 0 : Number(offline_consultation_fee) || 0
	const feeSuffix = apptType === 'video' ? 'per call' : 'per visit'
	const tone = toneForHospital(hospital.id)

	const handleToggle = () => {
		LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
		onToggleExpand()
	}

	return (
		<TouchableOpacity
			activeOpacity={0.9}
			onPress={handleToggle}
			style={[styles.hospitalCard, isExpanded && styles.hospitalCardExpanded]}
		>
			<View style={styles.hospitalCardHeader}>
				<View style={[styles.hospitalIconBox, { backgroundColor: tone.bg }]}>
					<MaterialCommunityIcons name="hospital-building" size={22} color={tone.ink} />
				</View>
				<View style={{ flex: 1, marginLeft: 12 }}>
					<AppTypography variant="body" style={styles.hospitalName} numberOfLines={1}>
						{hospital.name}
					</AppTypography>
					<AppTypography variant="caption" style={styles.greyText} numberOfLines={1}>
						{hospital.address || 'Address not available'}
						{hospital.distance ? ` · ${hospital.distance}` : ''}
					</AppTypography>
				</View>
				<View style={{ alignItems: 'flex-end' }}>
					<AppTypography variant="body" style={styles.feeText}>
						{fee > 0 ? `₹${fee}` : '--'}
					</AppTypography>
					<AppTypography variant="caption" style={styles.feeSuffixText}>
						{feeSuffix}
					</AppTypography>
				</View>
				<MaterialCommunityIcons
					name={isExpanded ? 'chevron-up' : 'chevron-down'}
					size={22}
					color="#999"
					style={{ marginLeft: 8 }}
				/>
			</View>

			{isExpanded && (
				<View style={styles.expandedContent} onStartShouldSetResponder={() => true}>
					<DoctorSlotPicker
						onAppointmentTypeChange={onAppointmentTypeChange}
						offlineFee={Number(offline_consultation_fee) || 0}
						videoFee={Number(video_consultation_fee) || 0}
						selectedDate={selectedDate}
						onDateChange={onDateChange}
						selectedTime={selectedTime}
						onTimeChange={onTimeChange}
						availableSlots={availableSlots}
						slotsLoading={slotsLoading}
						selectedAppointmentType={selectedAppointmentType}
						availableDays={available_days}
					/>

					<View style={styles.expandedActionsRow}>
						<TouchableOpacity
							style={styles.actionButton}
							onPress={(e) => {
								e.stopPropagation()
								openOnMap(hospital.address, hospital.name)
							}}
						>
							<MaterialCommunityIcons
								name="navigation-variant-outline"
								size={18}
								color={DETAIL_PRIMARY}
							/>
							<Text style={styles.actionButtonText}>Directions</Text>
						</TouchableOpacity>

						{!!hospital.contact_number && (
							<TouchableOpacity
								style={styles.actionButton}
								onPress={(e) => {
									e.stopPropagation()
									Linking.openURL(`tel:${hospital.contact_number}`).catch(() => {})
								}}
							>
								<MaterialCommunityIcons name="phone-outline" size={18} color={DETAIL_PRIMARY} />
								<Text style={styles.actionButtonText}>Call Hospital</Text>
							</TouchableOpacity>
						)}
					</View>
				</View>
			)}
		</TouchableOpacity>
	)
}

const styles = StyleSheet.create({
	hospitalCard: {
		borderRadius: 16,
		backgroundColor: '#F5F8F8',
		marginBottom: 12,
		padding: 14,
		overflow: 'hidden',
	},
	hospitalCardExpanded: {
		borderWidth: 1,
		borderColor: DETAIL_PRIMARY,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.06,
		shadowRadius: 6,
		elevation: 2,
	},
	hospitalCardHeader: {
		flexDirection: 'row',
		alignItems: 'flex-start',
	},
	hospitalIconBox: {
		width: 44,
		height: 44,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
	},
	hospitalName: {
		fontWeight: 'bold',
		color: '#333',
		fontSize: 14,
		marginRight: 8,
	},
	feeText: {
		color: '#333',
		fontWeight: '800',
		fontSize: 15,
	},
	feeSuffixText: {
		color: '#888',
		fontSize: 11,
		fontWeight: '600',
	},
	greyText: { color: '#888' },
	expandedContent: {
		marginTop: 16,
		paddingTop: 16,
		borderTopWidth: 1,
		borderTopColor: '#f0f0f0',
	},
	expandedActionsRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 16,
		paddingTop: 12,
		borderTopWidth: 1,
		borderTopColor: '#f0f0f0',
	},
	actionButton: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 6,
		paddingHorizontal: 8,
	},
	actionButtonText: {
		marginLeft: 6,
		color: DETAIL_PRIMARY,
		fontWeight: '600',
		fontSize: 13,
	},
})
