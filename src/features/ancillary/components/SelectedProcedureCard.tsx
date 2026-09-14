import React from 'react'
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { AppTypography } from '../../../components/common'
import { ServiceProcedureItem } from './AllServiceCard'
import { getAncillaryImageSource } from '../utils/ancillaryImageResolver'
import RecurringVisitCalendar, { AvailableTimeSlotsSource, RecurringVisitSchedule } from './RecurringVisitCalendar'

export interface SelectedProcedureCardProps {
	service: ServiceProcedureItem
	showDelete: boolean
	onRemove: () => void
	expanded: boolean
	onToggleExpand: () => void
	schedule: RecurringVisitSchedule
	onScheduleChange: (next: RecurringVisitSchedule) => void
	/**
	 * Optional pass-through for real/date-aware time-slot availability once
	 * a backend source exists. Falls back to RecurringVisitCalendar's own
	 * mock slots when omitted.
	 */
	availableTimeSlots?: AvailableTimeSlotsSource
}

/**
 * A single self-contained card for one selected procedure/service inside the
 * Booking Details "Selected Procedures" section.
 *
 * Each card owns its own expand/collapse UI state (controlled by the parent)
 * and, when expanded, renders the shared `RecurringVisitCalendar` bound to
 * this service's own schedule -- so scheduling for one service never
 * affects another.
 */
export default function SelectedProcedureCard({
	service,
	showDelete,
	onRemove,
	expanded,
	onToggleExpand,
	schedule,
	onScheduleChange,
	availableTimeSlots,
}: SelectedProcedureCardProps) {
	return (
		<View style={styles.card}>
			<View style={styles.row}>
				<Image source={getAncillaryImageSource(service.image_url || service.imageUrl || service.image)} style={styles.thumb} resizeMode="cover" />

				<View style={styles.textCol}>
					<AppTypography variant="h4" style={styles.title} numberOfLines={1}>
						{service.title || (service as any).label || (service as any).name || ''}
					</AppTypography>
					<AppTypography variant="caption" style={styles.desc} numberOfLines={2}>
						{service.description}
					</AppTypography>
					<View style={styles.durationPill}>
						<Ionicons name="time-outline" size={12} color="#546E7A" />
						<AppTypography variant="caption" style={styles.durationText}>
							{service.duration || '30-45 mins'}
						</AppTypography>
					</View>
				</View>

				{/* RIGHT-END VERTICAL STACK -- top to bottom: delete icon, price, Configure Visits */}
				<View style={styles.rightCol}>
					{showDelete ? (
						<TouchableOpacity
							onPress={onRemove}
							activeOpacity={0.7}
							hitSlop={8}
							style={styles.actionIcon}
							accessibilityLabel={`Remove ${service.title}`}
						>
							<Ionicons name="trash-outline" size={17} color="#D32F2F" />
						</TouchableOpacity>
					) : (
						<View style={styles.actionIcon} />
					)}

					<AppTypography variant="h4" style={styles.price}>
						{service.price}
					</AppTypography>

					<TouchableOpacity
						onPress={onToggleExpand}
						activeOpacity={0.7}
						hitSlop={8}
						style={styles.configureVisitsBtn}
						accessibilityLabel={expanded ? `Collapse ${service.title} visit schedule` : `Expand ${service.title} visit schedule`}
						accessibilityRole="button"
					>
						<AppTypography variant="caption" style={styles.configureVisitsText} numberOfLines={1}>
							Configure Visits
						</AppTypography>
						<Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={19} color="#2B6F71" />
					</TouchableOpacity>
				</View>
			</View>

			{expanded ? (
				<View style={styles.expandedSection}>
					<RecurringVisitCalendar schedule={schedule} onChange={onScheduleChange} availableTimeSlots={availableTimeSlots} />
				</View>
			) : null}
		</View>
	)
}

const styles = StyleSheet.create({
	card: {
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		borderWidth: 1,
		borderColor: '#E2E8F0',
		padding: 12,
	},
	row: {
		flexDirection: 'row',
		gap: 10,
		alignItems: 'stretch',
	},
	thumb: {
		width: 72,
		height: 72,
		borderRadius: 12,
		backgroundColor: '#F1F5F9',
	},
	textCol: {
		flex: 1,
		gap: 4,
		justifyContent: 'flex-start',
	},
	title: {
		fontSize: 15,
		fontWeight: '700',
		color: '#0F172A',
	},
	desc: {
		fontSize: 12.5,
		color: '#64748B',
		lineHeight: 17,
	},
	rightCol: {
		alignItems: 'flex-end',
		justifyContent: 'space-between',
		gap: 6,
	},
	actionIcon: {
		padding: 2,
	},
	durationPill: {
		flexDirection: 'row',
		alignItems: 'center',
		alignSelf: 'flex-start',
		gap: 4,
		backgroundColor: '#F1F5F9',
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 6,
		marginTop: 2,
	},
	durationText: {
		fontSize: 11.5,
		color: '#475569',
		fontWeight: '500',
	},
	price: {
		fontSize: 16,
		fontWeight: '700',
		color: '#0F172A',
	},
	configureVisitsBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 3,
		padding: 2,
	},
	configureVisitsText: {
		fontSize: 11.5,
		fontWeight: '600',
		color: '#2B6F71',
	},
	expandedSection: {
		marginTop: 12,
		paddingTop: 12,
		borderTopWidth: 1,
		borderTopColor: '#F1F5F9',
	},
})
