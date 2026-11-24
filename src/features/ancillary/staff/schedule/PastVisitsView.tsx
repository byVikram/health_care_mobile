// src/features/ancillary/staff/schedule/PastVisitsView.tsx
//
// "Past" of the ancillary schedule design: the visits before today, a day per card (newest first) with a status pill on each row
// (Completed, Patient not home, Cancelled by family, Released by you). A Filters button opens the shared filter sheet (Date,
// Service type, Visit status; "Custom dates" adds From / To), next to a patient-name search; older days load six at a time.
import React, { useMemo, useState } from 'react'
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { AppButton, AppFilterSheet, AppPathIcon, type AppFilterGroup } from '../../../../components/common'
import { APP_COLORS } from '../../../../config/theme'
import {
	DEFAULT_PAST_FILTERS,
	PAST_RANGES,
	PAST_STATE_PILL,
	PAST_STATUSES,
	PAST_TYPES,
	buildPast,
	pastFilterCount,
	pastSubline,
	type PastFilters,
	type PastRangeKey,
	type PastStatusKey,
	type PastTypeKey,
	type ScheduleVisit,
} from './scheduleModel'
import { ScheduleCard, TimeColumn } from './ScheduleVisitRow'
import { PATHS, SCH } from './scheduleTheme'
import { usePastVisits } from './usePastVisits'

const DAYS_PER_PAGE = 6

const GROUPS: AppFilterGroup[] = [
	{
		key: 'range',
		label: 'Date',
		title: 'Date',
		hint: 'When the visit happened',
		multi: false,
		options: PAST_RANGES.map((r) => ({ value: r.id, label: r.label })),
	},
	{
		key: 'type',
		label: 'Type',
		title: 'Service type',
		hint: 'Instant or scheduled visit',
		multi: false,
		options: PAST_TYPES.map((t) => ({ value: t.id, label: t.label })),
	},
	{
		key: 'status',
		label: 'Visit status',
		title: 'Visit status',
		hint: 'How the visit ended',
		multi: false,
		options: PAST_STATUSES.map((s) => ({ value: s.id, label: s.label })),
	},
]

type Props = {
	today: string
	onOpenVisit: (visit: ScheduleVisit) => void
}

export function PastVisitsView({ today, onOpenVisit }: Props) {
	const [filters, setFilters] = useState<PastFilters>(DEFAULT_PAST_FILTERS)
	const [sheetOpen, setSheetOpen] = useState(false)
	const [pages, setPages] = useState(1)

	const { visits, loading, error } = usePastVisits(filters, today)
	const past = useMemo(() => buildPast(visits, filters, today), [visits, filters, today])
	const shown = past.days.slice(0, pages * DAYS_PER_PAGE)
	const filterCount = pastFilterCount(filters)
	const rangeLabel = PAST_RANGES.find((r) => r.id === filters.range)?.label ?? ''

	const set = (patch: Partial<PastFilters>) => {
		setFilters((f) => ({ ...f, ...patch }))
		setPages(1)
	}

	return (
		<View style={styles.root}>
			<View>
				<Text style={styles.title}>Past visits</Text>
				<Text
					style={styles.sub}
				>{`${past.total} ${past.total === 1 ? 'visit' : 'visits'} · ${rangeLabel}`}</Text>
			</View>

			<View style={styles.tools}>
				<TouchableOpacity
					onPress={() => setSheetOpen(true)}
					activeOpacity={0.8}
					accessibilityRole="button"
					accessibilityLabel="Filters"
					style={[styles.filterBtn, filterCount > 0 && styles.filterBtnOn]}
				>
					<AppPathIcon
						d={PATHS.filter}
						size={16}
						strokeWidth={2.2}
						color={filterCount > 0 ? APP_COLORS.primary : APP_COLORS.ink}
					/>
					<Text style={[styles.filterText, filterCount > 0 && { color: APP_COLORS.primary }]}>Filters</Text>
					{filterCount > 0 && (
						<View style={styles.badge}>
							<Text style={styles.badgeText}>{filterCount}</Text>
						</View>
					)}
				</TouchableOpacity>
				<View style={styles.search}>
					<AppPathIcon d={PATHS.search} size={18} strokeWidth={2.2} color={APP_COLORS.inkMuted} />
					<TextInput
						value={filters.needle}
						onChangeText={(needle) => set({ needle })}
						placeholder="Search patient name"
						placeholderTextColor={APP_COLORS.inkMuted}
						autoCorrect={false}
						returnKeyType="search"
						accessibilityLabel="Search past visits"
						style={styles.searchInput}
					/>
				</View>
			</View>

			{shown.map((day) => (
				<ScheduleCard key={day.iso}>
					<View style={styles.dayHead}>
						<Text style={styles.dayTitle}>{day.title}</Text>
						<Text style={styles.dayMeta}>{day.meta}</Text>
					</View>
					{day.rows.map((v) => {
						const pill = PAST_STATE_PILL[v.state === 'active' ? 'done' : v.state]
						return (
							<TouchableOpacity
								key={v.key}
								onPress={() => onOpenVisit(v)}
								disabled={!v.visitId}
								activeOpacity={0.7}
								accessibilityRole="button"
								accessibilityLabel={`${v.patientName}, ${pill.label}`}
								style={styles.row}
							>
								<TimeColumn startTime={v.startTime} color={APP_COLORS.ink} />
								<View style={styles.mid}>
									<Text style={styles.name} numberOfLines={1}>
										{v.patientName}
									</Text>
									<Text style={styles.subline} numberOfLines={1}>
										{pastSubline(v)}
									</Text>
								</View>
								<View style={[styles.pill, { backgroundColor: pill.bg }]}>
									<Text style={[styles.pillText, { color: pill.ink }]} numberOfLines={1}>
										{pill.label}
									</Text>
								</View>
								<AppPathIcon d={PATHS.chevronRight} size={16} strokeWidth={2.4} color={SCH.faint} />
							</TouchableOpacity>
						)
					})}
				</ScheduleCard>
			))}

			{past.days.length === 0 && loading && (
				<View style={styles.empty}>
					<Text style={styles.emptyText}>Loading your past visits…</Text>
				</View>
			)}

			{past.days.length === 0 && !loading && !!error && (
				<View style={styles.empty}>
					<Text style={styles.emptyText}>{error}</Text>
				</View>
			)}

			{past.days.length === 0 && !loading && !error && (
				<View style={styles.empty}>
					<Text style={styles.emptyText}>No visits match these filters.</Text>
				</View>
			)}

			{past.days.length > shown.length && (
				<AppButton variant="outline" onPress={() => setPages((p) => p + 1)}>
					Show older visits
				</AppButton>
			)}

			<AppFilterSheet
				visible={sheetOpen}
				groups={GROUPS}
				selected={(key) => [key === 'range' ? filters.range : key === 'type' ? filters.type : filters.status]}
				count={(key) =>
					key === 'range'
						? filters.range !== DEFAULT_PAST_FILTERS.range
							? 1
							: 0
						: key === 'type'
							? filters.type !== 'all'
								? 1
								: 0
							: filters.status !== 'all'
								? 1
								: 0
				}
				onSelect={(key, value) =>
					key === 'range'
						? set({ range: value as PastRangeKey })
						: key === 'type'
							? set({ type: value as PastTypeKey })
							: set({ status: value as PastStatusKey })
				}
				onClearAll={() => set({ ...DEFAULT_PAST_FILTERS, needle: filters.needle })}
				onClose={() => setSheetOpen(false)}
				applyLabel={`Show ${past.total} ${past.total === 1 ? 'visit' : 'visits'}`}
				renderGroupExtra={(key) =>
					key === 'range' && filters.range === 'custom' ? (
						<View style={styles.customDates}>
							<View style={styles.dateField}>
								<Text style={styles.dateLabel}>From</Text>
								<TextInput
									value={filters.from}
									onChangeText={(from) => set({ from })}
									placeholder="YYYY-MM-DD"
									placeholderTextColor={APP_COLORS.inkMuted}
									autoCorrect={false}
									style={styles.dateInput}
								/>
							</View>
							<View style={styles.dateField}>
								<Text style={styles.dateLabel}>To</Text>
								<TextInput
									value={filters.to}
									onChangeText={(to) => set({ to })}
									placeholder="YYYY-MM-DD"
									placeholderTextColor={APP_COLORS.inkMuted}
									autoCorrect={false}
									style={styles.dateInput}
								/>
							</View>
						</View>
					) : null
				}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	root: { gap: 12 },
	title: { fontSize: 17, lineHeight: 22, fontWeight: '700', color: APP_COLORS.ink },
	sub: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	tools: { flexDirection: 'row', alignItems: 'center', gap: 8 },
	filterBtn: {
		height: 46,
		paddingHorizontal: 14,
		borderRadius: 12,
		borderWidth: 1.5,
		borderColor: APP_COLORS.divider,
		backgroundColor: APP_COLORS.surface,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	filterBtnOn: { borderColor: APP_COLORS.primary, backgroundColor: '#F0F7F7' },
	filterText: { fontSize: 13, fontWeight: '700', color: APP_COLORS.ink },
	badge: {
		minWidth: 18,
		height: 18,
		paddingHorizontal: 5,
		borderRadius: 9,
		backgroundColor: APP_COLORS.primary,
		alignItems: 'center',
		justifyContent: 'center',
	},
	badgeText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },
	search: {
		flex: 1,
		minWidth: 0,
		height: 46,
		paddingHorizontal: 14,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		backgroundColor: APP_COLORS.surface,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	searchInput: { flex: 1, minWidth: 0, height: 42, padding: 0, fontSize: 15, color: APP_COLORS.ink },
	dayHead: { marginVertical: 10, flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
	dayTitle: { fontSize: 12, lineHeight: 16, fontWeight: '800', letterSpacing: 0.7, color: APP_COLORS.inkMuted },
	dayMeta: { fontSize: 12, lineHeight: 16, fontWeight: '700', color: APP_COLORS.inkMuted },
	row: {
		paddingVertical: 11,
		borderTopWidth: 1,
		borderTopColor: SCH.rule,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	mid: { flex: 1, minWidth: 0 },
	name: { fontSize: 14, lineHeight: 19, fontWeight: '700', color: APP_COLORS.ink },
	subline: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	pill: { height: 22, paddingHorizontal: 8, borderRadius: 6, justifyContent: 'center' },
	pillText: { fontSize: 11, fontWeight: '800' },
	empty: {
		padding: 32,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: SCH.cardBorder,
		backgroundColor: APP_COLORS.surface,
		alignItems: 'center',
	},
	emptyText: { fontSize: 13, color: APP_COLORS.inkMuted },
	customDates: { flexDirection: 'row', gap: 10, paddingTop: 12 },
	dateField: { flex: 1, gap: 4 },
	dateLabel: { fontSize: 12, fontWeight: '700', color: APP_COLORS.inkMuted },
	dateInput: {
		height: 46,
		paddingHorizontal: 12,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		backgroundColor: APP_COLORS.surface,
		fontSize: 14,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
})
