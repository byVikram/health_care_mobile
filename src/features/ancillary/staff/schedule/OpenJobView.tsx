// src/features/ancillary/staff/schedule/OpenJobView.tsx
//
// "Open job" of the ancillary schedule design (S3 / S4 / S5): a booking nobody has taken yet. What the care is, who and where, the
// services, and - for a booking of several days - "Pick your days": take all of them or only the days that fit (a day that clashes
// with her schedule starts unticked). Footer: "Not for me" and "Pick up N days". The job comes from providerOpenJobsService
// (GET /provider/me/open-jobs), so this view opens only once there is a job to show.
import React, { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { AppButton, AppFooterBar, AppPathIcon, AppScreenHeader } from '../../../../components/common'
import { APP_COLORS, formatInr } from '../../../../config/theme'
import { TAB_BAR_CLEARANCE } from '../../../../navigation/tabBar'
import { formatKm, formatTimeSlot } from '../../../../utils/formatters'
import type { OpenJob } from '../../providerOpenJobsService'
import { longDay } from './scheduleModel'
import { PATHS, SCH } from './scheduleTheme'

type Props = {
	job: OpenJob
	busy: boolean
	/** Space the footer keeps clear of the floating tab bar. */
	bottomClearance: number
	onBack: () => void
	/** The picked days (YYYY-MM-DD). */
	onAccept: (dates: string[]) => void
	onDecline: () => void
}

const toMinutes = (hhmm: string) => {
	const m = /^(\d{1,2}):(\d{2})/.exec(hhmm)
	return m ? Number(m[1]) * 60 + Number(m[2]) : 0
}

const endOf = (start: string, minutes: number) => {
	const t = toMinutes(start) + minutes
	return formatTimeSlot(`${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`)
}

export function OpenJobView({ job, busy, bottomClearance, onBack, onAccept, onDecline }: Props) {
	const multi = job.days.length > 1
	const free = useMemo(() => job.days.filter((d) => !d.clash).map((d) => d.date), [job])
	const [picked, setPicked] = useState<string[]>(free)

	const allFree = free.length === job.days.length
	const careName = job.services[0]?.name ?? 'Care visit'
	const care = job.services.length > 1 ? job.services.map((s) => s.name).join(', ') : careName
	const first = job.days[0]
	const plan = multi
		? `${job.days.length} days · ${formatTimeSlot(first?.startTime)} · ${job.minutesPerVisit} min each`
		: `${longDay(first?.date ?? '')} · ${formatTimeSlot(first?.startTime)} · ${job.minutesPerVisit} min`
	const toggle = (date: string) => setPicked((p) => (p.includes(date) ? p.filter((x) => x !== date) : [...p, date]))
	const n = picked.length
	const acceptLabel =
		n === 0
			? 'Pick at least one day'
			: !multi
				? 'Pick up visit'
				: n === job.days.length
					? `Pick up all ${n} days`
					: `Pick up ${n} ${n === 1 ? 'day' : 'days'}`

	return (
		<View style={styles.root}>
			<AppScreenHeader
				variant="bar"
				solid
				title="Open job"
				subtitle={job.postedAgo ? `${job.postedAgo} · first to pick up gets it` : 'First to pick up gets it'}
				onBack={onBack}
				backAccessibilityLabel="Back to schedule"
				style={styles.header}
			/>
			<ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomClearance + 130 }]}>
				<View style={styles.card}>
					<Text style={styles.care}>{care}</Text>
					<View style={[styles.kind, { backgroundColor: multi ? APP_COLORS.mint : SCH.released }]}>
						<Text style={[styles.kindText, { color: multi ? APP_COLORS.primary : SCH.body }]}>
							{multi ? `Scheduled · ${job.days.length}-day booking` : 'Scheduled · single visit'}
						</Text>
					</View>
					<Text style={styles.plan}>{plan}</Text>
					<View style={styles.facts}>
						<Fact icon={PATHS.user} bold text={`${job.patientName} · ${job.ageGender}`} />
						<Fact
							icon={PATHS.pin}
							text={[job.area, job.distanceKm != null ? `${formatKm(job.distanceKm)} km` : null]
								.filter(Boolean)
								.join(' · ')}
						/>
						{!!job.bookedBy && <Fact icon={PATHS.user} text={job.bookedBy} />}
					</View>
					{!!job.note && (
						<Text style={styles.note}>
							<Text style={styles.bold}>Care note · </Text>
							{job.note}
						</Text>
					)}
					<Text style={styles.fee}>
						{job.feePerVisit != null
							? `${formatInr(job.feePerVisit)} per visit · paid after each visit`
							: 'Paid after each visit'}
					</Text>
				</View>

				<View style={styles.card}>
					<View style={styles.rowBetween}>
						<Text
							style={styles.h3}
						>{`${job.services.length} ${job.services.length === 1 ? 'service' : 'services'} in each visit`}</Text>
						<Text style={styles.muted}>{`${job.minutesPerVisit} min total`}</Text>
					</View>
					{job.services.map((s) => (
						<View key={s.name} style={styles.svcRow}>
							<AppPathIcon d={PATHS.check} size={16} strokeWidth={2.6} color={APP_COLORS.primary} />
							<Text style={styles.svcName}>{s.name}</Text>
							<Text style={styles.muted}>{`${s.minutes} min`}</Text>
						</View>
					))}
				</View>

				<View style={styles.card}>
					<View style={styles.rowBetween}>
						<Text style={styles.h3}>{multi ? 'Pick your days' : 'Visit'}</Text>
						{multi && (
							<TouchableOpacity
								onPress={() => setPicked(allFree ? job.days.map((d) => d.date) : free)}
								accessibilityRole="button"
							>
								<Text style={styles.quick}>{allFree ? 'Select all' : 'Only free days'}</Text>
							</TouchableOpacity>
						)}
					</View>
					{multi && (
						<Text style={styles.muted}>Take all of them, or only the days that fit your schedule.</Text>
					)}
					<View accessibilityRole="list" style={styles.days}>
						{job.days.map((d, i) => {
							const on = picked.includes(d.date)
							return (
								<TouchableOpacity
									key={d.date}
									onPress={() => toggle(d.date)}
									activeOpacity={0.8}
									accessibilityRole="checkbox"
									accessibilityState={{ checked: on }}
									style={[
										styles.day,
										{
											borderColor: d.clash
												? SCH.clashBorder
												: on
													? APP_COLORS.mintAccent
													: APP_COLORS.divider,
											backgroundColor: d.clash
												? SCH.clashBg
												: on
													? '#F0F7F7'
													: APP_COLORS.surface,
										},
									]}
								>
									<View
										style={[
											styles.box,
											{
												borderColor: on ? APP_COLORS.primary : '#9AAAAD',
												backgroundColor: on ? APP_COLORS.primary : APP_COLORS.surface,
											},
										]}
									>
										{on && (
											<AppPathIcon d={PATHS.check} size={14} strokeWidth={3} color="#FFFFFF" />
										)}
									</View>
									<View style={{ flex: 1, minWidth: 0, gap: 2 }}>
										<View style={styles.dayTop}>
											<Text style={styles.dayLabel}>{longDay(d.date)}</Text>
											<Text style={styles.dayN}>{`Day ${i + 1}`}</Text>
										</View>
										<Text
											style={styles.dayTime}
										>{`${formatTimeSlot(d.startTime)} – ${endOf(d.startTime, job.minutesPerVisit)}`}</Text>
										<View style={styles.dayStatus}>
											<AppPathIcon
												d={d.clash ? PATHS.warn : PATHS.check}
												size={14}
												strokeWidth={2.4}
												color={d.clash ? APP_COLORS.warning : APP_COLORS.primary}
											/>
											<Text
												style={[
													styles.dayStatusText,
													{ color: d.clash ? APP_COLORS.warning : APP_COLORS.primary },
												]}
											>
												{d.clash ?? 'You’re free'}
											</Text>
										</View>
									</View>
								</TouchableOpacity>
							)
						})}
					</View>
					<View style={styles.info}>
						<Text style={styles.infoText}>
							Days you don’t pick stay open for other nurses nearby. The family sees who is visiting on
							each day.
						</Text>
					</View>
				</View>
			</ScrollView>

			<View style={styles.footerWrap}>
				<AppFooterBar
					summary={{ text: multi ? `${n} of ${job.days.length} days selected` : '1 visit' }}
					bottomPadding={TAB_BAR_CLEARANCE}
				>
					<AppButton
						variant="outline"
						size="lg"
						style={styles.declineBtn}
						onPress={onDecline}
						disabled={busy}
					>
						Not for me
					</AppButton>
					<AppButton
						size="lg"
						style={styles.acceptBtn}
						loading={busy}
						disabled={n === 0 || busy}
						softDisabled
						onPress={() => onAccept(picked)}
					>
						{acceptLabel}
					</AppButton>
				</AppFooterBar>
			</View>
		</View>
	)
}

function Fact({ icon, text, bold }: { icon: string; text: string; bold?: boolean }) {
	return (
		<View style={styles.fact}>
			<AppPathIcon d={icon} size={16} strokeWidth={2.2} color={APP_COLORS.primary} />
			<Text style={[styles.factText, bold && styles.bold]}>{text}</Text>
		</View>
	)
}

const styles = StyleSheet.create({
	root: { flex: 1, backgroundColor: APP_COLORS.pageBg },
	header: { borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
	content: { padding: 16, gap: 12 },
	card: {
		padding: 14,
		gap: 10,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: SCH.cardBorder,
		backgroundColor: APP_COLORS.surface,
	},
	care: { fontSize: 17, lineHeight: 22, fontWeight: '700', color: APP_COLORS.ink },
	kind: { alignSelf: 'flex-start', height: 22, paddingHorizontal: 8, borderRadius: 6, justifyContent: 'center' },
	kindText: { fontSize: 12, fontWeight: '800' },
	plan: { fontSize: 13, lineHeight: 18, color: APP_COLORS.inkMuted },
	facts: { padding: 10, paddingHorizontal: 12, gap: 6, borderRadius: 10, backgroundColor: APP_COLORS.pageBg },
	fact: { flexDirection: 'row', alignItems: 'center', gap: 8 },
	factText: { flex: 1, fontSize: 13, lineHeight: 18, color: SCH.body },
	bold: { fontWeight: '700', color: APP_COLORS.ink },
	note: { fontSize: 13, lineHeight: 19, color: APP_COLORS.ink },
	fee: { fontSize: 12, lineHeight: 16, fontWeight: '700', color: APP_COLORS.primary },
	rowBetween: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
	h3: { fontSize: 15, lineHeight: 20, fontWeight: '700', color: APP_COLORS.ink },
	muted: { fontSize: 12, lineHeight: 16, fontWeight: '700', color: APP_COLORS.inkMuted },
	svcRow: {
		paddingVertical: 10,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		borderTopWidth: 1,
		borderTopColor: SCH.rule,
	},
	svcName: { flex: 1, fontSize: 14, fontWeight: '700', color: APP_COLORS.ink },
	quick: { fontSize: 13, fontWeight: '800', color: APP_COLORS.primary },
	days: { gap: 8 },
	day: {
		minHeight: 56,
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 12,
		borderWidth: 1.5,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	box: {
		width: 22,
		height: 22,
		borderRadius: 6,
		borderWidth: 2,
		alignItems: 'center',
		justifyContent: 'center',
	},
	dayTop: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
	dayLabel: { fontSize: 15, lineHeight: 20, fontWeight: '700', color: APP_COLORS.ink },
	dayN: { fontSize: 11, fontWeight: '700', color: APP_COLORS.inkMuted },
	dayTime: { fontSize: 13, lineHeight: 18, color: SCH.body },
	dayStatus: { flexDirection: 'row', alignItems: 'center', gap: 5 },
	dayStatusText: { fontSize: 12, lineHeight: 16, fontWeight: '700' },
	info: { padding: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: APP_COLORS.mint },
	infoText: { fontSize: 12, lineHeight: 17, color: APP_COLORS.ink },
	footerWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
	declineBtn: { flex: 1 },
	acceptBtn: { flex: 2 },
})
