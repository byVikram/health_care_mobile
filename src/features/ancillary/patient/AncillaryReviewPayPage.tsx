// src/features/ancillary/patient/AncillaryReviewPayPage.tsx
//
// "2d · Review & pay": "{first} confirms within 30 minutes" banner, the chosen provider (Change -> back),
// the visit plan (Edit -> back), VISIT FOR (family sheet) + VISIT ADDRESS (address sheet: saved
// addresses, add new, use my current location), an optional note, the bill (fee × visits), the single
// "Pay after each visit" method and "Send request" -> createAncillaryOrder -> Request sent.
// A 409 (a slot was taken meanwhile) returns to Book visit, which re-fetches availability on focus.

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { CommonActions, useNavigation, useRoute } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RouteProp } from '@react-navigation/native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import * as Location from 'expo-location'
import axios from 'axios'
import Toast from 'react-native-toast-message'
import { APP_COLORS, toneForString } from '../../../config/theme'
import { ROUTES } from '../../../navigation/routes'
import type { AncillaryBookVisitParams, AppStackParamList } from '../../../navigation/types'
import { useFamilyMembers } from '../../../hooks/useFamilyMembers'
import { getCurrentLocation } from '../../../services/locationService'
import { buildS3Url } from '../../../utils/s3Utils'
import { showComingSoon } from '../../../utils/toast'
import {
	createPatientAddress,
	getPatientAddresses,
	type PatientAddress,
} from '../../profile/patient/PatientProfileService'
import {
	AppAddressSheet,
	AppAvatar,
	AppBillSummary,
	AppButton,
	AppFamilyMemberSheet,
	AppFooterBar,
	AppInfoBanner,
	AppPatientRow,
	AppPaymentMethodList,
	AppScreenHeader,
	AppSection,
	AppTextLink,
	AppVisitList,
	NotesInput,
	familyMemberFirstName,
	providerMetaLine,
} from '../../../components/common'
import type { AppAddressDraft, AppAddressPrefill } from '../../../components/common'
import {
	ANCILLARY_BOOKING_CONFIRM_MINUTES,
	PAY_AFTER_VISIT,
	createAncillaryOrder,
} from '../ancillaryProviderBookingService'
import {
	capitalize,
	dayLabel,
	distanceLabel,
	experienceLabel,
	firstName,
	inr,
	itemsDurationLabel,
	itemsSummary,
	plural,
	providerNoun,
	selectionFromItems,
	timeLabel,
} from './ancillaryBookingCopy'
import { useBookingLocation } from './useBookingLocation'

type Nav = NativeStackNavigationProp<AppStackParamList>
type Route = RouteProp<AppStackParamList, typeof ROUTES.STACK.ANCILLARY_REVIEW_PAY>

const NOTE_MAX = 300

const addressLine = (a: PatientAddress) =>
	[a.address_line, a.city, a.state].filter(Boolean).join(', ') + (a.pincode ? ` - ${a.pincode}` : '')

const errorMessage = (e: unknown) => {
	if (axios.isAxiosError(e)) {
		const data = e.response?.data as { message?: string; detail?: unknown } | undefined
		if (data?.message) return data.message
		if (typeof data?.detail === 'string') return data.detail
	}
	return e instanceof Error ? e.message : ''
}

export default function AncillaryReviewPayPage() {
	const navigation = useNavigation<Nav>()
	const route = useRoute<Route>()
	const { serviceKey, serviceLabel, items, provider, visits } = route.params

	const noun = providerNoun(serviceKey)
	const provFirst = firstName(provider.name)
	const n = visits.length
	const fee = provider.fee_per_visit
	const total = fee * n
	const duration = itemsDurationLabel(items)

	// ---- Patient ----
	const { members } = useFamilyMembers()
	const [patientKey, setPatientKey] = useState('self')
	const [familyOpen, setFamilyOpen] = useState(false)
	const memberIndex = Math.max(
		0,
		members.findIndex((m) => m.key === patientKey)
	)
	const member = members[memberIndex] ?? members[0]

	// ---- Address ----
	const [addresses, setAddresses] = useState<PatientAddress[]>([])
	const [addrLoading, setAddrLoading] = useState(true)
	const [addrError, setAddrError] = useState<string | null>(null)
	const [addressId, setAddressId] = useState<string | null>(null)
	const [addrOpen, setAddrOpen] = useState(false)
	const activeRef = useRef(true)
	const { coords: bookingCoords, locate } = useBookingLocation()

	useEffect(() => {
		activeRef.current = true
		return () => {
			activeRef.current = false
		}
	}, [])

	const loadAddresses = useCallback(async (selectId?: string | null) => {
		setAddrLoading(true)
		setAddrError(null)
		try {
			const list = await getPatientAddresses()
			if (!activeRef.current) return list
			setAddresses(list)
			setAddressId((cur) => {
				const want = selectId ?? cur
				if (want && list.some((a) => a.id === want)) return want
				return (list.find((a) => a.is_default) ?? list[0])?.id ?? null
			})
			return list
		} catch {
			if (activeRef.current) setAddrError("Couldn't load your saved addresses")
			return null
		} finally {
			if (activeRef.current) setAddrLoading(false)
		}
	}, [])

	useEffect(() => {
		void loadAddresses()
	}, [loadAddresses])

	const address = addresses.find((a) => a.id === addressId) ?? null

	const saveAddress = async (draft: AppAddressDraft) => {
		const line = [draft.flat, draft.area, draft.landmark ? `Near ${draft.landmark}` : ''].filter(Boolean).join(', ')
		try {
			const res: { data?: { id?: string } } | undefined = await createPatientAddress({
				label: draft.label,
				address_line: line,
				city: draft.city,
				state: draft.state,
				pincode: draft.pincode,
				latitude: draft.latitude,
				longitude: draft.longitude,
				is_default: addresses.length === 0,
			})
			const list = await loadAddresses(res?.data?.id ?? null)
			if (!res?.data?.id && list) {
				const match = list.find((a) => a.address_line === line && a.pincode === draft.pincode)
				if (match) setAddressId(match.id)
			}
			Toast.show({ type: 'success', text1: 'Address saved' })
			return true
		} catch (e) {
			Toast.show({
				type: 'error',
				text1: "Couldn't save the address",
				text2: errorMessage(e) || 'Please try again.',
			})
			return false
		}
	}

	const useCurrentLocation = async (): Promise<AppAddressPrefill | null> => {
		try {
			const c = await getCurrentLocation()
			let prefill: AppAddressPrefill = { latitude: c.latitude, longitude: c.longitude }
			try {
				const [geo] = await Location.reverseGeocodeAsync(c)
				if (geo) {
					prefill = {
						...prefill,
						area: [geo.street, geo.district || geo.subregion].filter(Boolean).join(', ') || undefined,
						city: geo.city || undefined,
						state: geo.region || undefined,
						pincode: geo.postalCode || undefined,
					}
				}
			} catch {
				// Coordinates alone are still useful; the patient types the rest.
			}
			return prefill
		} catch (e) {
			const denied = e instanceof Error && /denied/i.test(e.message)
			Toast.show({
				type: 'error',
				text1: denied ? 'Location permission is off' : "Couldn't get your location",
				text2: denied ? 'Allow location access, or type the address.' : 'Please type the address instead.',
			})
			return null
		}
	}

	// ---- Note ----
	const [note, setNote] = useState('')

	// ---- Submit ----
	const [sending, setSending] = useState(false)

	const onSend = async () => {
		if (sending) return
		if (!address) {
			Toast.show({ type: 'info', text1: 'Add the visit address first' })
			setAddrOpen(true)
			return
		}
		setSending(true)
		try {
			let lat = address.latitude
			let lng = address.longitude
			if (lat == null || lng == null) {
				const c = bookingCoords ?? (await locate())
				lat = c?.latitude
				lng = c?.longitude
			}
			if (lat == null || lng == null) {
				Toast.show({
					type: 'error',
					text1: "We couldn't place this address on the map",
					text2: 'Turn on location, or add the address with "Use my current location".',
				})
				return
			}
			const order = await createAncillaryOrder({
				provider_public_id: provider.provider_public_id,
				selection: selectionFromItems(items),
				visits,
				patient_public_id: member && member.key !== 'self' ? member.id : undefined,
				address: { street_address: addressLine(address), latitude: lat, longitude: lng, label: address.label },
				note: note.trim() || undefined,
			})
			const booking: AncillaryBookVisitParams = {
				serviceKey,
				serviceLabel,
				items,
				initialDates: visits.map((v) => v.date),
			}
			// Replace Book visit + Review & pay with Request sent, so Back doesn't reopen a sent booking.
			navigation.dispatch((state) => {
				const routes = state.routes.filter(
					(r) => r.name !== ROUTES.STACK.ANCILLARY_BOOK_VISIT && r.name !== ROUTES.STACK.ANCILLARY_REVIEW_PAY
				)
				const next = [
					...routes,
					{
						key: `${ROUTES.STACK.ANCILLARY_REQUEST_SENT}-${order.request_public_id}`,
						name: ROUTES.STACK.ANCILLARY_REQUEST_SENT,
						params: { requestId: order.request_public_id, booking },
					},
				]
				return CommonActions.reset({ ...state, routes: next, index: next.length - 1 } as typeof state)
			})
		} catch (e) {
			if (axios.isAxiosError(e) && e.response?.status === 409) {
				Toast.show({
					type: 'error',
					text1: `That time was just taken`,
					text2: errorMessage(e) || `Pick another time — ${provFirst}'s free slots have been refreshed.`,
				})
				navigation.goBack()
			} else {
				Toast.show({
					type: 'error',
					text1: "Couldn't send the request",
					text2: errorMessage(e) || 'Please try again.',
				})
			}
		} finally {
			if (activeRef.current) setSending(false)
		}
	}

	// ---- Render ----
	const meta = providerMetaLine({
		experienceLabel: experienceLabel(provider.experience_years),
		distanceLabel: distanceLabel(provider.distance_km),
	})
	const tone = toneForString(provider.name)
	const roleLine = [capitalize(provider.specialty || noun), meta].filter(Boolean).join(' · ')

	const addressTag = address ? address.label.toUpperCase() : ''
	const confirmMins = ANCILLARY_BOOKING_CONFIRM_MINUTES

	return (
		<View style={styles.container}>
			<AppScreenHeader
				variant="bar"
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
							icon="clock-outline"
							title={`${provFirst} confirms within ${confirmMins} minutes`}
							subtitle={`If ${provFirst} can't make it, you can pick another ${noun}. Nothing is charged now.`}
						/>
					</View>

					<AppSection
						title={`Your ${noun}`}
						titleSize="sm"
						marginTop={0}
						right={
							<AppTextLink
								label="Change"
								onPress={() => navigation.goBack()}
								size="sm"
								trailingIcon="none"
								accessibilityLabel={`Change ${noun}`}
							/>
						}
					>
						<View style={styles.providerRow}>
							<AppAvatar
								uri={buildS3Url(provider.avatar_url)}
								name={provider.name}
								size={52}
								backgroundColor={tone.bg}
								initialsColor={tone.ink}
								initialsStyle={styles.initials}
							/>
							<View style={styles.flex}>
								<Text style={styles.providerName} numberOfLines={1}>
									{provider.name}
								</Text>
								{!!roleLine && <Text style={styles.muted}>{roleLine}</Text>}
							</View>
						</View>
					</AppSection>

					<AppSection marginTop={0}>
						<AppVisitList
							title={`${plural(n, 'visit')} · ${itemsSummary(items)}`}
							onEdit={() => navigation.goBack()}
							visits={visits.map((v, i) => ({
								key: v.date,
								index: i + 1,
								title: dayLabel(v.date),
								sub: [timeLabel(v.start_time), duration].filter(Boolean).join(' · '),
							}))}
						/>
					</AppSection>

					<AppSection marginTop={0} accessibilityLabel="Patient and address" style={styles.patientSection}>
						{!!member && (
							<AppPatientRow
								member={member}
								label="VISIT FOR"
								toneIndex={memberIndex}
								onChange={() => setFamilyOpen(true)}
							/>
						)}
						<TouchableOpacity
							style={styles.addrRow}
							onPress={() => setAddrOpen(true)}
							activeOpacity={0.8}
							accessibilityRole="button"
							accessibilityLabel={
								address
									? `Visit address, ${address.label}, ${addressLine(address)}. Change`
									: 'Add visit address'
							}
						>
							<View style={styles.addrTile}>
								<MaterialCommunityIcons name="home-outline" size={22} color={APP_COLORS.primary} />
							</View>
							<View style={styles.flex}>
								<Text style={styles.eyebrow}>
									{address ? `VISIT ADDRESS · ${addressTag}` : 'VISIT ADDRESS'}
								</Text>
								{addrLoading && !address ? (
									<Text style={styles.muted}>Loading your addresses…</Text>
								) : address ? (
									<>
										<Text style={styles.addrLine1} numberOfLines={1}>
											{address.address_line}
										</Text>
										<Text style={styles.addrLine2} numberOfLines={1}>
											{[address.city, address.pincode].filter(Boolean).join(' ')}
										</Text>
									</>
								) : (
									<Text style={[styles.addrLine1, styles.addrMissing]}>
										{addrError ? "Couldn't load addresses — tap to retry" : 'Add the visit address'}
									</Text>
								)}
							</View>
							<MaterialCommunityIcons name="chevron-right" size={20} color={APP_COLORS.border} />
						</TouchableOpacity>
						<NotesInput
							variant="field"
							label={`Note for the ${noun} (optional)`}
							placeholder="e.g. Ring the bell twice, 2nd floor"
							value={note}
							onChangeValue={setNote}
							maxLength={NOTE_MAX}
						/>
					</AppSection>

					<AppSection title="Bill" titleSize="sm" marginTop={0}>
						<AppBillSummary
							variant="flat"
							dashedDividers
							rows={[
								{ label: `${inr(fee)} × ${plural(n, 'visit')}`, value: inr(total) },
								{ label: 'Visit fee', value: 'Free', tone: 'free' },
								{ label: 'To pay', value: inr(total), tone: 'total', dividerBefore: true },
							]}
						/>
						<Text
							style={styles.muted}
						>{`You pay ${inr(fee)} after each visit — nothing is charged now.`}</Text>
					</AppSection>

					<AppSection title="Pay with" titleSize="sm" marginTop={0}>
						<AppPaymentMethodList
							methods={[
								{
									id: PAY_AFTER_VISIT,
									title: 'Pay after each visit',
									subtitle: `Cash or UPI to the ${noun}`,
									icon: 'cash',
								},
							]}
							value={PAY_AFTER_VISIT}
							onChange={() => undefined}
						/>
					</AppSection>
				</ScrollView>
			</KeyboardAvoidingView>

			<AppFooterBar>
				<AppButton
					size="lg"
					icon="send-outline"
					style={styles.flex}
					onPress={() => void onSend()}
					loading={sending}
					disabled={sending || addrLoading}
					softDisabled
					accessibilityLabel={`Send request to ${provFirst}`}
				>
					Send request
				</AppButton>
			</AppFooterBar>

			<AppFamilyMemberSheet
				visible={familyOpen}
				onClose={() => setFamilyOpen(false)}
				members={members}
				selectedKey={patientKey}
				onSelect={(m) => setPatientKey(m.key)}
				title="Who is this visit for?"
				confirmLabel={(m) => `Continue for ${familyMemberFirstName(m)}`}
				onSave={() => {
					// No create-family-member endpoint yet (same as the doctor booking flow).
					showComingSoon('Add family members from your profile for now.')
				}}
			/>

			<AppAddressSheet
				visible={addrOpen}
				onClose={() => setAddrOpen(false)}
				title={`Where should the ${noun} come?`}
				addresses={addresses.map((a) => ({ id: a.id, label: a.label, line: addressLine(a) }))}
				loading={addrLoading}
				error={addrError}
				onRetry={() => void loadAddresses()}
				selectedId={addressId}
				onSelect={setAddressId}
				onSaveNew={saveAddress}
				onUseCurrentLocation={useCurrentLocation}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: APP_COLORS.pageBg },
	flex: { flex: 1, minWidth: 0 },
	scroll: { gap: 8, paddingBottom: 16 },
	bannerWrap: { marginTop: 16, marginHorizontal: 16, marginBottom: 0 },
	providerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
	initials: { fontSize: 16, fontWeight: '800' },
	providerName: { fontSize: 16, lineHeight: 22, fontWeight: '800', color: APP_COLORS.ink },
	muted: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	patientSection: { paddingTop: 4 },
	addrRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		minHeight: 64,
		paddingVertical: 8,
		borderBottomWidth: 1,
		borderBottomColor: APP_COLORS.divider,
	},
	addrTile: {
		width: 48,
		height: 48,
		borderRadius: 12,
		backgroundColor: APP_COLORS.mint,
		alignItems: 'center',
		justifyContent: 'center',
	},
	eyebrow: { fontSize: 12, lineHeight: 16, fontWeight: '700', letterSpacing: 0.5, color: APP_COLORS.inkMuted },
	addrLine1: { fontSize: 15, lineHeight: 20, fontWeight: '700', color: APP_COLORS.ink },
	addrLine2: { fontSize: 13, lineHeight: 18, color: APP_COLORS.inkMuted },
	addrMissing: { color: APP_COLORS.primary },
})
