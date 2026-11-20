// src/features/laboratory/LabReviewPage.tsx
//
// "Review & book" from the Lab Tests Ordering design, in both variants: home sample collection (tests, when,
// who + collection address + a note for the phlebotomist, bill, pay with) and in-clinic (the chosen lab
// instead of the address). Who / where reuse the ancillary VisitWhoWhereSection + useVisitPatientAddress
// (real family members and saved addresses); everything else is the booking store (mock catalogue).
// "Pay" opens the Payment screen with the method picked here.

import React, { useEffect, useMemo, useState } from 'react'
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
	AppPatientRow,
	AppPathIcon,
	AppScreenHeader,
	AppSection,
	AppTextLink,
	familyMemberFirstName,
	type BillingRow,
} from '../../components/common'
import { APP_COLORS } from '../../config/theme'
import { ROUTES } from '../../navigation/routes'
import type { AppStackParamList } from '../../navigation/types'
import { VisitWhoWhereSection } from '../ancillary/patient/VisitWhoWhereSection'
import { addressLine, useVisitPatientAddress } from '../ancillary/patient/useVisitPatientAddress'
import { labBooking, needsFasting, totalsOf, useLabBooking } from './labBookingStore'
import { orderFromApi } from './labOrder'
import { labErrorMessage, placeOrder } from './labService'
import { commaDate, inr, plural, timeLabel } from './labFormat'
import { LabLogo } from './LabLogo'
import { LAB_ICONS, type LabItem } from './labMock'
import { showStatusModal } from '../../services/apiService'

type Nav = NativeStackNavigationProp<AppStackParamList>

const itemSub = (item: LabItem) =>
	item.kind === 'package'
		? `${item.tests ?? 0} tests${item.fasting ? ' · fasting needed' : ''}`
		: (item.bullets[0] ?? item.sample)

/** "Thu, 24 Sep · 7:30 AM" for the When card. */
const whenTitle = (b: ReturnType<typeof useLabBooking>) =>
	b.slot ? `${commaDate(b.slot.date)} · ${timeLabel(b.slot.time)}` : 'Choose a lab and time'

export default function LabReviewPage() {
	const navigation = useNavigation<Nav>()
	const booking = useLabBooking()
	const isHome = booking.where === 'home'
	const who = useVisitPatientAddress(booking.patientKey, booking.addressId)
	const [familyOpen, setFamilyOpen] = useState(false)
	const [placing, setPlacing] = useState(false)

	// Re-validate on open: the slot may have gone by. Payment is on collection, nothing to choose.
	useEffect(() => {
		labBooking.dropExpired()
		labBooking.set({ method: 'later' })
	}, [])

	// Keep the booking store in step with who / where is chosen here (the payment and order screens read it).
	const { member, address } = who
	useEffect(() => {
		labBooking.set({
			patientKey: who.patientKey,
			patientName: member?.name ?? '',
			patientRelation: member?.relation ?? 'Self',
			...(address ? { addressTag: address.label, addressLine: addressLine(address) } : {}),
		})
	}, [who.patientKey, member?.name, member?.relation, address])

	const { items, total, mrp } = totalsOf(booking)
	const fasting = needsFasting(booking)
	const fastLabel = items.find((i) => i.fasting)?.fastingLabel
	const lab = booking.lab
	const countLabel = plural(items.length, 'test', 'tests')

	const billRows: BillingRow[] = useMemo(
		() => [
			{ label: `Tests (${items.length}, MRP)`, value: inr(mrp) },
			...(mrp > total ? [{ label: 'Package discount', value: `−${inr(mrp - total)}`, tone: 'free' as const }] : []),
			{ label: 'Total', value: inr(total), tone: 'total' as const, dividerBefore: true },
		],
		[items.length, mrp, total]
	)

	const editTests = () => navigation.navigate(ROUTES.STACK.LABORATORY_SAMPLE_COLLECTION)
	const changeWhen = () => navigation.navigate(ROUTES.STACK.LABORATORY_SAMPLE_COLLECTION)

	const bannerTitle = isHome ? 'A phlebotomist visits you at your slot' : 'Your lab visit at the time you picked'
	const bannerSub = isHome
		? 'Sample collected at home · reports in the app in about 24 hours'
		: 'Please reach 10 minutes early.'

	const slotMissing = !booking.slot

	// Books the order (pay on collection). The server re-checks the price and the slot: a 409 says which changed.
	const placeNow = async () => {
		const b = labBooking.get()
		if (!b.lab || !b.slot || !b.addressId || b.quoteTotal == null || placing) return
		setPlacing(true)
		try {
			const api = await placeOrder({
				patientId: who.patientPublicId,
				addressId: b.addressId,
				itemIds: b.cart,
				labId: b.lab.id,
				service: b.where === 'home' ? 'HOME_SAMPLE' : 'CENTER_VISIT',
				date: b.slot.date,
				time: b.slot.time,
				expectedTotal: b.quoteTotal,
				note: b.note,
			})
			labBooking.set({ order: orderFromApi(api, b) })
			// Reset (not push): back from the confirmation must not return here and place a second order.
			navigation.reset({
				index: 1,
				routes: [{ name: ROUTES.MAIN.TABS }, { name: ROUTES.STACK.LABORATORY_PAYMENT_SUCCESS }],
			})
		} catch (e) {
			showStatusModal({
				status: 'error',
				title: 'Couldn’t place the order',
				description: labErrorMessage(e),
				submitText: 'OK',
			})
		} finally {
			setPlacing(false)
		}
	}

	return (
		<View style={styles.screen}>
			<AppScreenHeader
				variant="bar"
				solid
				title="Review & book"
				subtitle={isHome ? 'Lab tests · home sample collection' : 'Lab tests · in-clinic visit'}
				onBack={() => navigation.goBack()}
				backAccessibilityLabel="Back"
			/>

			<ScrollView
				contentContainerStyle={styles.content}
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
			>
				<View style={styles.banner}>
					<AppIconTile size={32} radius={10} backgroundColor="#FFFFFF" iconColor={APP_COLORS.success}>
						<AppPathIcon d={LAB_ICONS.clock} size={18} strokeWidth={2} color={APP_COLORS.success} />
					</AppIconTile>
					<View style={styles.flex}>
						<Text style={styles.bannerTitle}>{bannerTitle}</Text>
						<Text style={styles.bannerSub}>{bannerSub}</Text>
					</View>
				</View>

				{/* Tests */}
				<AppSection
					marginTop={0}
					title="Tests"
					titleSize="sm"
					right={<AppTextLink label="Edit" size="sm" trailingIcon="none" onPress={editTests} />}
				>
					{items.map((item) => (
						<View key={item.id} style={styles.testRow}>
							<AppIconTile tone={item.kind === 'package' ? 'lilac' : 'mint'} size={40} radius={10}>
								<AppPathIcon
									d={item.kind === 'package' ? LAB_ICONS.package : LAB_ICONS.flask}
									size={20}
									strokeWidth={2}
									color={item.kind === 'package' ? '#6A4BB5' : APP_COLORS.primary}
								/>
							</AppIconTile>
							<View style={styles.flex}>
								<Text style={styles.testName}>{item.name}</Text>
								<Text style={styles.testSub}>{itemSub(item)}</Text>
							</View>
							<View style={styles.priceCol}>
								<Text style={styles.price}>{inr(item.price)}</Text>
								{item.mrp > item.price && <Text style={styles.mrp}>{inr(item.mrp)}</Text>}
							</View>
						</View>
					))}
				</AppSection>

				{/* When */}
				<AppSection
					marginTop={0}
					title="When"
					titleSize="sm"
					right={<AppTextLink label="Change" size="sm" trailingIcon="none" onPress={changeWhen} />}
				>
					<View style={styles.testRow}>
						<AppIconTile backgroundColor={APP_COLORS.successBg} size={40} radius={10}>
							<AppPathIcon d={LAB_ICONS.calendar} size={20} strokeWidth={2} color={APP_COLORS.success} />
						</AppIconTile>
						<View style={styles.flex}>
							<Text style={styles.testName}>{whenTitle(booking)}</Text>
							<Text style={styles.testSub}>
								{`${lab ? `${lab.name} · ` : ''}${
									fasting ? `Fast for ${fastLabel ?? '10–12 hrs'} before · water is fine` : 'No fasting needed'
								}`}
							</Text>
						</View>
					</View>
				</AppSection>

				{/* Who + where */}
				{isHome ? (
					<VisitWhoWhereSection
						who={who}
						noun="phlebotomist"
						note={booking.note}
						onNoteChange={(v) => labBooking.set({ note: v })}
						addressHint="Sample will be collected here"
						patientLabel="TESTS FOR"
						addressLabel="COLLECTION ADDRESS"
						familyTitle="Who is this visit for?"
						lockAddress
					/>
				) : (
					<>
						<AppSection marginTop={0} accessibilityLabel="Patient and lab" style={styles.whoSection}>
							{!!who.member && (
								<AppPatientRow
									member={who.member}
									label="TESTS FOR"
									toneIndex={who.memberIndex}
									onChange={() => setFamilyOpen(true)}
								/>
							)}
							<View style={styles.labRow}>
								<LabLogo uri={lab?.logoUrl} size={40} />
								<View style={styles.flex}>
									<Text style={styles.eyebrow}>LAB</Text>
									<Text style={styles.labName}>{lab?.name ?? 'Choose a lab'}</Text>
								</View>
							</View>
						</AppSection>
						<AppFamilyMemberSheet
							visible={familyOpen}
							onClose={() => setFamilyOpen(false)}
							members={who.members}
							selectedKey={who.patientKey}
							onSelect={(m) => who.setPatientKey(m.key)}
							title="Who is this visit for?"
							confirmLabel={(m) => `Continue for ${familyMemberFirstName(m)}`}
							onSave={async (draft) => {
								const key = await who.addFromDraft(draft)
								if (key) who.setPatientKey(key)
								return !!key
							}}
						/>
					</>
				)}

				{/* Bill */}
				<AppSection marginTop={0} title="Bill" titleSize="sm" gap={10}>
					<AppBillSummary
						variant="flat"
						dashedDividers
						rowGap={8}
						rows={billRows}
					/>
					<Text style={styles.cancelNote}>
						{isHome
							? 'Free cancellation up to [X] hours before your slot.'
							: 'Free cancellation or rescheduling up to [X] hours before your slot.'}
					</Text>
				</AppSection>

				{/* Payment */}
				<AppSection marginTop={0} title="Payment" titleSize="sm" gap={0}>
					<View style={styles.testRow}>
						<AppIconTile backgroundColor={APP_COLORS.successBg} size={40} radius={10}>
							<AppPathIcon d={LAB_ICONS.cash} size={20} strokeWidth={2} color={APP_COLORS.success} />
						</AppIconTile>
						<View style={styles.flex}>
							<Text style={styles.testName}>Pay on collection</Text>
							<Text style={styles.testSub}>
								{isHome
									? `Keep ${inr(total)} ready for the phlebotomist · nothing to pay now`
									: `Pay ${inr(total)} at the lab · nothing to pay now`}
							</Text>
						</View>
					</View>
				</AppSection>
			</ScrollView>

			<AppFooterBar direction="column">
				<AppButton
					size="lg"
					loading={placing}
					disabled={placing || slotMissing || items.length === 0}
					onPress={() => void placeNow()}
					accessibilityLabel={`Place order for ${countLabel}, ${inr(total)}, pay on collection`}
				>
					Place order
				</AppButton>
			</AppFooterBar>
		</View>
	)
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: APP_COLORS.pageBg },
	content: { gap: 8, paddingBottom: 16 },
	flex: { flex: 1, minWidth: 0 },
	banner: {
		marginHorizontal: 16,
		marginTop: 12,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		padding: 12,
		borderRadius: 12,
		backgroundColor: APP_COLORS.successBg,
	},
	bannerTitle: { fontSize: 14, lineHeight: 20, fontWeight: '800', color: APP_COLORS.success },
	bannerSub: { fontSize: 12, lineHeight: 16, color: APP_COLORS.ink },
	testRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
	testName: { fontSize: 15, lineHeight: 20, fontWeight: '700', color: APP_COLORS.ink },
	testSub: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	priceCol: { alignItems: 'flex-end' },
	price: { fontSize: 14, fontWeight: '800', color: APP_COLORS.ink },
	mrp: { fontSize: 12, color: APP_COLORS.border, textDecorationLine: 'line-through' },
	whoSection: { paddingTop: 4 },
	eyebrow: { fontSize: 12, lineHeight: 16, fontWeight: '800', letterSpacing: 0.48, color: APP_COLORS.inkMuted },
	labRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 10,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: APP_COLORS.divider,
	},
	labName: { fontSize: 14, lineHeight: 20, fontWeight: '700', color: APP_COLORS.ink },
	labAddress: { fontSize: 13, lineHeight: 18, color: APP_COLORS.inkMuted },
	labMeta: { fontSize: 12, lineHeight: 16, fontWeight: '700', color: APP_COLORS.success },
	cancelNote: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
})
