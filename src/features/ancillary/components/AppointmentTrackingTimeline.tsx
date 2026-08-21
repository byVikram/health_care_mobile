import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

export interface TrackingStage {
	key: string
	label: string
	time?: string
}

interface AppointmentTrackingTimelineProps {
	stages: TrackingStage[]
	activeIndex: number
}

export default function AppointmentTrackingTimeline({ stages, activeIndex }: AppointmentTrackingTimelineProps) {
	return (
		<View>
			{stages.map((stage, index) => {
				const isLast = index === stages.length - 1
				// The final stage has no subsequent stage to advance to, so once it's
				// reached (activeIndex has caught up to it) it means that stage itself
				// is done -- not "in progress" -- and should render as completed too.
				const isCompleted = isLast ? index <= activeIndex : index < activeIndex
				const isActive = !isCompleted && index === activeIndex

				return (
					<View key={stage.key} style={styles.row}>
						<View style={styles.dotColumn}>
							<View
								style={[
									styles.dot,
									isCompleted && styles.dotCompleted,
									isActive && styles.dotActive,
								]}
							>
								{isCompleted ? (
									<Ionicons name="checkmark" size={13} color="#ffffff" />
								) : isActive ? (
									<View style={styles.activeInnerDot} />
								) : null}
							</View>
							{!isLast && (
								<View style={[styles.line, isCompleted && styles.lineCompleted]} />
							)}
						</View>

						<View style={[styles.textColumn, !isLast && styles.textColumnSpacing]}>
							<Text
								style={[
									styles.label,
									isActive && styles.labelActive,
									!isCompleted && !isActive && styles.labelPending,
								]}
							>
								{stage.label}
							</Text>
							{stage.time ? <Text style={styles.time}>{stage.time}</Text> : null}
						</View>
					</View>
				)
			})}
		</View>
	)
}

const styles = StyleSheet.create({
	row: {
		flexDirection: 'row',
	},
	dotColumn: {
		alignItems: 'center',
		width: 24,
	},
	dot: {
		width: 24,
		height: 24,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#ffffff',
		borderWidth: 2,
		borderColor: '#bfc8c8',
	},
	dotCompleted: {
		backgroundColor: '#2B6F71',
		borderColor: '#2B6F71',
	},
	dotActive: {
		backgroundColor: '#ffffff',
		borderColor: '#2B6F71',
	},
	activeInnerDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: '#2B6F71',
	},
	line: {
		width: 2,
		flex: 1,
		minHeight: 28,
		backgroundColor: '#e1e3e3',
		marginVertical: 2,
	},
	lineCompleted: {
		backgroundColor: '#2B6F71',
	},
	textColumn: {
		flex: 1,
		marginLeft: 12,
		paddingBottom: 4,
	},
	textColumnSpacing: {
		paddingBottom: 20,
	},
	label: {
		fontSize: 14,
		fontWeight: '600',
		color: '#191c1d',
	},
	labelActive: {
		color: '#2B6F71',
		fontWeight: '700',
	},
	labelPending: {
		color: '#8a9494',
		fontWeight: '600',
	},
	time: {
		fontSize: 12,
		color: '#3f4849',
		marginTop: 2,
	},
})
