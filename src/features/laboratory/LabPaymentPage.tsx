// src/features/laboratory/LabPaymentPage.tsx
//
// "Payment" (Step 2 of 2) from the Lab Tests Ordering design: the mint ticket with the amount to pay, when /
// where / who and a collapsible list of the tests, the "Pay with" methods (UPI, card, net banking, pay at
// collection) and the pay CTA. Same building blocks as the doctor Payment screen (AppTicketCard,
// AppPaymentMethodList, AppSecurePaymentNote, AppFooterBar). There is no payment gateway: the CTA places the
// mock order and opens "Payment successful".

import React, { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import {
	AppButton,
	AppFooterBar,
	AppIcon,
	AppPathIcon,
	AppPaymentMethodList,
	AppScreenHeader,
	AppSection,
	AppSecurePaymentNote,
	AppTicketCard,
	type AppPaymentMethod,
} from '../../components/common'
import { APP_COLORS } from '../../config/theme'
import { ROUTES } from '../../navigation/routes'
import type { AppStackParamList } from '../../navigation/types'
import { showComingSoon } from '../../utils/toast'
import { labBooking, timeIdFor, totalsOf, useLabBooking } from './labBookingStore'
import { commaDate, inr, plural } from './labFormat'
import { placeLabOrder } from './labOrder'
import { LAB_ICONS, collectionTimeLabel, labCenterById, type LabPayMethod } from './labMock'

type Nav = NativeStackNavigationProp<AppStackParamList>

const BANKS = ['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank']

export default function LabPaymentPage() {
	const navigation = useNavigation<Nav>()
	const booking = useLabBooking()
	const [detailsOpen, setDetailsOpen] = useState(false)

	const isHome = booking.where === 'home'
	const { items, visits, total, savings } = totalsOf(booking)
	const lab = labCenterById(booking.clinic?.labId)
	const method = booking.method

	const methods = useMemo<AppPaymentMethod<LabPayMethod>[]>(
		() => [
			{
				id: 'upi',
				title: 'UPI',
				subtitle: 'Pay from any UPI app',
				icon: 'phone',
				expand: 'upi',
				helper: "You'll get a payment request in your UPI app.",
			},
			{
				id: 'card',
				title: 'Credit or debit card',
				subtitle: 'Visa, Mastercard, RuPay',
				icon: 'card',
				expand: 'card',
				cardExtras: true,
			},
			{
				id: 'netbank',
				title: 'Net banking',
				subtitle: 'All major Indian banks',
				icon: 'bank',
				expand: 'bank',
				banks: BANKS,
				helper: "You'll approve the payment on your bank's page.",
			},
			{
				id: 'later',
				title: isHome ? 'Pay at collection' : 'Pay at the lab',
				subtitle: isHome ? 'Cash or UPI when we visit' : 'Cash, card or UPI at the front desk',
				icon: 'cash',
				expand: 'note',
				note: isHome
					? `Your slot is held now. Keep ${inr(total)} ready for the phlebotomist.`
					: 'Your slot is held now. Please arrive 10 minutes early to pay and check in.',
			},
		],
		[isHome, total]
	)

	// WHEN / WHERE for the ticket.
	const homeTime = booking.dates[0] ? collectionTimeLabel(timeIdFor(booking, booking.dates[0])) : ''
	const whenValue = isHome ? (visits > 1 ? `${visits} visits` : homeTime) : (booking.clinic?.time ?? '')
	const whenSub = isHome
		? booking.dates.map((d) => commaDate(d)).join(' · ')
		: booking.clinic
			? commaDate(booking.clinic.date)
			: ''

	const payLabel = method === 'later' ? 'Confirm booking' : `Pay ${inr(total)}`

	const handlePay = () => {
		const order = placeLabOrder(labBooking.get())
		labBooking.set({ order })
		// Reset (not push): back from "Payment successful" must not return to Review & pay and place a second order.
		navigation.reset({
			index: 1,
			routes: [{ name: ROUTES.MAIN.TABS }, { name: ROUTES.STACK.LABORATORY_PAYMENT_SUCCESS }],
		})
	}

	return (
		<View style={styles.screen}>
			<AppScreenHeader
				variant="bar"
				title="Payment"
				subtitle="Step 2 of 2"
				onBack={() => navigation.goBack()}
				backAccessibilityLabel="Back"
			/>

			<ScrollView
				contentContainerStyle={styles.content}
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
			>
				<AppSection marginTop={0} accessibilityLabel="Order summary">
					<AppTicketCard
						tint="mint"
						cutoutColor={APP_COLORS.surface}
						header={{
							eyebrow: 'Amount to pay',
							title: inr(total),
							titleSize: 30,
							trailing: (
								<View style={styles.savePill}>
									<Text style={styles.savePillText}>{`You save ${inr(savings)}`}</Text>
								</View>
							),
						}}
						fields={[
							{ label: 'When', value: whenValue || '—', sub: whenSub, emphasis: true },
							{
								label: 'Where',
								value: isHome ? 'At home' : (lab?.name ?? ''),
								sub: isHome ? booking.addressLine : lab?.address,
							},
						]}
						forPatient={{ name: booking.patientName || 'Myself', relation: booking.patientRelation }}
						footer={
							<>
								<TouchableOpacity
									style={styles.detailsBtn}
									onPress={() => setDetailsOpen((v) => !v)}
									accessibilityRole="button"
									accessibilityState={{ expanded: detailsOpen }}
								>
									<View style={styles.detailsLeft}>
										<AppPathIcon
											d={LAB_ICONS.flask}
											size={20}
											strokeWidth={2}
											color={APP_COLORS.primary}
										/>
										<Text
											style={styles.detailsText}
										>{`${plural(items.length, 'test', 'tests')} in this order`}</Text>
									</View>
									<View style={styles.detailsRight}>
										<Text style={styles.detailsToggle}>{detailsOpen ? 'Hide' : 'Details'}</Text>
										<AppPathIcon
											d={detailsOpen ? 'M6 15l6-6 6 6' : LAB_ICONS.chevronDown}
											size={16}
											strokeWidth={2.4}
											color={APP_COLORS.primary}
										/>
									</View>
								</TouchableOpacity>
								{detailsOpen && (
									<View style={styles.detailsList}>
										{items.map((i) => (
											<View key={i.id} style={styles.detailLine}>
												<Text style={styles.detailName}>{i.name}</Text>
												<Text style={styles.detailPrice}>{inr(i.price)}</Text>
											</View>
										))}
										{isHome && (
											<View style={styles.detailLine}>
												<Text style={styles.detailMuted}>Home sample collection</Text>
												<Text style={styles.detailFree}>Free</Text>
											</View>
										)}
									</View>
								)}
							</>
						}
					/>
				</AppSection>

				<AppSection marginTop={0} title="Pay with" gap={4} style={styles.paySection}>
					<AppPaymentMethodList
						methods={methods}
						value={method}
						onChange={(id) => labBooking.set({ method: id })}
					/>
				</AppSection>

				<AppSecurePaymentNote
					text="Payments are encrypted. We never store your CVV."
					style={styles.encryption}
				/>
			</ScrollView>

			<AppFooterBar direction="column">
				<AppButton
					size="lg"
					onPress={handlePay}
					disabled={items.length === 0}
					icon={({ color }) => <AppIcon name="lock" size={18} color={color} />}
					accessibilityLabel={payLabel}
				>
					{payLabel}
				</AppButton>
				<Text style={styles.terms}>
					By continuing you agree to the{' '}
					<Text style={styles.termsLink} onPress={() => showComingSoon()} accessibilityRole="link">
						booking terms
					</Text>
				</Text>
			</AppFooterBar>
		</View>
	)
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: APP_COLORS.pageBg },
	content: { gap: 8, paddingBottom: 8 },
	savePill: {
		alignSelf: 'flex-end',
		marginBottom: 6,
		paddingVertical: 4,
		paddingHorizontal: 10,
		borderRadius: 9999,
		backgroundColor: APP_COLORS.successBg,
	},
	savePillText: { fontSize: 12, fontWeight: '800', color: APP_COLORS.success },
	detailsBtn: {
		minHeight: 44,
		paddingHorizontal: 12,
		borderRadius: 12,
		backgroundColor: '#FFFFFF',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 8,
	},
	detailsLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
	detailsText: { fontSize: 14, lineHeight: 20, fontWeight: '600', color: APP_COLORS.ink },
	detailsRight: { flexDirection: 'row', alignItems: 'center', gap: 2 },
	detailsToggle: { fontSize: 14, fontWeight: '700', color: APP_COLORS.primary },
	detailsList: { gap: 8, paddingHorizontal: 4, paddingTop: 4 },
	detailLine: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
	detailName: { flex: 1, fontSize: 14, lineHeight: 20, color: APP_COLORS.ink },
	detailPrice: { fontSize: 14, lineHeight: 20, fontWeight: '700', color: APP_COLORS.ink },
	detailMuted: { flex: 1, fontSize: 14, lineHeight: 20, color: APP_COLORS.inkMuted },
	detailFree: { fontSize: 14, lineHeight: 20, fontWeight: '700', color: APP_COLORS.success },
	paySection: { paddingBottom: 0 },
	encryption: { marginTop: 4, marginHorizontal: 16 },
	terms: { textAlign: 'center', fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	termsLink: { color: APP_COLORS.primary, textDecorationLine: 'underline' },
})
