// src/features/ancillary/staff/availability/ProviderAvailabilityTabs.tsx
//
// The two content tabs of the provider availability screen (nurse design 5):
//   WeeklyHoursTab    -- day strip, per-day switch + time ranges, "Copy to all weekdays", visit length, travel radius
//   OverridesTab      -- leave / different-hours dates with edit + remove, and "Add date override"
// Both are driven by useProviderAvailability(); the screen owns the sheets and the Save footer.
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { AppButton, AppChipGroup, AppFormCard, AppFormField, AppToggle } from '../../../../components/common'
import { APP_COLORS } from '../../../../config/theme'
import { DayStrip } from '../../../profile/availability/components/DayStrip'
import { DaySections } from '../../../profile/availability/components/DaySections'
import { OverrideList } from '../../../profile/availability/components/OverrideList'
import { DAY_FULL, daySummary, isDayOn, type DateOverride } from '../../../profile/availability/availabilityUtils'
import { formatUnit } from '../../../profile/config/ancillaryProfileConfig'
import type { useProviderAvailability } from './useProviderAvailability'

type Availability = ReturnType<typeof useProviderAvailability>

export function WeeklyHoursTab({ a }: { a: Availability }) {
	const { draft, day, config } = a
	if (!draft) return null
	const dayOn = isDayOn(draft.week[day])
	return (
		<>
			<AppFormCard
				title="Weekly hours"
				helper="Pick a day, then add one or more times in the morning, afternoon or evening."
			>
				<DayStrip week={draft.week} selected={day} onSelect={a.setDay} />
				<View style={styles.dayHead}>
					<View style={styles.flex}>
						<Text style={styles.dayTitle}>{DAY_FULL[day]}</Text>
						<Text style={styles.daySub}>{daySummary(draft.week[day])}</Text>
					</View>
					<AppToggle
						value={dayOn}
						onValueChange={a.toggleDay}
						accessibilityLabel={`Available on ${DAY_FULL[day]}`}
					/>
				</View>
				{dayOn ? (
					<>
						<DaySections day={draft.week[day]} onChange={a.changeDay} />
						<AppButton variant="outline" size="md" icon="content-copy" onPress={a.copyToWeekdays}>
							Copy to all weekdays
						</AppButton>
					</>
				) : (
					<Text style={styles.offText}>No bookings on {DAY_FULL[day]}s. Turn on to add hours.</Text>
				)}
			</AppFormCard>

			<AppFormCard title={config.unitLabel}>
				<AppChipGroup
					options={config.unitOptions.map((m) => ({ value: String(m), label: formatUnit(m) }))}
					values={[String(draft.unit)]}
					onChange={(v) => v[0] && a.setUnit(Number(v[0]))}
					single
					accessibilityLabel={config.unitLabel}
				/>
				<AppFormField label="How far I travel">
					<AppChipGroup
						options={config.travelOptions.map((km) => ({ value: String(km), label: `${km} km` }))}
						values={[String(draft.travel)]}
						onChange={(v) => v[0] && a.setTravel(Number(v[0]))}
						single
						accessibilityLabel="How far I travel"
					/>
				</AppFormField>
			</AppFormCard>
		</>
	)
}

export function OverridesTab({
	a,
	onAdd,
	onEdit,
	onRemove,
}: {
	a: Availability
	onAdd: () => void
	onEdit: (o: DateOverride) => void
	onRemove: (o: DateOverride) => void
}) {
	return (
		<AppFormCard
			title="Leave & date overrides"
			helper="Take a day off or change hours for one date. Weekly hours stay the same."
		>
			<OverrideList overrides={a.overrides} offLabel="On leave" onEdit={onEdit} onRemove={onRemove} />
			<AppButton variant="outline" size="md" icon="calendar-plus" onPress={onAdd}>
				Add date override
			</AppButton>
		</AppFormCard>
	)
}

const styles = StyleSheet.create({
	flex: {
		flex: 1,
	},
	dayHead: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	dayTitle: {
		fontSize: 16,
		lineHeight: 22,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	daySub: {
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.inkMuted,
	},
	offText: {
		fontSize: 13,
		lineHeight: 18,
		color: APP_COLORS.inkMuted,
	},
})
