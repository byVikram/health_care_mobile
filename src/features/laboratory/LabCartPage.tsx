// src/features/laboratory/LabCartPage.tsx
//
// "Your cart" from the Lab Tests Ordering design: the order banner, the Home visit / In-clinic switch, who
// the tests are for, the collection slot (home) or "Choose a lab and time" (clinic), the tests in the cart
// with a stepper, "Often added together", coupon + bill details and the footer CTA. Opens the collection
// schedule sheet and the family-member sheet. Mock data + the shared booking store.

import React, { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import {
	AppBillSummary,
	AppButton,
	AppFamilyMemberSheet,
	AppFooterBar,
	AppIconTile,
	AppNavRow,
	AppPatientRow,
	AppPathIcon,
	AppQuantityStepper,
	AppScreenHeader,
	AppSection,
	AppSegmentedControl,
	familyMemberFirstName,
	type BillingRow,
} from '../../components/common'
import { APP_COLORS } from '../../config/theme'
import { useFamilyMembers } from '../../hooks/useFamilyMembers'
import { ROUTES } from '../../navigation/routes'
import type { AppStackParamList } from '../../navigation/types'
import { showComingSoon } from '../../utils/toast'
import { labBooking, needsFasting, timeIdFor, totalsOf, useLabBooking, type LabWhere } from './labBookingStore'
import { inr, longDate, plural, shortDate } from './labFormat'
import { LAB_ICONS, OFTEN_ADDED_IDS, collectionTimeLabel, labItemById, type LabItem } from './labMock'
import { LabScheduleSheet } from './LabScheduleSheet'

type Nav = NativeStackNavigationProp<AppStackParamList>

const WHERE_OPTIONS: {
	value: LabWhere
	label: string
	icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']
}[] = [
	{ value: 'home', label: 'Home visit', icon: 'home-outline' },
	{ value: 'lab', label: 'In-clinic', icon: 'hospital-building' },
]

export default function LabCartPage() {
	const navigation = useNavigation<Nav>()
	const booking = useLabBooking()
	const { members, addFromDraft } = useFamilyMembers()
	const [scheduleOpen, setScheduleOpen] = useState(false)
	const [familyOpen, setFamilyOpen] = useState(false)

	// The app can stay open across midnight: drop dates that have gone by.
	useEffect(() => labBooking.dropExpired(), [])

	const { items, visits, total, mrp, savings } = totalsOf(booking)
	const isHome = booking.where === 'home'
	const fasting = needsFasting(booking)
	const countLabel = plural(items.length, 'item', 'items')

	const memberIndex = Math.max(
		0,
		members.findIndex((m) => m.key === booking.patientKey)
	)
	const member = members[memberIndex] ?? members[0]
	const patientName = member?.name ?? 'Myself'

	const { dates } = booking
	const distinct = new Set(dates.map((d) => timeIdFor(booking, d))).size
	const sameTimeText = collectionTimeLabel(timeIdFor(booking, dates[0] ?? ''))
	const slotTitle =
		dates.length === 0
			? 'Choose a collection slot'
			: dates.length === 1
				? `${longDate(dates[0])} · ${sameTimeText}`
				: `${dates.length} visits · ${dates.map(shortDate).join(', ')} · ${
						!booking.sameTime && distinct > 1 ? 'different times' : sameTimeText
					}`

	const suggestions = OFTEN_ADDED_IDS.filter((id) => !booking.cart.includes(id))
		.map(labItemById)
		.filter((i): i is LabItem => !!i)
		.slice(0, 2)

	const billRows: BillingRow[] = [
		{
			label: `Tests (${countLabel}${visits > 1 ? ` × ${visits} visits` : ''}, MRP)`,
			value: inr(mrp),
		},
		{ label: 'Discount', value: `−${inr(savings)}`, tone: 'free' },
		...(isHome ? [{ label: 'Home sample collection', value: 'Free', tone: 'free' as const }] : []),
		{ label: 'To pay', value: inr(total), tone: 'total', dividerBefore: true },
	]

	const goNext = () =>
		navigation.navigate(isHome ? ROUTES.STACK.LABORATORY_BOOKING_SUMMARY : ROUTES.STACK.LABORATORY_SELECT_LAB)
	const browse = () =>
		navigation.canGoBack() ? navigation.goBack() : navigation.navigate(ROUTES.STACK.LABORATORY_LIST)

	return (
		<View style={styles.screen}>
			<AppScreenHeader
				variant="bar"
				title="Your cart"
				subtitle={`${countLabel} · Step 1 of 2`}
				onBack={() => navigation.goBack()}
				backAccessibilityLabel="Back to tests"
			/>

			<ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
				{/* Order banner */}
				<AppSection marginTop={0} accessibilityLabel="Your order" style={styles.bannerSection}>
					<View style={styles.banner}>
						<View style={styles.bannerCircle} />
						<AppIconTile
							size={48}
							radius={14}
							backgroundColor={APP_COLORS.mintAccent}
							iconColor={APP_COLORS.ink}
						>
							<AppPathIcon d={LAB_ICONS.flask} size={24} strokeWidth={2} color={APP_COLORS.ink} />
						</AppIconTile>
						<View style={styles.bannerText}>
							<Text style={styles.bannerEyebrow}>{isHome ? 'HOME COLLECTION' : 'IN-CLINIC VISIT'}</Text>
							<Text style={styles.bannerTitle} numberOfLines={1}>
								{isHome ? slotTitle : 'Choose a lab and time'}
							</Text>
							<Text style={styles.bannerSub}>{`${countLabel} · for ${patientName}`}</Text>
						</View>
						<View style={styles.bannerPill}>
							<Text style={styles.bannerPillText}>{inr(total)}</Text>
						</View>
					</View>
				</AppSection>

				{/* Where + who + when */}
				<AppSection marginTop={0} accessibilityLabel="Patient and slot" gap={4} style={styles.whoSection}>
					<AppSegmentedControl<LabWhere>
						shape="rounded"
						accessibilityLabel="How would you like to give your sample?"
						options={WHERE_OPTIONS}
						value={booking.where}
						onChange={(v) => labBooking.set({ where: v })}
						style={styles.whereToggle}
					/>

					{!!member && (
						<AppPatientRow
							member={member}
							label="TESTS FOR"
							toneIndex={memberIndex}
							onChange={() => setFamilyOpen(true)}
						/>
					)}

					{isHome ? (
						<AppNavRow
							title={slotTitle}
							subtitle="Home collection · at your saved address"
							leading={{
								children: (
									<AppPathIcon
										d={LAB_ICONS.calendar}
										size={20}
										strokeWidth={2}
										color={APP_COLORS.primary}
									/>
								),
								tone: 'mint',
							}}
							onPress={() => setScheduleOpen(true)}
							minHeight={64}
							titleStyle={styles.navTitle}
							accessibilityLabel={`${slotTitle}. Change the collection slot`}
						/>
					) : (
						<AppNavRow
							title="Choose a lab and time"
							subtitle="4 labs near you · slots from 7:00 AM"
							leading={{
								children: (
									<AppPathIcon
										d={LAB_ICONS.clinic}
										size={20}
										strokeWidth={2}
										color={APP_COLORS.primary}
									/>
								),
								tone: 'mint',
							}}
							onPress={() => navigation.navigate(ROUTES.STACK.LABORATORY_SELECT_LAB)}
							minHeight={64}
							titleStyle={styles.navTitle}
						/>
					)}

					{fasting && (
						<View style={styles.fastNote} accessibilityRole="text">
							<MaterialCommunityIcons name="alert-circle-outline" size={16} color={APP_COLORS.warning} />
							<Text style={styles.fastNoteText}>
								Fasting 10–12 hrs needed · a morning slot works best
							</Text>
						</View>
					)}
				</AppSection>

				{/* Tests in your cart */}
				<AppSection
					marginTop={0}
					title="Tests in your cart"
					right={
						<TouchableOpacity onPress={browse} style={styles.addMore} accessibilityRole="button">
							<Text style={styles.addMoreText}>+ Add more</Text>
						</TouchableOpacity>
					}
					gap={0}
				>
					{items.length > 0 ? (
						items.map((item, i) => (
							<View key={item.id} style={[styles.itemRow, i > 0 && styles.rowRule]}>
								<View style={styles.flex}>
									<Text style={styles.itemName}>{item.name}</Text>
									<Text style={styles.itemSub}>
										<Text style={styles.itemPrice}>{inr(item.price)}</Text>
										<Text style={styles.itemMrp}> {inr(item.mrp)}</Text>
										{` · ${item.report}`}
									</Text>
								</View>
								<AppQuantityStepper
									value={1}
									min={0}
									max={1}
									itemLabel={item.name}
									onChange={(n) => n === 0 && labBooking.removeItem(item.id)}
								/>
							</View>
						))
					) : (
						<View style={styles.empty}>
							<Text style={styles.emptyTitle}>Your cart is empty</Text>
							<Text style={styles.emptySub}>Add a test or package to book a home collection.</Text>
							<AppButton size="md" onPress={browse}>
								Browse tests
							</AppButton>
						</View>
					)}
				</AppSection>

				{/* Often added together */}
				{items.length > 0 && suggestions.length > 0 && (
					<AppSection marginTop={0} title="Often added together" gap={0}>
						{suggestions.map((s, i) => (
							<View key={s.id} style={[styles.itemRow, i > 0 && styles.rowRule]}>
								<AppIconTile tone="mint" size={40} radius={10}>
									<AppPathIcon
										d={LAB_ICONS.flask}
										size={20}
										strokeWidth={2}
										color={APP_COLORS.primary}
									/>
								</AppIconTile>
								<View style={styles.flex}>
									<Text style={styles.itemName}>{s.name}</Text>
									<Text style={styles.itemSub}>
										<Text style={styles.itemPrice}>{inr(s.price)}</Text>
										<Text style={styles.itemMrp}> {inr(s.mrp)}</Text>
										{` · ${s.report}`}
									</Text>
								</View>
								<TouchableOpacity
									style={styles.addBtn}
									onPress={() => labBooking.addItem(s.id)}
									accessibilityRole="button"
									accessibilityLabel={`Add ${s.name} to cart`}
								>
									<MaterialCommunityIcons name="plus" size={16} color={APP_COLORS.primary} />
									<Text style={styles.addBtnText}>Add</Text>
								</TouchableOpacity>
							</View>
						))}
					</AppSection>
				)}

				{/* Bill details */}
				{items.length > 0 && (
					<AppSection marginTop={0} accessibilityLabel="Bill details" gap={12}>
						<AppNavRow
							title="Apply coupon"
							subtitle="Have an offer code? Add it here"
							leading={{
								children: (
									<AppPathIcon
										d={LAB_ICONS.check}
										size={20}
										strokeWidth={2.2}
										color={APP_COLORS.primary}
									/>
								),
								tone: 'mint',
							}}
							onPress={() => showComingSoon()}
							divider
							minHeight={56}
							titleStyle={styles.navTitle}
						/>
						<Text style={styles.billTitle} accessibilityRole="header">
							Bill details
						</Text>
						<AppBillSummary
							variant="flat"
							dashedDividers
							rowGap={8}
							rows={billRows}
							note={{
								icon: (
									<MaterialCommunityIcons name="tag-outline" size={16} color={APP_COLORS.success} />
								),
								text: `You save ${inr(savings)} on this order.${visits > 1 ? ' Your tests are repeated on each visit.' : ''}`,
								backgroundColor: APP_COLORS.successBg,
								textColor: APP_COLORS.success,
							}}
						/>
					</AppSection>
				)}
			</ScrollView>

			{items.length > 0 && (
				<AppFooterBar direction="column">
					<AppButton size="lg" disabled={isHome && dates.length === 0} onPress={goNext}>
						{isHome ? `Proceed to pay · ${inr(total)}` : 'Choose a lab & time'}
					</AppButton>
				</AppFooterBar>
			)}

			<LabScheduleSheet visible={scheduleOpen} onClose={() => setScheduleOpen(false)} />

			<AppFamilyMemberSheet
				visible={familyOpen}
				onClose={() => setFamilyOpen(false)}
				members={members}
				selectedKey={booking.patientKey}
				onSelect={(m) => labBooking.set({ patientKey: m.key })}
				title="Who are these tests for?"
				confirmLabel={(m) => `Continue for ${familyMemberFirstName(m)}`}
				onSave={async (draft) => {
					const key = await addFromDraft(draft)
					if (key) labBooking.set({ patientKey: key })
					return !!key
				}}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: APP_COLORS.pageBg },
	content: { gap: 8, paddingBottom: 8 },
	flex: { flex: 1, minWidth: 0 },

	bannerSection: { paddingTop: 16, paddingBottom: 4 },
	banner: {
		overflow: 'hidden',
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		padding: 14,
		borderRadius: 16,
		backgroundColor: APP_COLORS.ink,
	},
	bannerCircle: {
		position: 'absolute',
		right: -30,
		top: -40,
		width: 120,
		height: 120,
		borderRadius: 9999,
		backgroundColor: APP_COLORS.primary,
	},
	bannerText: { flex: 1, minWidth: 0 },
	bannerEyebrow: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '700',
		letterSpacing: 0.48,
		color: APP_COLORS.mintAccent,
	},
	bannerTitle: { fontSize: 17, lineHeight: 24, fontWeight: '800', color: '#FFFFFF' },
	bannerSub: { fontSize: 12, lineHeight: 16, color: APP_COLORS.mint },
	bannerPill: {
		paddingVertical: 4,
		paddingHorizontal: 10,
		borderRadius: 9999,
		backgroundColor: APP_COLORS.mintAccent,
	},
	bannerPillText: { fontSize: 13, fontWeight: '800', color: APP_COLORS.ink },

	whoSection: { marginTop: -8, paddingTop: 4, paddingBottom: 12 },
	whereToggle: { marginTop: 12, marginBottom: 4 },
	navTitle: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
	fastNote: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 8,
		backgroundColor: APP_COLORS.warningBg,
	},
	fastNoteText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '500', color: APP_COLORS.warning },

	addMore: { minHeight: 44, justifyContent: 'center' },
	addMoreText: { fontSize: 14, fontWeight: '600', color: APP_COLORS.primary },
	itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
	rowRule: { borderTopWidth: 1, borderTopColor: APP_COLORS.divider },
	itemName: { fontSize: 15, lineHeight: 20, fontWeight: '600', color: APP_COLORS.ink },
	itemSub: { fontSize: 13, lineHeight: 18, color: APP_COLORS.inkMuted },
	itemPrice: { fontWeight: '700', color: APP_COLORS.ink },
	itemMrp: { textDecorationLine: 'line-through' },
	addBtn: {
		height: 36,
		paddingHorizontal: 12,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: APP_COLORS.primary,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	addBtnText: { fontSize: 14, fontWeight: '700', color: APP_COLORS.primary },
	empty: { alignItems: 'center', gap: 8, paddingVertical: 24 },
	emptyTitle: { fontSize: 18, lineHeight: 26, fontWeight: '600', color: APP_COLORS.ink },
	emptySub: { fontSize: 14, lineHeight: 20, color: APP_COLORS.inkMuted, textAlign: 'center' },
	billTitle: { fontSize: 18, lineHeight: 26, fontWeight: '700', color: APP_COLORS.ink },
})
