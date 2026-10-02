// src/features/ancillary/patient/AncillaryBookNowReviewPage.tsx
//
// "Book now · Review & pay" for every ancillary type: the services, "Now · as soon as possible" (with a
// "Schedule instead" link), VISIT FOR + VISIT ADDRESS (shared sheets), a note, the bill (the service price
// only -- no instant-visit fee) and the single "Pay after the visit" method.
// "Confirm & find a nurse" -> createInstantRequest -> Finding a nurse (ServiceMatchingPage).

import React, { useRef, useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
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
	AppIconTile,
	AppInfoBanner,
	AppScreenHeader,
	AppSection,
	AppTextLink,
} from '../../../components/common'
import { createInstantRequest } from '../ancillaryProviderBookingService'
import { fetchPatientActiveRequestBackend } from '../ancillaryService'
import { capitalize, inr, itemsFee, plural, providerNoun, selectionFromItems } from './ancillaryBookingCopy'
import { AncillaryPayAfterVisitSection, AncillaryServiceSection } from './AncillaryReviewSections'
import { VisitWhoWhereSection } from './VisitWhoWhereSection'
import { apiErrorMessage, useVisitPatientAddress } from './useVisitPatientAddress'

type Nav = NativeStackNavigationProp<AppStackParamList>
type Route = RouteProp<AppStackParamList, typeof ROUTES.STACK.ANCILLARY_BOOK_NOW_REVIEW>

export default function AncillaryBookNowReviewPage() {
	const navigation = useNavigation<Nav>()
	const route = useRoute<Route>()
	const { serviceKey, serviceLabel, items } = route.params

	const noun = providerNoun(serviceKey)
	const total = itemsFee(items)

	const who = useVisitPatientAddress()
	const [note, setNote] = useState('')
	const [sending, setSending] = useState(false)
	const sendingRef = useRef(false)

	const scheduleInstead = () => navigation.replace(ROUTES.STACK.ANCILLARY_BOOK_VISIT, route.params)

	const onConfirm = async () => {
		if (sendingRef.current) return
		sendingRef.current = true
		setSending(true)
		try {
			const address = await who.resolveBookingAddress()
			if (!address) return
			const requestId = await createInstantRequest({
				selection: selectionFromItems(items),
				patient_public_id: who.patientPublicId,
				address,
				note: note.trim() || undefined,
			})
			if (!requestId) throw new Error('Missing request id')
			// Replace this page, so Back from Finding a nurse doesn't reopen a request that was already sent.
			navigation.replace(ROUTES.STACK.ANCILLARY_SERVICE_MATCHING, {
				bookingId: requestId,
				serviceName: items.map((i) => i.name).join(', '),
				addressText: address.street_address,
				patientName: who.member?.name,
				booking: route.params,
			})
		} catch (e) {
			// One live instant request per patient: resume the one already searching instead of dead-ending.
			if (JSON.stringify((e as any)?.response?.data ?? '').includes('ACTIVE_TASK_EXISTS')) {
				const active = await fetchPatientActiveRequestBackend()
				if (active?.id) {
					Toast.show({ type: 'info', text1: 'You already have a request in progress' })
					navigation.replace(ROUTES.STACK.ANCILLARY_SERVICE_MATCHING, {
						bookingId: active.id,
						serviceName: active.serviceName,
						booking: route.params,
					})
					return
				}
			}
			Toast.show({
				type: 'error',
				text1: "Couldn't start the request",
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
				title="Review & pay"
				subtitle={`${serviceLabel} · now`}
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
							tone="success"
							icon="flash-outline"
							title={`A ${noun} reaches you in about 15–30 min`}
							subtitle={`We ask the nearest verified ${noun}s as soon as you confirm.`}
						/>
					</View>

					<AncillaryServiceSection
						items={items}
						caption={plural(1, 'visit')}
						amount={total}
						onEdit={() => navigation.goBack()}
					/>

					<AppSection
						title="When"
						titleSize="sm"
						marginTop={0}
						right={
							<AppTextLink
								label="Schedule instead"
								onPress={scheduleInstead}
								size="sm"
								trailingIcon="none"
							/>
						}
					>
						<View style={styles.whenRow}>
							<AppIconTile
								icon="flash-outline"
								tone="mint"
								backgroundColor={APP_COLORS.successBg}
								iconColor={APP_COLORS.success}
							/>
							<View style={styles.flex}>
								<Text style={styles.whenTitle}>Now · as soon as possible</Text>
								<Text style={styles.muted}>{`Nearest free ${noun} is assigned automatically`}</Text>
							</View>
						</View>
					</AppSection>

					<VisitWhoWhereSection
						who={who}
						noun={noun}
						note={note}
						onNoteChange={setNote}
						addressHint={`${capitalize(noun)} will come to this address`}
					/>

					<AppSection title="Bill" titleSize="sm" marginTop={0}>
						<AppBillSummary
							variant="flat"
							dashedDividers
							rows={[
								...items.map((i) => ({ label: i.name, value: inr(i.price) })),
								{ label: 'To pay', value: inr(total), tone: 'total' as const, dividerBefore: true },
							]}
						/>
						<Text style={styles.muted}>
							{`You pay ${inr(total)} after the visit. Free cancellation until a ${noun} is assigned.`}
						</Text>
					</AppSection>

					<AncillaryPayAfterVisitSection noun={noun} />
				</ScrollView>
			</KeyboardAvoidingView>

			<AppFooterBar>
				<AppButton
					size="lg"
					icon="flash-outline"
					style={styles.flex}
					onPress={() => void onConfirm()}
					loading={sending}
					disabled={sending || who.addrLoading}
					softDisabled
					accessibilityLabel={`Confirm and find a ${noun}`}
				>
					{`Confirm & find a ${noun}`}
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
	whenRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
	whenTitle: { fontSize: 15, lineHeight: 20, fontWeight: '700', color: APP_COLORS.ink },
	muted: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
})
