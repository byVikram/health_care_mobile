// src/features/ancillary/staff/schedule/OpenJobsSection.tsx
//
// The two "no nurse has this yet" cards of the ancillary schedule design:
//   - NEEDED NOW: instant requests and unfilled visits (Take),
//   - OPEN NEAR YOU: bookings nearby for the picked day (Pick up, opens the booking to choose days).
// The jobs come from providerOpenJobsService (GET /provider/me/open-jobs), so the card does not
// show until there is something to take.
import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { AppPathIcon } from '../../../../components/common'
import { APP_COLORS } from '../../../../config/theme'
import type { OpenJob } from '../../providerOpenJobsService'
import { timeParts } from './scheduleModel'
import { ScheduleCard, SubLine, TimeColumn } from './ScheduleVisitRow'
import { PATHS, SCH } from './scheduleTheme'

type Props = {
	kind: 'needed' | 'nearby'
	jobs: OpenJob[]
	/** The picked day, YYYY-MM-DD (which day of a multi-day booking this row is about). */
	day: string
	onPick: (job: OpenJob) => void
}

const firstTime = (job: OpenJob, day: string) =>
	job.days.find((d) => d.date === day)?.startTime ?? job.days[0]?.startTime ?? ''

export function OpenJobsSection({ kind, jobs, day, onPick }: Props) {
	if (jobs.length === 0) return null
	const needed = kind === 'needed'
	return (
		<ScheduleCard
			accessibilityLabel={needed ? 'Needed now' : 'Open near you'}
			title={`${needed ? 'NEEDED NOW' : 'OPEN NEAR YOU'} · ${jobs.length}`}
			subtitle={
				needed
					? 'No nurse has taken these yet · first to tap Take gets it'
					: 'Patients nearby still need a nurse for this day · first to pick up gets it'
			}
			titleColor={needed ? SCH.instantInk : APP_COLORS.inkMuted}
			borderColor={needed ? SCH.neededBorder : SCH.cardBorder}
			icon={needed ? PATHS.bolt : PATHS.pin}
		>
			{jobs.map((job) => {
				const instant = job.kind === 'instant'
				const start = firstTime(job, day)
				const idx = job.days.findIndex((d) => d.date === day)
				const clash = job.days[idx]?.clash
				const note = needed
					? instant
						? `Waiting ${job.waiting ?? '1 min'} · arrive by ${timeParts(start).time} ${timeParts(start).ampm}`
						: `Scheduled for ${timeParts(start).time} ${timeParts(start).ampm} · still unfilled`
					: `${job.days.length > 1 ? `Day ${idx + 1} of ${job.days.length}-day booking` : 'Single visit'}${clash ? ` · ${clash}` : ''}`
				const careName = job.services[0]?.name ?? 'Care visit'
				const care = job.services.length > 1 ? `${careName} + ${job.services.length - 1} more` : careName
				return (
					<View key={job.id} style={styles.row}>
						<View style={styles.main}>
							<TimeColumn
								startTime={needed && instant ? '' : start}
								color={needed ? SCH.instantInk : APP_COLORS.ink}
							/>
							<View style={styles.mid}>
								<Text style={styles.name} numberOfLines={1}>
									{job.patientName}
								</Text>
								<SubLine instant={instant} text={[job.area, care].filter(Boolean).join(' · ')} />
							</View>
							<TouchableOpacity
								onPress={() => onPick(job)}
								activeOpacity={0.8}
								style={styles.action}
								accessibilityRole="button"
								accessibilityLabel={`${needed ? 'Take' : 'Pick up'} · ${job.patientName}`}
							>
								<View style={styles.actionCircle}>
									<AppPathIcon
										d={needed ? PATHS.bolt : PATHS.chevronRight}
										size={18}
										strokeWidth={2.4}
										color="#FFFFFF"
									/>
								</View>
								<Text style={styles.actionLabel}>{needed ? 'Take' : 'Pick up'}</Text>
							</TouchableOpacity>
						</View>
						<Text
							style={[
								styles.note,
								{ color: needed ? SCH.instantInk : clash ? APP_COLORS.warning : APP_COLORS.inkMuted },
							]}
						>
							{note}
						</Text>
					</View>
				)
			})}
		</ScheduleCard>
	)
}

const styles = StyleSheet.create({
	row: { gap: 6, paddingVertical: 12, borderTopWidth: 1, borderTopColor: SCH.rule },
	main: { flexDirection: 'row', alignItems: 'center', gap: 12 },
	mid: { flex: 1, minWidth: 0, gap: 2 },
	name: { fontSize: 15, lineHeight: 20, fontWeight: '700', color: APP_COLORS.ink },
	action: { width: 56, alignItems: 'center', gap: 3 },
	actionCircle: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: APP_COLORS.primary,
		alignItems: 'center',
		justifyContent: 'center',
	},
	actionLabel: { fontSize: 11, lineHeight: 13, fontWeight: '800', color: APP_COLORS.primary },
	note: { marginLeft: 68, fontSize: 12, lineHeight: 16, fontWeight: '700' },
})
