// src/features/ancillary/staff/ProviderSchedulePage.tsx
//
// Provider "Schedule" tab (floating tab bar) = the availability screen of the nurse design ("My availability"):
//   Weekly hours      -- per-day hours, visit length, travel radius (Save button, see useProviderAvailability)
//   Leave & overrides -- dates off / different hours (immediate save, with a booked-visits warning)
//   Bookings          -- the provider's scheduled bookings with accept / decline (ProviderScheduledOrdersSection);
//                        a third tab beside the design's two so that list stays reachable.
import React, { useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { useRoute } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
	AppButton,
	AppConfirmSheet,
	AppScreenHeader,
	AppSegmentedControl,
	AppSkeleton,
	StatusModal,
} from '../../../components/common'
import { APP_COLORS } from '../../../config/theme'
import { FLOATING_TAB_BAR_BOTTOM, FLOATING_TAB_BAR_HEIGHT, useTabBarClearance } from '../../../navigation/tabBar'
import { OverrideSheet } from '../../profile/availability/components/OverrideSheet'
import type { DateOverride } from '../../profile/availability/availabilityUtils'
import { ProviderScheduledOrdersSection } from './components/ProviderScheduledOrdersSection'
import { OverridesTab, WeeklyHoursTab } from './availability/ProviderAvailabilityTabs'
import { useProviderAvailability } from './availability/useProviderAvailability'

type Tab = 'week' | 'dates' | 'bookings'

const TABS: { value: Tab; label: string }[] = [
	{ value: 'week', label: 'Weekly hours' },
	{ value: 'dates', label: 'Leave & overrides' },
	{ value: 'bookings', label: 'Bookings' },
]

export default function ProviderSchedulePage() {
	const insets = useSafeAreaInsets()
	const tabBarClearance = useTabBarClearance()
	const route = useRoute()
	// Deep links (notifications) that ask for the request / all lists land on Bookings.
	const segment = (route.params as { segment?: string } | undefined)?.segment
	const [tab, setTab] = useState<Tab>(segment === 'req' || segment === 'all' ? 'bookings' : 'week')

	const a = useProviderAvailability()
	const { form } = a
	const [sheet, setSheet] = useState<{ initial: DateOverride | null } | null>(null)
	const [removing, setRemoving] = useState<DateOverride | null>(null)

	// The Save bar floats just above the tab-bar pill.
	const footerBottom = FLOATING_TAB_BAR_BOTTOM + FLOATING_TAB_BAR_HEIGHT + insets.bottom
	const showSave = tab === 'week' && !form.loading && !form.loadError
	const saveLabel = a.invalid ? 'Fix the highlighted times' : form.dirty ? 'Save availability' : 'No changes to save'

	return (
		<View style={styles.page}>
			<AppScreenHeader
				variant="bar"
				title="My availability"
				subtitle="Patients book only the times you open here"
				showBack={false}
			/>
			<View style={styles.tabs}>
				<AppSegmentedControl
					options={TABS}
					value={tab}
					onChange={setTab}
					shape="rounded"
					tabs
					accessibilityLabel="Schedule view"
				/>
			</View>

			{tab === 'bookings' ? (
				<ScrollView
					contentContainerStyle={[styles.bookings, { paddingBottom: tabBarClearance + 8 }]}
					showsVerticalScrollIndicator={false}
				>
					<ProviderScheduledOrdersSection />
				</ScrollView>
			) : form.loading ? (
				<View style={styles.cards}>
					{[0, 1].map((i) => (
						<View key={i} style={styles.skeletonCard}>
							<AppSkeleton width="40%" height={18} borderRadius={6} color={APP_COLORS.mint} />
							<AppSkeleton width="100%" height={48} borderRadius={10} color={APP_COLORS.pageBg} />
							<AppSkeleton width="100%" height={48} borderRadius={10} color={APP_COLORS.pageBg} />
						</View>
					))}
				</View>
			) : form.loadError ? (
				<View style={styles.errorBox}>
					<AppButton variant="outline" size="md" onPress={form.reload}>
						Couldn't load your availability. Try again
					</AppButton>
				</View>
			) : (
				<ScrollView
					contentContainerStyle={[
						styles.cards,
						{ paddingBottom: showSave ? footerBottom + 96 : tabBarClearance + 8 },
					]}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					{tab === 'week' ? (
						<WeeklyHoursTab a={a} />
					) : (
						<OverridesTab
							a={a}
							onAdd={() => setSheet({ initial: null })}
							onEdit={(o) => setSheet({ initial: o })}
							onRemove={setRemoving}
						/>
					)}
				</ScrollView>
			)}

			{showSave ? (
				<View style={[styles.saveBar, { bottom: footerBottom }]}>
					<AppButton
						variant="primary"
						size="lg"
						softDisabled
						disabled={!form.dirty || a.invalid || form.saving}
						loading={form.saving}
						onPress={form.submit}
					>
						{saveLabel}
					</AppButton>
				</View>
			) : null}

			<OverrideSheet
				visible={!!sheet}
				onClose={() => setSheet(null)}
				initial={sheet?.initial ?? null}
				takenDates={a.overrides.map((o) => o.date)}
				offLabel="On leave"
				subtitle="Weekly hours stay the same on other dates"
				allowNote
				bookedByDate={a.bookedByDate}
				onSave={async (o) => {
					if (await a.saveOverride(o, sheet?.initial ?? null)) setSheet(null)
				}}
			/>
			<AppConfirmSheet
				visible={!!removing}
				onClose={() => setRemoving(null)}
				title="Remove this date override?"
				message="Your weekly hours will apply on this date again."
				confirmLabel="Remove"
				onConfirm={async () => {
					const target = removing
					setRemoving(null)
					if (target) await a.removeOverride(target)
				}}
			/>
			<StatusModal
				visible={!!a.actionError || !!form.saveError}
				status="error"
				title="Couldn't update availability"
				description={a.actionError || form.saveError || ''}
				submitText="OK"
				onSubmit={() => {
					a.clearActionError()
					form.clearSaveError()
				}}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	page: {
		flex: 1,
		backgroundColor: APP_COLORS.pageBg,
	},
	tabs: {
		paddingHorizontal: 16,
		paddingTop: 12,
		paddingBottom: 4,
	},
	cards: {
		gap: 8,
		paddingTop: 8,
	},
	bookings: {
		padding: 16,
	},
	skeletonCard: {
		backgroundColor: APP_COLORS.surface,
		padding: 16,
		gap: 12,
	},
	errorBox: {
		margin: 16,
	},
	saveBar: {
		position: 'absolute',
		left: 0,
		right: 0,
		paddingHorizontal: 16,
		paddingTop: 10,
		paddingBottom: 10,
		backgroundColor: APP_COLORS.surface,
		borderTopWidth: 1,
		borderTopColor: APP_COLORS.divider,
	},
})
