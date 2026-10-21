// src/features/laboratory/LabCartPage.tsx
//
// "Your cart" from the Lab Tests Ordering design: the order banner, the Home visit / In-clinic switch, who the
// tests are for and the address (the patient's saved addresses), a live availability check for that address,
// the tests in the cart with a stepper, the estimated bill and the footer CTA to "Choose a lab & time". The
// availability / price estimate comes from our API (/api/laboratory/availability + /quote); prices are MRP.

import React, { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import {
	AppBillSummary,
	AppBottomSheet,
	AppButton,
	AppFooterBar,
	AppIconTile,
	AppNavRow,
	AppPathIcon,
	AppQuantityStepper,
	AppScreenHeader,
	AppSection,
	AppSegmentedControl,
	type BillingRow,
} from '../../components/common'
import { APP_COLORS } from '../../config/theme'
import { ROUTES } from '../../navigation/routes'
import type { AppStackParamList } from '../../navigation/types'
import { VisitWhoWhereSection } from '../ancillary/patient/VisitWhoWhereSection'
import { addressLine, useVisitPatientAddress } from '../ancillary/patient/useVisitPatientAddress'
import { labBooking, needsFasting, totalsOf, useLabBooking, type LabWhere } from './labBookingStore'
import { commaDate, inr, plural, timeLabel } from './labFormat'
import { LAB_ICONS } from './labMock'
import { LabLogo } from './LabLogo'
import { LabSlotPicker } from './LabSlotPicker'
import {
	fetchAvailability,
	fetchQuote,
	labErrorMessage,
	type ApiAvailability,
	type ApiQuote,
	type LabServiceType,
} from './labService'

type Nav = NativeStackNavigationProp<AppStackParamList>

const WHERE_OPTIONS: {
	value: LabWhere
	label: string
	icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']
}[] = [
	{ value: 'home', label: 'Home visit', icon: 'home-outline' },
	{ value: 'lab', label: 'In-clinic', icon: 'hospital-building' },
]

const SERVICE_OF: Record<LabWhere, LabServiceType> = { home: 'HOME_SAMPLE', lab: 'CENTER_VISIT' }

type Check = { availability: ApiAvailability; quote: ApiQuote }

/** Availability + the cheapest quote for the cart at the picked address; re-runs when either changes. */
function useCartCheck(addressId: string | null, cart: string[]) {
	const [check, setCheck] = useState<Check | null>(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [tick, setTick] = useState(0)
	const cartKey = cart.join(',')

	useEffect(() => {
		setCheck(null)
		setError(null)
		if (!addressId || !cartKey) {
			setLoading(false)
			return
		}
		let active = true
		const ids = cartKey.split(',')
		const run = async () => {
			setLoading(true)
			try {
				const [availability, quote] = await Promise.all([
					fetchAvailability(addressId, ids),
					fetchQuote(addressId, ids),
				])
				if (active) setCheck({ availability, quote })
			} catch (e) {
				if (active) setError(labErrorMessage(e))
			} finally {
				if (active) setLoading(false)
			}
		}
		void run()
		return () => {
			active = false
		}
	}, [addressId, cartKey, tick])

	return { check, loading, error, retry: () => setTick((n) => n + 1) }
}

export default function LabCartPage() {
	const navigation = useNavigation<Nav>()
	const booking = useLabBooking()
	const [slotsOpen, setSlotsOpen] = useState(false)
	const who = useVisitPatientAddress(booking.patientKey, booking.addressId)
	const { member, address } = who

	// The app can stay open for a long time: drop a slot that has gone by.
	useEffect(() => labBooking.dropExpired(), [])

	// Keep the booking store in step with who / where is chosen here (the labs, review and order screens read it).
	useEffect(() => {
		labBooking.set({
			patientKey: who.patientKey,
			patientName: member?.name ?? '',
			patientRelation: member?.relation ?? 'Self',
			// Until the saved addresses have loaded `address` is null: keep what the store already holds.
			...(address ? { addressId: address.id, addressTag: address.label, addressLine: addressLine(address) } : {}),
		})
	}, [who.patientKey, member?.name, member?.relation, address?.id])

	const { items, total: pickedTotal, mrp: pickedMrp } = totalsOf(booking)
	const picked = booking.lab && booking.slot ? { lab: booking.lab, slot: booking.slot } : null
	const isHome = booking.where === 'home'
	const fasting = needsFasting(booking)
	const countLabel = plural(items.length, 'item', 'items')
	const { check, loading, error, retry } = useCartCheck(booking.addressId, booking.cart)

	const service = SERVICE_OF[booking.where]
	const labsForService = useMemo(
		() => (check ? check.quote.labs.filter((l) => l.services.includes(service)) : []),
		[check, service]
	)
	const cheapest = labsForService[0]
	// Once a lab is picked the cart shows that lab's quote; until then the cheapest lab's.
	const estimate = picked ? pickedTotal : cheapest ? Number(cheapest.total) : items.reduce((n, i) => n + i.price, 0)
	const estimateMrp = picked ? pickedMrp : cheapest ? Number(cheapest.total_mrp) : items.reduce((n, i) => n + i.mrp, 0)

	// Why nothing can be booked, in words: items no lab serves here, else "no one lab does all of these".
	const unservedNames = check ? check.availability.per_item.filter((p) => p.lab_ids.length === 0).map((p) => p.name) : []
	const status = (() => {
		if (!booking.addressId) return { kind: 'info' as const, text: 'Choose an address to check availability.' }
		if (loading) return { kind: 'loading' as const, text: 'Checking availability at your address…' }
		if (error) return { kind: 'error' as const, text: error }
		if (!check) return null
		if (!check.availability.serviceable) {
			return {
				kind: 'warn' as const,
				text: unservedNames.length
					? `Not available at your address: ${unservedNames.join(', ')}. Remove ${unservedNames.length === 1 ? 'it' : 'them'} to continue.`
					: 'No single lab can do all of these tests at your address. Try booking them separately.',
			}
		}
		if (labsForService.length === 0) {
			return {
				kind: 'warn' as const,
				text: isHome
					? 'No lab offers home collection for these tests at your address. Try an in-clinic visit.'
					: 'No lab offers an in-clinic visit for these tests near your address. Try a home visit.',
			}
		}
		return {
			kind: 'ok' as const,
			text: `${plural(labsForService.length, 'lab', 'labs')} can ${isHome ? 'collect the sample at your address' : 'see you in clinic'}.`,
		}
	})()
	// The labs screen explains an empty result itself, so only a missing address or a running check blocks it.
	const canContinue = items.length > 0 && !loading && !!booking.addressId

	const billRows: BillingRow[] = [
		{ label: `Tests (${countLabel}, MRP)`, value: inr(estimateMrp) },
		...(estimateMrp > estimate ? [{ label: 'Package discount', value: `−${inr(estimateMrp - estimate)}`, tone: 'free' as const }] : []),
		{
			label: 'Total',
			value: inr(estimate),
			tone: 'total',
			dividerBefore: true,
		},
	]

	const goNext = () => navigation.navigate(ROUTES.STACK.LABORATORY_BOOKING_SUMMARY)
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

			<ScrollView
				contentContainerStyle={styles.content}
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
			>
				{/* Order banner */}
				<AppSection marginTop={0} accessibilityLabel="Your order" style={styles.bannerSection}>
					<View style={styles.banner}>
						<View style={styles.bannerCircle} />
						<AppIconTile size={48} radius={14} backgroundColor={APP_COLORS.mintAccent} iconColor={APP_COLORS.ink}>
							<AppPathIcon d={LAB_ICONS.flask} size={24} strokeWidth={2} color={APP_COLORS.ink} />
						</AppIconTile>
						<View style={styles.bannerText}>
							<Text style={styles.bannerEyebrow}>{isHome ? 'HOME COLLECTION' : 'IN-CLINIC VISIT'}</Text>
							<Text style={styles.bannerTitle} numberOfLines={1}>
								{picked ? `${commaDate(picked.slot.date)} · ${timeLabel(picked.slot.time)}` : 'Choose a lab and time'}
							</Text>
							<Text style={styles.bannerSub} numberOfLines={1}>
								{picked
									? `${picked.lab.name} · ${countLabel}`
									: `${countLabel} · for ${member?.name ?? 'Myself'}`}
							</Text>
						</View>
						{(picked || cheapest) && (
							<View style={styles.bannerPill}>
								<Text style={styles.bannerPillText}>{`${picked ? '' : 'From '}${inr(estimate)}`}</Text>
							</View>
						)}
					</View>
				</AppSection>

				{/* Where + who + address */}
				<AppSection marginTop={0} accessibilityLabel="Visit type" gap={4} style={styles.whereSection}>
					<AppSegmentedControl<LabWhere>
						shape="rounded"
						accessibilityLabel="How would you like to give your sample?"
						options={WHERE_OPTIONS}
						value={booking.where}
						onChange={(v) => labBooking.set({ where: v })}
						style={styles.whereToggle}
					/>
				</AppSection>

				<VisitWhoWhereSection
					who={who}
					noun="phlebotomist"
					note={booking.note}
					onNoteChange={(v) => labBooking.set({ note: v })}
					addressHint={isHome ? 'Sample will be collected here' : 'Labs near this address are shown next'}
					patientLabel="TESTS FOR"
					addressLabel={isHome ? 'COLLECTION ADDRESS' : 'YOUR ADDRESS'}
					familyTitle="Who are these tests for?"
				/>

				{/* Availability at the address */}
				{items.length > 0 && !!status && (
					<View
						style={[styles.status, status.kind === 'warn' || status.kind === 'error' ? styles.statusWarn : styles.statusOk]}
						accessibilityRole="text"
						accessibilityLiveRegion="polite"
					>
						{status.kind === 'loading' ? (
							<ActivityIndicator size="small" color={APP_COLORS.primary} />
						) : (
							<MaterialCommunityIcons
								name={status.kind === 'ok' ? 'check-circle-outline' : status.kind === 'info' ? 'map-marker-outline' : 'alert-circle-outline'}
								size={18}
								color={status.kind === 'warn' || status.kind === 'error' ? APP_COLORS.warning : APP_COLORS.success}
							/>
						)}
						<Text
							style={[
								styles.statusText,
								{ color: status.kind === 'warn' || status.kind === 'error' ? APP_COLORS.warning : APP_COLORS.success },
							]}
						>
							{status.text}
						</Text>
						{status.kind === 'error' && (
							<TouchableOpacity onPress={retry} accessibilityRole="button" style={styles.retry}>
								<Text style={styles.retryText}>Retry</Text>
							</TouchableOpacity>
						)}
					</View>
				)}

				{/* Lab + time: a row like the address one; opens the picker sheet */}
				{items.length > 0 && labsForService.length > 0 && (
					<AppSection marginTop={0} accessibilityLabel="Lab and time" style={styles.slotSection}>
						<TouchableOpacity
							style={styles.slotRow}
							onPress={() => setSlotsOpen(true)}
							activeOpacity={0.8}
							accessibilityRole="button"
							accessibilityLabel={
								picked
									? `Lab ${picked.lab.name}, ${commaDate(picked.slot.date)} ${timeLabel(picked.slot.time)}. Change`
									: 'Choose a lab and time'
							}
						>
							<LabLogo uri={picked?.lab.logoUrl} size={48} />
							<View style={styles.flex}>
								<Text style={styles.slotEyebrow}>{isHome ? 'LAB AND COLLECTION TIME' : 'LAB AND VISIT TIME'}</Text>
								{picked ? (
									<>
										<Text style={styles.slotLine1} numberOfLines={1}>
											{picked.lab.name}
										</Text>
										<Text style={styles.slotLine2} numberOfLines={1}>
											{`${commaDate(picked.slot.date)} · ${timeLabel(picked.slot.time)}`}
										</Text>
									</>
								) : (
									<Text style={[styles.slotLine1, styles.slotMissing]}>Choose a lab and time</Text>
								)}
							</View>
							<MaterialCommunityIcons name="chevron-right" size={20} color={APP_COLORS.border} />
						</TouchableOpacity>
					</AppSection>
				)}

				{fasting && (
					<View style={styles.fastNote} accessibilityRole="text">
						<MaterialCommunityIcons name="alert-circle-outline" size={16} color={APP_COLORS.warning} />
						<Text style={styles.fastNoteText}>Fasting is needed for some tests · a morning slot works best</Text>
					</View>
				)}

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
						items.map((item, i) => {
							const here = cheapest?.items.find((q) => q.item_id === item.id)
							const price = here ? Number(here.price) : item.price
							const mrp = here ? Number(here.mrp) : item.mrp
							const priceText = price > 0 ? `${picked || here ? '' : 'From '}${inr(price)}` : 'Price at checkout'
							return (
								<View key={item.id} style={[styles.itemRow, i > 0 && styles.rowRule]}>
									<View style={styles.flex}>
										<Text style={styles.itemName}>{item.name}</Text>
										<Text style={styles.itemSub}>
											<Text style={styles.itemPrice}>{priceText}</Text>
											{mrp > price && price > 0 && <Text style={styles.itemMrp}>{` ${inr(mrp)}`}</Text>}
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
							)
						})
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

				{/* Bill details */}
				{items.length > 0 && (
					<AppSection marginTop={0} accessibilityLabel="Bill details" gap={12}>
						<Text style={styles.billTitle} accessibilityRole="header">
							Estimate
						</Text>
						<AppBillSummary
							variant="flat"
							dashedDividers
							rowGap={8}
							rows={billRows}
							note={{
								icon: <MaterialCommunityIcons name="information-outline" size={16} color={APP_COLORS.inkMuted} />,
								text: 'Tests are at the lab’s MRP, packages at their selling price. The final amount depends on the lab you choose.',
								backgroundColor: APP_COLORS.pageBg,
								textColor: APP_COLORS.inkMuted,
							}}
						/>
					</AppSection>
				)}
			</ScrollView>

			{items.length > 0 && (
				<AppFooterBar direction="column">
					<AppButton size="lg" disabled={!canContinue || !picked} onPress={goNext}>
						{picked ? 'Review' : 'Pick a lab and time'}
					</AppButton>
				</AppFooterBar>
			)}

			<AppBottomSheet
				visible={slotsOpen}
				title="Pick a lab and time"
				subtitle={isHome ? 'Home collection' : 'In-clinic visit'}
				onClose={() => setSlotsOpen(false)}
				appearance="modern"
				showHeaderDivider={false}
				maxHeightRatio={0.92}
				footer={
					<AppButton size="lg" disabled={!picked} onPress={() => setSlotsOpen(false)}>
						{picked ? 'Confirm' : 'Select a time'}
					</AppButton>
				}
			>
				<LabSlotPicker labs={labsForService} service={service} />
			</AppBottomSheet>
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

	whereSection: { marginTop: -8, paddingTop: 4, paddingBottom: 4 },
	whereToggle: { marginTop: 12, marginBottom: 4 },
	status: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginHorizontal: 16,
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderRadius: 8,
	},
	statusOk: { backgroundColor: APP_COLORS.successBg },
	statusWarn: { backgroundColor: APP_COLORS.warningBg },
	statusText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '600' },
	retry: { minHeight: 32, justifyContent: 'center', paddingHorizontal: 4 },
	retryText: { fontSize: 13, fontWeight: '800', color: APP_COLORS.primary },
	fastNote: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginHorizontal: 16,
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
	slotSection: { paddingTop: 4, paddingBottom: 4 },
	slotRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 8 },
	slotEyebrow: { fontSize: 12, lineHeight: 16, fontWeight: '700', letterSpacing: 0.5, color: APP_COLORS.inkMuted },
	slotLine1: { fontSize: 15, lineHeight: 20, fontWeight: '700', color: APP_COLORS.ink },
	slotLine2: { fontSize: 13, lineHeight: 18, color: APP_COLORS.inkMuted },
	slotMissing: { color: APP_COLORS.primary },
	empty: { alignItems: 'center', gap: 8, paddingVertical: 24 },
	emptyTitle: { fontSize: 18, lineHeight: 26, fontWeight: '600', color: APP_COLORS.ink },
	emptySub: { fontSize: 14, lineHeight: 20, color: APP_COLORS.inkMuted, textAlign: 'center' },
	billTitle: { fontSize: 18, lineHeight: 26, fontWeight: '700', color: APP_COLORS.ink },
})
