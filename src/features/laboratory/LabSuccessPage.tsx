// src/features/laboratory/LabSuccessPage.tsx
//
// "Payment successful" (home collection) and "Booked · in-clinic" from the Lab Tests Ordering design, on the
// shared AppBookingSuccess layout: hero, an elevated ticket (tests, when, order id, where), "What happens
// next", the payment line and Back to home / View order. Reads the order placed on the Payment screen.

import React, { useEffect, useState } from 'react'
import { StyleSheet } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { AppActionChip, AppBookingSuccess, AppIconTile, AppPathIcon, AppTag } from '../../components/common'
import { APP_COLORS } from '../../config/theme'
import { ROUTES } from '../../navigation/routes'
import type { AppStackParamList } from '../../navigation/types'
import { addToCalendar } from '../../utils/calendar'
import { showComingSoon } from '../../utils/toast'
import { labBooking, type LabOrder } from './labBookingStore'
import { commaDate, inr, plural, slotStart } from './labFormat'
import { windowPhrase } from './labOrder'
import { LAB_ICONS } from './labMock'

type Nav = NativeStackNavigationProp<AppStackParamList>

function LabSuccessContent({ order }: { order: LabOrder }) {
	const navigation = useNavigation<Nav>()
	const isHome = order.where === 'home'
	const first = order.visits[0]
	const savings = order.mrpTotal - order.total

	const names = order.items.map((i) => i.name)
	const testsTitle = order.items.length === 1 ? names[0] : `${order.items.length} lab tests`
	const testsSub = order.items.length === 1 ? order.items[0].sub : names.join(', ')

	const firstDate = first ? commaDate(first.date) : ''
	const firstTime = first?.time ?? ''
	const subtitle = isHome
		? order.visitCount > 1
			? `Your first visit is on ${firstDate}, ${windowPhrase(firstTime)}.`
			: `A phlebotomist will visit your home on ${firstDate} between ${windowPhrase(firstTime)}.`
		: `See you at ${order.addressTitle} on ${firstDate} at ${firstTime}.`

	const later = order.method === 'later'
	const steps = [
		{
			title: isHome ? 'Fast tonight' : 'Fast before your visit',
			body: 'No food for 10–12 hours before your slot. Water is fine.',
			tone: 'warn' as const,
			show: order.fasting,
		},
		{
			title: isHome ? 'Sample collection at home' : 'Visit the lab',
			body: isHome
				? `Your phlebotomist will call before arriving on ${firstDate}.`
				: 'Reach 10 minutes early and show your booking at the front desk.',
			tone: undefined,
			show: true,
		},
		{
			title: 'Reports in the app',
			body: "We'll notify you when results are ready, usually within 24 hours.",
			tone: undefined,
			show: true,
		},
	]
		.filter((s) => s.show)
		.map(({ title, body, tone }) => ({ title, body, tone }))

	const addToCal = () => {
		if (!first) return showComingSoon()
		const start = slotStart(first.date, first.time)
		void addToCalendar({
			title: isHome ? 'Lab tests · home sample collection' : `Lab tests · ${order.addressTitle}`,
			start,
			end: new Date(start.getTime() + 60 * 60_000),
			location: isHome ? order.addressSub : [order.addressTitle, order.addressSub].filter(Boolean).join(', '),
			notes: `KarolaHealth order ${order.id}. For ${order.patientName}.`,
		})
	}

	const backHome = () => {
		navigation.navigate(ROUTES.MAIN.TABS, { screen: ROUTES.MAIN.HOME })
		labBooking.reset()
	}

	return (
		<AppBookingSuccess
			badge={later ? `Booking confirmed · ${inr(order.total)}` : `Payment successful · ${inr(order.total)}`}
			title="Your tests are booked"
			subtitle={subtitle}
			ticket={{
				header: {
					leading: (
						<AppIconTile tone="mint" size={48} radius={14}>
							<AppPathIcon d={LAB_ICONS.flask} size={24} strokeWidth={2} color={APP_COLORS.primary} />
						</AppIconTile>
					),
					title: testsTitle,
					subtitle: testsSub,
					subtitleColor: APP_COLORS.inkMuted,
					trailing: (
						<AppTag
							label="Confirmed"
							tone="confirmed"
							shape="pill"
							style={styles.pill}
							textStyle={styles.pillText}
						/>
					),
				},
				fields: [
					{
						label: 'When',
						value: order.visitCount > 1 ? plural(order.visitCount, 'visit', 'visits') : firstTime,
						sub: order.visitCount > 1 ? order.visits.map((v) => commaDate(v.date)).join(' · ') : firstDate,
						emphasis: true,
					},
					{ label: 'Order ID', value: order.id, sub: `For ${order.patientName}` },
					{ label: 'Where', value: order.addressTitle, sub: order.addressSub || undefined, full: true },
				],
				actions: (
					<>
						<AppActionChip
							label="Add to calendar"
							icon="calendar-blank-outline"
							variant="tinted"
							tone="mint"
							style={styles.flex}
							onPress={addToCal}
						/>
						<AppActionChip
							label="Receipt"
							icon="download-outline"
							variant="tinted"
							tone="sky"
							style={styles.flex}
							onPress={() => showComingSoon()}
						/>
					</>
				),
			}}
			stepsTitle="What happens next"
			steps={steps}
			paymentText={
				later
					? `${inr(order.total)} to pay at ${isHome ? 'collection' : 'the lab'}`
					: `${inr(order.total)} paid via ${order.methodLabel}`
			}
			paymentSub={later ? undefined : `Transaction ${order.transactionId}`}
			paymentNote={savings > 0 ? `You saved ${inr(savings)}` : undefined}
			secondary={{ label: 'Back to home', onPress: backHome }}
			primary={{
				label: 'View order',
				onPress: () => navigation.navigate(ROUTES.STACK.LABORATORY_BOOKING_TRACKING),
			}}
		/>
	)
}

/**
 * The order is read once on mount: "Back to home" clears the store, and this screen must not re-render
 * with an empty booking while the transition runs. Opened without a placed order (nothing to show), it
 * goes back to the catalogue instead of inventing one.
 */
export default function LabSuccessPage() {
	const navigation = useNavigation<Nav>()
	const [order] = useState(() => labBooking.get().order)
	useEffect(() => {
		if (!order) navigation.replace(ROUTES.STACK.LABORATORY_LIST)
	}, [order, navigation])
	if (!order) return null
	return <LabSuccessContent order={order} />
}

const styles = StyleSheet.create({
	flex: { flex: 1 },
	pill: { alignSelf: 'center' },
	pillText: { fontWeight: '800' },
})
