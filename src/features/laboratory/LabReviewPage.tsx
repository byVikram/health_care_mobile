// src/features/laboratory/LabReviewPage.tsx
//
// "Review & pay" from the Lab Tests Ordering design, in both variants: home sample collection (tests, when,
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
	AppPaymentMethodList,
	AppScreenHeader,
	AppSection,
	AppTextLink,
	familyMemberFirstName,
	type AppPaymentMethod,
	type BillingRow,
} from '../../components/common'
import { APP_COLORS } from '../../config/theme'
import { ROUTES } from '../../navigation/routes'
import type { AppStackParamList } from '../../navigation/types'
import { VisitWhoWhereSection } from '../ancillary/patient/VisitWhoWhereSection'
import { addressLine, useVisitPatientAddress } from '../ancillary/patient/useVisitPatientAddress'
import { labBooking, needsFasting, timeIdFor, totalsOf, useLabBooking } from './labBookingStore'
import { commaDate, inr, plural } from './labFormat'
import { LAB_ICONS, collectionTimeLabel, labCenterById, type LabItem, type LabPayMethod } from './labMock'

type Nav = NativeStackNavigationProp<AppStackParamList>

const REVIEW_METHODS: AppPaymentMethod<LabPayMethod>[] = [
	{ id: 'upi', title: 'UPI', subtitle: 'Pay from any UPI app', icon: 'phone' },
	{ id: 'card', title: 'Credit or debit card', subtitle: 'Visa, Mastercard, RuPay', icon: 'card' },
]

const itemSub = (item: LabItem) =>
	item.kind === 'package'
		? `${item.tests} tests${item.fasting ? ' · fasting needed' : ''}`
		: (item.bullets[0] ?? item.sample)

/** "Thu, 24 Sep · 7–9 AM" or "3 visits · …" for the When card. */
const whenTitle = (b: ReturnType<typeof useLabBooking>) => {
	if (b.where === 'lab') {
		return b.clinic ? `${commaDate(b.clinic.date)} · ${b.clinic.time}` : 'Choose a lab and time'
	}
	if (b.dates.length === 0) return 'Choose a collection slot'
	if (b.dates.length === 1) return `${commaDate(b.dates[0])} · ${collectionTimeLabel(timeIdFor(b, b.dates[0]))}`
	return `${b.dates.length} visits · ${b.dates.map((d) => commaDate(d)).join(' · ')}`
}

export default function LabReviewPage() {
	const navigation = useNavigation<Nav>()
	const booking = useLabBooking()
	const isHome = booking.where === 'home'
	const who = useVisitPatientAddress(booking.patientKey)
	const [familyOpen, setFamilyOpen] = useState(false)

	// Re-validate on open: the schedule may have gone by, and this list only offers UPI / card.
	useEffect(() => {
		labBooking.dropExpired()
		if (labBooking.get().method !== 'upi' && labBooking.get().method !== 'card') labBooking.set({ method: 'upi' })
	}, [])

	// Keep the booking store in step with who / where is chosen here (the payment and order screens read it).
	const { member, address } = who
	useEffect(() => {
		labBooking.set({
			patientKey: who.patientKey,
			patientName: member?.name ?? '',
			patientRelation: member?.relation ?? 'Self',
			addressTag: address?.label ?? '',
			addressLine: address ? addressLine(address) : '',
		})
	}, [who.patientKey, member?.name, member?.relation, address])

	const { items, visits, total, mrp, savings } = totalsOf(booking)
	const fasting = needsFasting(booking)
	const fastLabel = items.find((i) => i.fasting)?.fastingLabel
	const lab = labCenterById(booking.clinic?.labId)
	const countLabel = plural(items.length, 'test', 'tests')

	const billRows: BillingRow[] = useMemo(
		() => [
			{ label: `Tests (${items.length}${visits > 1 ? ` × ${visits} visits` : ''})`, value: inr(mrp) },
			{ label: 'Discount', value: `−${inr(savings)}`, tone: 'free' },
			...(isHome ? [{ label: 'Home sample collection', value: 'Free', tone: 'free' as const }] : []),
			{ label: 'To pay', value: inr(total), tone: 'total' as const, dividerBefore: true },
		],
		[items.length, visits, mrp, savings, total, isHome]
	)

	const editTests = () => navigation.navigate(ROUTES.STACK.LABORATORY_SAMPLE_COLLECTION)
	const changeWhen = () =>
		navigation.navigate(isHome ? ROUTES.STACK.LABORATORY_SAMPLE_COLLECTION : ROUTES.STACK.LABORATORY_SELECT_LAB)

	const bannerTitle = isHome ? 'A phlebotomist visits you at your slot' : 'Your lab visit is held for 15 minutes'
	const bannerSub = isHome
		? 'Sample collected at home · reports in the app in about 24 hours'
		: 'Pay now to confirm. Please reach 10 minutes early.'

	const goPay = () => navigation.navigate(ROUTES.STACK.LABORATORY_PAYMENT)

	const stubMissing = isHome ? booking.dates.length === 0 : !booking.clinic

	return (
		<View style={styles.screen}>
			<AppScreenHeader
				variant="bar"
				title="Review & pay"
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
								<Text style={styles.mrp}>{inr(item.mrp)}</Text>
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
								{fasting
									? `Fast for ${fastLabel ?? '10–12 hrs'} before · water is fine`
									: 'No fasting needed'}
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
								<MaterialCommunityIcons
									name="hospital-building"
									size={22}
									color={APP_COLORS.primary}
									style={styles.labIcon}
								/>
								<View style={styles.flex}>
									<Text style={styles.eyebrow}>LAB</Text>
									<Text style={styles.labName}>{lab?.name ?? 'Choose a lab'}</Text>
									{!!lab && <Text style={styles.labAddress}>{lab.address}</Text>}
									{!!lab && (
										<Text
											style={styles.labMeta}
										>{`${lab.km} km away${lab.nabl ? ' · NABL accredited' : ''}`}</Text>
									)}
								</View>
								<TouchableOpacity
									onPress={() => navigation.navigate(ROUTES.STACK.LABORATORY_SELECT_LAB)}
									accessibilityRole="button"
									accessibilityLabel="Change lab"
									style={styles.changeLink}
								>
									<Text style={styles.changeLinkText}>Change</Text>
								</TouchableOpacity>
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
						footer={
							<View style={styles.savePillRow}>
								<View style={styles.savePill}>
									<Text style={styles.savePillText}>{`You save ${inr(savings)}`}</Text>
								</View>
							</View>
						}
					/>
					<Text style={styles.cancelNote}>
						{isHome
							? 'Free cancellation up to [X] hours before your slot.'
							: 'Free cancellation or rescheduling up to [X] hours before your slot.'}
					</Text>
				</AppSection>

				{/* Pay with */}
				<AppSection marginTop={0} title="Pay with" titleSize="sm" gap={0}>
					<AppPaymentMethodList
						methods={REVIEW_METHODS}
						value={booking.method === 'card' ? 'card' : 'upi'}
						onChange={(id) => labBooking.set({ method: id })}
					/>
				</AppSection>
			</ScrollView>

			<AppFooterBar direction="column">
				<AppButton
					size="lg"
					disabled={stubMissing || items.length === 0}
					onPress={goPay}
					icon="shield-lock-outline"
					accessibilityLabel={`Pay ${inr(total)} for ${countLabel}`}
				>
					{`Pay ${inr(total)}`}
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
	labIcon: { marginTop: 1 },
	labName: { fontSize: 14, lineHeight: 20, fontWeight: '700', color: APP_COLORS.ink },
	labAddress: { fontSize: 13, lineHeight: 18, color: APP_COLORS.inkMuted },
	labMeta: { fontSize: 12, lineHeight: 16, fontWeight: '700', color: APP_COLORS.success },
	changeLink: { height: 28, paddingHorizontal: 4, justifyContent: 'center' },
	changeLinkText: { fontSize: 13, fontWeight: '700', color: APP_COLORS.primary },
	savePillRow: { alignItems: 'flex-end' },
	savePill: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 9999, backgroundColor: APP_COLORS.successBg },
	savePillText: { fontSize: 12, fontWeight: '800', color: APP_COLORS.success },
	cancelNote: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
})
