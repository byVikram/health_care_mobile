// src/features/ancillary/patient/AncillaryReviewPayPage.tsx
//
// "Later · Review & pay" for every ancillary type: the services, the picked days + one time (Edit -> back),
// VISIT FOR + VISIT ADDRESS (shared sheets), a note, the bill (price × visits) and the single "Pay after
// the visit" method. "Confirm booking" -> createAncillaryOrder WITHOUT a provider -> Booking details.
// A nurse is assigned to each visit 1 hour before it starts; a visit can be cancelled free up to 2 hours before.

import React, { useRef, useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import { CommonActions, useNavigation, useRoute } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RouteProp } from '@react-navigation/native'
import Toast from 'react-native-toast-message'
import { APP_COLORS } from '../../../config/theme'
import { ROUTES } from '../../../navigation/routes'
import type { AppStackParamList } from '../../../navigation/types'
import {
	AppBillSummary,
	AppButton,
	AppFooterBar,
	AppInfoBanner,
	AppScreenHeader,
	AppSection,
	AppVisitList,
} from '../../../components/common'
import { createAncillaryOrder } from '../ancillaryProviderBookingService'
import { useVisitPolicy } from '../hooks/useVisitPolicy'
import {
	capitalize,
	dayLabel,
	inr,
	itemsDurationLabel,
	itemsFee,
	itemsSummary,
	leadText,
	plural,
	providerNoun,
	selectionFromItems,
	timeLabel,
} from './ancillaryBookingCopy'
import { AncillaryPayAfterVisitSection, AncillaryServiceSection } from './AncillaryReviewSections'
import { VisitWhoWhereSection } from './VisitWhoWhereSection'
import { apiErrorMessage, useVisitPatientAddress } from './useVisitPatientAddress'

type Nav = NativeStackNavigationProp<AppStackParamList>
type Route = RouteProp<AppStackParamList, typeof ROUTES.STACK.ANCILLARY_REVIEW_PAY>

export default function AncillaryReviewPayPage() {
	const navigation = useNavigation<Nav>()
	const route = useRoute<Route>()
	const { serviceKey, serviceLabel, items, visits } = route.params

	const policy = useVisitPolicy()
	const noun = providerNoun(serviceKey)
	const n = visits.length
	const fee = itemsFee(items)
	const duration = itemsDurationLabel(items)

	const who = useVisitPatientAddress()
	const [note, setNote] = useState('')
	const [sending, setSending] = useState(false)
	const sendingRef = useRef(false)

	const onConfirm = async () => {
		if (sendingRef.current) return
		sendingRef.current = true
		setSending(true)
		try {
			const address = await who.resolveBookingAddress()
			if (!address) return
			const order = await createAncillaryOrder({
				selection: selectionFromItems(items),
				visits,
				patient_public_id: who.patientPublicId,
				address,
				note: note.trim() || undefined,
			})
			// Replace Schedule a visit + Review & pay with Booking details, so Back doesn't reopen a booked order.
			navigation.dispatch((state) => {
				const routes = state.routes.filter(
					(r) => r.name !== ROUTES.STACK.ANCILLARY_BOOK_VISIT && r.name !== ROUTES.STACK.ANCILLARY_REVIEW_PAY
				)
				const next = [
					...routes,
					{
						key: `${ROUTES.STACK.ANCILLARY_SCHEDULED_DETAILS}-${order.request_public_id}`,
						name: ROUTES.STACK.ANCILLARY_SCHEDULED_DETAILS,
						params: { requestId: order.request_public_id },
					},
				]
				return CommonActions.reset({ ...state, routes: next, index: next.length - 1 } as typeof state)
			})
		} catch (e) {
			Toast.show({
				type: 'error',
				text1: "Couldn't confirm the booking",
				text2: apiErrorMessage(e) || 'Please try again.',
			})
		} finally {
			sendingRef.current = false
			setSending(false)
		}
	}

	return (
		<View style={styles.container}>
			<AppScreenHeader
				variant="bar"
				solid
				title="Review & pay"
				subtitle={`${serviceLabel} · ${plural(n, 'visit')}`}
				onBack={() => navigation.goBack()}
			/>

			<KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
				<ScrollView
					contentContainerStyle={styles.scroll}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					<View style={styles.bannerWrap}>
						<AppInfoBanner
							tone="sky"
							icon={null}
							title={`${capitalize(noun)} assigned ${leadText(policy.assign_lead_minutes)} before each visit`}
							subtitle="You’ll get their name, photo and start code then."
						/>
					</View>

					<AncillaryServiceSection
						items={items}
						caption={fee > 0 ? `${inr(fee)} per visit` : ''}
						amount={fee}
						// Back past Schedule a visit to the catalogue, where the cart is still intact.
						onEdit={() => navigation.pop(2)}
					/>

					<AppSection marginTop={0}>
						<AppVisitList
							title={`When · ${plural(n, 'visit')}`}
							onEdit={() => navigation.goBack()}
							visits={visits.map((v, i) => ({
								key: v.date,
								index: i + 1,
								title: dayLabel(v.date),
								sub: [timeLabel(v.start_time), duration].filter(Boolean).join(' · '),
							}))}
						/>
					</AppSection>

					<VisitWhoWhereSection who={who} noun={noun} note={note} onNoteChange={setNote} />

					<AppSection title="Bill" titleSize="sm" marginTop={0}>
						<AppBillSummary
							variant="flat"
							dashedDividers
							rows={[
								{
									label: `${itemsSummary(items)} · per visit`,
									value: inr(fee),
								},
								{ label: 'Visit fee', value: 'Free', tone: 'free' },
								{
									label: 'To pay after each visit',
									value: inr(fee),
									tone: 'total',
									dividerBefore: true,
								},
							]}
						/>
						<Text
							style={styles.muted}
						>{`You pay ${inr(fee)} after each visit — nothing is charged now.`}</Text>
						<Text style={styles.muted}>
							{`Free cancellation up to ${leadText(policy.cancel_cutoff_minutes)} before each visit.`}
						</Text>
					</AppSection>

					<AncillaryPayAfterVisitSection noun={noun} />
				</ScrollView>
			</KeyboardAvoidingView>

			<AppFooterBar>
				<AppButton
					size="lg"
					style={styles.flex}
					onPress={() => void onConfirm()}
					loading={sending}
					disabled={sending || who.addrLoading}
					softDisabled
					accessibilityLabel="Confirm booking"
				>
					Confirm booking
				</AppButton>
			</AppFooterBar>
		</View>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: APP_COLORS.pageBg },
	flex: { flex: 1, minWidth: 0 },
	scroll: { gap: 8, paddingBottom: 16 },
	bannerWrap: { marginTop: 16, marginHorizontal: 16, marginBottom: 0 },
	muted: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
})
